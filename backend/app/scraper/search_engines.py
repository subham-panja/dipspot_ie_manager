"""Search engine clients (DuckDuckGo, Bing, Nominatim)."""

import logging
import random
import re
import time
import urllib.parse
from typing import Dict, List, Optional
import requests
from bs4 import BeautifulSoup
from app.scraper.filters import is_blacklisted_domain, COMMODITY_KEYWORDS_MAP, is_domain_live
from app.scraper.entity_verifier import is_trade_business_entity
from app.lead_engine import clean_company_name
from app.verifier import extract_domain
from app.scraper.http_client import decode_bing_u, _get_random_headers

logger = logging.getLogger(__name__)


class SearchEnginesMixin:
    def live_search_web(
        self,
        query: str,
        max_results: int = 15,
        commodity: str = "",
        lead_type: str = "importer",
    ) -> List[Dict[str, str]]:
        """Queries live public web search engines (DuckDuckGo HTML + Bing fallback) and parses verified trade company candidates."""
        # Infer commodity from query if not explicitly passed
        if not commodity:
            q_low = query.lower()
            for c_key in COMMODITY_KEYWORDS_MAP:
                if c_key in q_low:
                    commodity = c_key
                    break

        search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote_plus(query)}"
        self.log("HTTP", f"Dispatching live search query: '{query}'", url=search_url)

        html, status, latency = self.fetch_page(search_url, timeout=7.0, polite_jitter=True)
        self.log("HTTP", f"[HTTP {status}] DDG search completed in {latency:.2f}s", url=search_url, latency=latency)

        results = []
        if html and status in (200, 202):
            soup = BeautifulSoup(html, "lxml")
            for result_div in soup.find_all("div", class_=re.compile(r"result\b")):
                a_tag = result_div.find("a", class_="result__url") or result_div.find("a", class_="result__snippet") or result_div.find("a", href=True)
                title_tag = result_div.find("a", class_="result__title") or result_div.find("h2") or a_tag
                snippet_tag = result_div.find("a", class_="result__snippet") or result_div.find("div", class_="result__snippet")

                if not a_tag or not a_tag.get("href"):
                    continue

                raw_href = a_tag["href"]
                # Extract actual target url from DDG redirect if present
                if "uddg=" in raw_href:
                    match = re.search(r"uddg=([^&]+)", raw_href)
                    if match:
                        raw_href = urllib.parse.unquote(match.group(1))

                if not raw_href.startswith("http"):
                    continue

                domain = extract_domain(raw_href)
                # Discard blacklisted aggregators and institutions
                if is_blacklisted_domain(domain):
                    continue

                # Verify domain resolves DNS before accepting candidate
                if not is_domain_live(domain):
                    continue

                title = title_tag.get_text(" ", strip=True) if title_tag else domain
                snippet = snippet_tag.get_text(" ", strip=True) if snippet_tag else ""
                clean_name = clean_company_name(title)

                if len(clean_name) > 3:
                    is_valid, reason = is_trade_business_entity(clean_name, snippet, raw_href, commodity, lead_type)
                    if not is_valid:
                        self.log("DISCARD", f"Discarded non-trade search result '{clean_name}': {reason}", url=raw_href)
                        continue

                    results.append({
                        "name": clean_name[:85],
                        "url": raw_href,
                        "domain": domain,
                        "snippet": snippet[:250],
                    })
                if len(results) >= max_results:
                    break

        # Multi-engine fallback: if DDG returned 0 results or gave bot challenge, execute Bing search
        if not results:
            bing_url = f"https://www.bing.com/search?q={urllib.parse.quote_plus(query)}"
            self.log("HTTP", f"DuckDuckGo yielded 0 results; executing Bing fallback search", url=bing_url)
            b_html, b_status, b_lat = self.fetch_page(bing_url, timeout=7.0, polite_jitter=True)
            self.log("HTTP", f"[HTTP {b_status}] Bing search completed in {b_lat:.2f}s", url=bing_url, latency=b_lat)

            if b_html and b_status == 200:
                b_soup = BeautifulSoup(b_html, "lxml")
                for li in b_soup.select("li.b_algo"):
                    a_el = li.select_one("h2 a")
                    if not a_el:
                        continue
                    raw_href = a_el.get("href", "")
                    target_url = raw_href
                    m = re.search(r"[?&]u=([^&]+)", raw_href)
                    if m:
                        dec = decode_bing_u(m.group(1))
                        if dec.startswith("http"):
                            target_url = dec

                    if not target_url.startswith("http"):
                        continue

                    domain = extract_domain(target_url)
                    if is_blacklisted_domain(domain):
                        continue
                    if not is_domain_live(domain):
                        continue

                    b_title = a_el.get_text(" ", strip=True)
                    clean_name = clean_company_name(b_title)
                    snip_el = li.select_one(".b_caption p, .b_snippet")
                    b_snip = snip_el.get_text(" ", strip=True) if snip_el else ""

                    if len(clean_name) > 3:
                        is_valid, reason = is_trade_business_entity(clean_name, b_snip, target_url, commodity, lead_type)
                        if not is_valid:
                            self.log("DISCARD", f"Discarded non-trade Bing result '{clean_name}': {reason}", url=target_url)
                            continue

                        results.append({
                            "name": clean_name[:85],
                            "url": target_url,
                            "domain": domain,
                            "snippet": b_snip[:250],
                        })
                    if len(results) >= max_results:
                        break

        self.log("PARSE", f"Discovered {len(results)} verified trade company candidates from search", url=search_url)
        return results

    def live_search_nominatim(
        self,
        query: str,
        country_code: str = "",
        limit: int = 8,
        commodity: str = "",
        lead_type: str = "importer",
    ) -> List[Dict[str, any]]:
        """Queries OpenStreetMap Nominatim for real registered facilities, mills, or wholesale companies."""
        url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote_plus(query)}&format=json&limit={limit}"
        if country_code:
            url += f"&countrycodes={country_code.lower()}"

        headers = {"User-Agent": "DipspotTradeEngine/2.0 (Industrial Lead Harvester; mailto:contact@dipspot.trade)"}
        req_start = time.time()
        try:
            resp = requests.get(url, headers=headers, timeout=5.0)
            latency = time.time() - req_start
            self.log("HTTP", f"[HTTP {resp.status_code}] Nominatim POI search in {latency:.2f}s", url=url, latency=latency)
            if resp.status_code == 200:
                data = resp.json()
                results = []
                for item in data:
                    name = item.get("name") or item.get("display_name", "").split(",")[0]
                    disp = item.get("display_name", "")
                    if name and len(name) > 3:
                        is_valid, reason = is_trade_business_entity(name, disp, "", commodity, lead_type)
                        if not is_valid:
                            continue
                        results.append({
                            "name": name[:85],
                            "display_name": disp,
                            "lat": float(item.get("lat", 0)),
                            "lon": float(item.get("lon", 0)),
                            "type": item.get("type", "industrial"),
                        })
                return results
        except Exception as e:
            self.log("WARN", f"Nominatim lookup timed out: {e}")
        return []

