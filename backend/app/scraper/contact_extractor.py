"""Contact extraction from corporate DOM pages."""

import logging
import re
import socket
import urllib.parse
from typing import Dict, List, Optional
from bs4 import BeautifulSoup
from app.lead_engine import COUNTRY_TO_ISO2, clean_company_name, normalize_deobfuscated_emails, normalize_phones
from app.scraper.filters import filter_live_emails, is_blacklisted_domain, is_domain_live
from app.verifier import extract_domain

logger = logging.getLogger(__name__)


class ContactExtractorMixin:
    def crawl_contact_details(self, domain_url: str, target_country: str = "") -> Dict[str, any]:
        """Visits company website /contact or /about page to extract verified email, phone contacts, and legal corporate name."""
        parsed = urllib.parse.urlparse(domain_url)
        base = f"{parsed.scheme or 'https'}://{parsed.netloc}"
        if not parsed.netloc:
            base = f"https://{domain_url}"

        contact_urls = [
            f"{base}/contact",
            f"{base}/contact-us",
            f"{base}/about-us",
            f"{base}/",
        ]

        emails_found = []
        phones_found = []
        address_snippet = ""
        contact_person = ""
        legal_name = ""
        twitter_url = ""
        linkedin_company_url = ""
        facebook_url = ""
        instagram_url = ""

        region_hint = "IN"
        if target_country:
            region_hint = COUNTRY_TO_ISO2.get(target_country.lower().strip(), "IN")

        # Check at most 2 contact pages to be polite and fast
        for c_url in contact_urls[:2]:
            html, status, latency = self.fetch_page(c_url, timeout=4.0, polite_jitter=True)
            if not html or status != 200:
                continue

            self.log("HTTP", f"[HTTP {status}] Inspected contact DOM in {latency:.2f}s", url=c_url, latency=latency)
            c_soup = BeautifulSoup(html, "lxml")

            # 1. Extract legal organization name from og:site_name, application-name, or JSON-LD
            if not legal_name:
                meta_site = c_soup.find("meta", property="og:site_name") or c_soup.find("meta", attrs={"name": "application-name"})
                if meta_site and meta_site.get("content"):
                    c_cand = clean_company_name(meta_site.get("content", ""))
                    if c_cand and len(c_cand) >= 3:
                        legal_name = c_cand

            if not legal_name:
                for s_tag in c_soup.find_all("script", type="application/ld+json"):
                    if not s_tag.string:
                        continue
                    try:
                        import json
                        ld_data = json.loads(s_tag.string)
                        items = []
                        if isinstance(ld_data, dict):
                            if "@graph" in ld_data and isinstance(ld_data["@graph"], list):
                                items.extend(ld_data["@graph"])
                            else:
                                items.append(ld_data)
                        elif isinstance(ld_data, list):
                            items.extend(ld_data)

                        for it in items:
                            if not isinstance(it, dict):
                                continue
                            t_val = it.get("@type", "")
                            if t_val in ("Organization", "Corporation", "LocalBusiness", "WholesaleStore", "FoodEstablishment", "Store", "Company"):
                                cand_n = it.get("legalName") or it.get("name")
                                if cand_n and isinstance(cand_n, str):
                                    c_cand = clean_company_name(cand_n)
                                    if c_cand and len(c_cand) >= 3:
                                        legal_name = c_cand
                                        break
                        if legal_name:
                            break
                    except Exception:
                        pass

            # 2. Extract from Schema Microdata (itemprop="legalName" or itemprop="name")
            if not legal_name:
                for el in c_soup.select('[itemtype*="Organization"] [itemprop="legalName"], [itemtype*="Organization"] [itemprop="name"]'):
                    c_cand = clean_company_name(el.get_text(" ", strip=True))
                    if c_cand and len(c_cand) >= 3:
                        legal_name = c_cand
                        break

            # 3. Extract from Header Logo alt or navbar brand
            if not legal_name:
                for img in c_soup.select('img[class*="logo"], img[id*="logo"], header img, nav img, .navbar-brand img'):
                    alt_txt = img.get("alt", "").strip()
                    if alt_txt:
                        c_cand = clean_company_name(alt_txt)
                        if c_cand and len(c_cand) >= 3 and any(w in c_cand.lower() for w in ("ltd", "llc", "pvt", "corp", "inc", "agro", "mill", "trading", "foods", "rice", "sarl")):
                            legal_name = c_cand
                            break

            raw_text = c_soup.get_text(" ", strip=True)

            # 4. Extract from Footer Copyright regex
            if not legal_name:
                c_match = re.search(
                    r"(?:©|&copy;|Copyright|\(c\))\s*(?:\d{4}(?:-\d{2,4})?)?\s*([^\n\r\|•·;]{3,60}?\b(?:Pvt\.?|Ltd\.?|Limited|LLC|Corporation|Corp\.?|Inc\.?|SARL|GmbH|Co\.?|Industries|Enterprises|Trading|Mills|Foods|Exports|Imports|Grains)\b)",
                    raw_text,
                    re.I | re.UNICODE,
                )
                if c_match:
                    c_cand = clean_company_name(c_match.group(1))
                    if c_cand and len(c_cand) >= 3:
                        legal_name = c_cand

            # Parse mailto: links directly
            for mail_a in c_soup.select("a[href^='mailto:']"):
                m_href = mail_a["href"].replace("mailto:", "").split("?")[0].strip()
                if "@" in m_href and not is_blacklisted_domain(m_href.split("@")[1]):
                    emails_found.append(m_href)

            # Parse tel: links directly
            for tel_a in c_soup.select("a[href^='tel:']"):
                t_href = tel_a["href"].replace("tel:", "").strip()
                if len(t_href) >= 7:
                    phones_found.append(t_href)

            # Social Profile OSINT Extraction (inspired by theHarvester & Apify)
            for a_tag in c_soup.find_all("a", href=True):
                href = a_tag["href"].strip()
                if not href:
                    continue
                # Twitter / X
                if not twitter_url:
                    tw_m = re.search(r"https?://(?:www\.)?(?:twitter\.com|x\.com)/([A-Za-z0-9_]{1,30})/?(?:$|[?#])", href, re.I)
                    if tw_m and tw_m.group(1).lower() not in {"intent", "share", "widgets", "search", "home", "i", "privacy", "tos", "about"}:
                        twitter_url = f"https://x.com/{tw_m.group(1)}"
                # LinkedIn
                if not linkedin_company_url:
                    li_m = re.search(r"https?://(?:[a-z]{2,3}\.)?linkedin\.com/(?:company|in)/([A-Za-z0-9_\-\.%]+)/?(?:$|[?#])", href, re.I)
                    if li_m and li_m.group(1).lower() not in {"share", "sharing", "help"}:
                        linkedin_company_url = href.split("?")[0].rstrip("/")
                # Facebook
                if not facebook_url:
                    fb_m = re.search(r"https?://(?:www\.)?facebook\.com/([A-Za-z0-9_\-\.%]+)/?(?:$|[?#])", href, re.I)
                    if fb_m and fb_m.group(1).lower() not in {"sharer", "share.php", "plugins", "dialog", "privacy", "policies", "help"}:
                        facebook_url = f"https://www.facebook.com/{fb_m.group(1)}"
                # Instagram
                if not instagram_url:
                    ig_m = re.search(r"https?://(?:www\.)?instagram\.com/([A-Za-z0-9_\-\.%]+)/?(?:$|[?#])", href, re.I)
                    if ig_m and ig_m.group(1).lower() not in {"p", "explore", "about", "developer", "terms", "privacy"}:
                        instagram_url = f"https://www.instagram.com/{ig_m.group(1)}"

            em = normalize_deobfuscated_emails(raw_text)
            if em:
                verified_em = filter_live_emails(em)
                if verified_em:
                    emails_found.extend([e.strip() for e in verified_em.split(";") if e.strip()])

            ph = normalize_phones(raw_text, region_hint=region_hint)
            if ph:
                phones_found.extend(ph)

            addr_match = re.search(r"(?:Address|Location|Headquarters|Office):\s*([^|\n\r]{10,120})", raw_text, re.I)
            if addr_match and not address_snippet:
                address_snippet = addr_match.group(1).strip()

            person_match = re.search(
                r"(?:Contact Person|Managing Director|Director|Contact Name|Purchase Manager|Owner):\s*([^:\n\r\|•·;]{2,35}?)(?=\s*(?:Office|Address|Location|Phone|Tel|Email|Headquarters)\s*:|\n|$|[\|•·;])",
                raw_text,
                re.I,
            )
            if person_match and not contact_person:
                contact_person = person_match.group(1).strip()

            if emails_found and phones_found and legal_name:
                break

        return {
            "emails": list(dict.fromkeys(emails_found)),
            "phones": list(dict.fromkeys(phones_found)),
            "address": address_snippet,
            "contact_person": contact_person or "Commercial Trade Desk",
            "legal_name": legal_name,
            "twitter_url": twitter_url,
            "linkedin_company_url": linkedin_company_url,
            "facebook_url": facebook_url,
            "instagram_url": instagram_url,
        }

