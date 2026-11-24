"""RecruitIn-style X-Ray search query generator, SERP scraper, and multi-channel lead enrichment."""

import logging
import re
import urllib.parse
from typing import Any, Dict, List, Optional
from bs4 import BeautifulSoup

from app.lead_engine import clean_company_name
from app.scraper.http_client import decode_bing_u

logger = logging.getLogger(__name__)

DEFAULT_DECISION_MAKER_TITLES: List[str] = [
    "Procurement Director",
    "Import Manager",
    "Purchasing Head",
    "Purchase Manager",
    "Head of Sourcing",
    "Chief Executive Officer",
    "CEO",
    "Managing Director",
    "Commercial Director",
    "Buyer",
]


def build_xray_query(
    company_name: str,
    job_titles: Optional[List[str]] = None,
    country: str = "",
    platform: str = "linkedin",
    keywords: Optional[List[str]] = None,
    exclusions: Optional[List[str]] = None,
) -> str:
    """Constructs targeted Boolean search queries for professional profiles without bot blocks."""
    plat = (platform or "linkedin").lower().strip()
    if plat == "linkedin":
        site_prefix = "site:linkedin.com/in/"
        default_exclusions = ["-intitle:profiles", "-inurl:dir/", "-inurl:jobs"]
    elif plat == "github":
        site_prefix = "site:github.com"
        default_exclusions = ["-inurl:topics"]
    elif plat in ("twitter", "x"):
        site_prefix = "(site:twitter.com OR site:x.com)"
        default_exclusions = ["-inurl:status"]
    else:
        site_prefix = plat if plat.startswith("site:") else f"site:{plat}"
        default_exclusions = []

    raw_titles = [str(t).strip() for t in (job_titles or []) if t and str(t).strip()]
    titles = raw_titles if raw_titles else DEFAULT_DECISION_MAKER_TITLES

    quoted_titles: List[str] = []
    for t in titles:
        if not t:
            continue
        t_clean = str(t).strip()
        if not t_clean:
            continue
        if " " in t_clean and not (t_clean.startswith('"') and t_clean.endswith('"')):
            quoted_titles.append(f'"{t_clean}"')
        else:
            quoted_titles.append(t_clean)

    tokens: List[str] = [site_prefix]

    if quoted_titles:
        tokens.append(f"({' OR '.join(quoted_titles)})")

    if company_name:
        clean_co = str(company_name).strip(' "\'')
        if clean_co:
            tokens.append(f'"{clean_co}"')

    if country:
        clean_ctry = str(country).strip(' "\'')
        if clean_ctry:
            tokens.append(f'"{clean_ctry}"')

    if keywords:
        for kw in keywords:
            if not kw:
                continue
            kw_clean = str(kw).strip()
            if not kw_clean:
                continue
            if " " in kw_clean and not (kw_clean.startswith('"') and kw_clean.endswith('"')):
                tokens.append(f'"{kw_clean}"')
            else:
                tokens.append(kw_clean)

    eff_exclusions = exclusions if exclusions is not None else default_exclusions
    for ex in eff_exclusions:
        if not ex:
            continue
        ex_clean = str(ex).strip()
        if not ex_clean:
            continue
        if not ex_clean.startswith("-"):
            tokens.append(f"-{ex_clean}")
        else:
            tokens.append(ex_clean)

    return " ".join(tokens)


def parse_xray_serp_title_and_snippet(
    title: str,
    snippet: str,
    url: str,
    platform: str = "linkedin",
) -> Optional[Dict[str, str]]:
    """Extracts canonical profile URL, person name, job title, and company from search engine result."""
    if not url:
        return None

    plat = (platform or "linkedin").lower().strip()
    canonical_url = ""

    if plat == "linkedin":
        m_li = re.search(r"https?://(?:[a-z]{2,3}\.)?linkedin\.com/in/([a-zA-Z0-9\-_%]+)", url)
        if not m_li:
            return None
        slug = m_li.group(1).split("?")[0].strip("/")
        if not slug or slug.lower() in ("dir", "jobs", "company", "pulse", "posts"):
            return None
        canonical_url = f"https://www.linkedin.com/in/{slug}"
    elif plat == "github":
        m_gh = re.search(r"https?://github\.com/([a-zA-Z0-9\-_]+)", url)
        if not m_gh:
            return None
        slug = m_gh.group(1).split("?")[0].strip("/")
        if not slug or slug.lower() in ("orgs", "topics", "search", "features", "marketplace", "trending", "settings", "login", "about"):
            return None
        canonical_url = f"https://github.com/{slug}"
    elif plat in ("twitter", "x"):
        m_tw = re.search(r"https?://(?:twitter|x)\.com/([a-zA-Z0-9_]+)", url)
        if not m_tw:
            return None
        slug = m_tw.group(1).split("?")[0].strip("/")
        if not slug or slug.lower() in ("home", "explore", "search", "intent", "hashtag", "settings", "i"):
            return None
        canonical_url = f"https://x.com/{slug}"
    else:
        canonical_url = url.split("?")[0]

    # Clean SERP title by stripping platform branding suffix (supports -, –, —, /, ·, •, |, and Twitter/X branding)
    clean_title = re.sub(
        r"(?:\s+[-–—/·•]\s*|\s*[|·•]\s*|\s+on\s+)(?:\b(?:LinkedIn|GitHub|Twitter|X|Platform)\b).*$",
        "",
        title or "",
        flags=re.IGNORECASE,
    ).strip()

    # Split title using surrounded delimiters (requiring whitespace around hyphens/slashes to preserve names like Al-Mansoor or Apex A/S)
    segments = [s.strip() for s in re.split(r"\s+[-–—/]\s+|\s*[|·•]\s*", clean_title) if s.strip()]

    name, role, company = "", "", ""
    if len(segments) >= 3:
        name = segments[0]
        role = segments[1]
        company = segments[2]
    elif len(segments) == 2:
        name = segments[0]
        role = segments[1]
    elif len(segments) == 1:
        name = segments[0]
    else:
        name = clean_title

    # Extract embedded "at <Company>" if role contains it
    if " at " in role.lower():
        r_parts = re.split(r"\s+at\s+", role, flags=re.IGNORECASE, maxsplit=1)
        if len(r_parts) == 2:
            role = r_parts[0].strip()
            if not company or any(c in company.lower() for c in ["united arab", "dubai", "india", "saudi", "singapore", "qatar"]):
                company = r_parts[1].strip()

    # Extract embedded "at <Company>" from name if role is empty
    if not role and " at " in name.lower():
        n_parts = re.split(r"\s+at\s+", name, flags=re.IGNORECASE, maxsplit=1)
        if len(n_parts) == 2:
            name = n_parts[0].strip()
            if not company:
                company = n_parts[1].strip()

    name = re.sub(r"\s*\([^)]*\)", "", name).strip()
    name = re.sub(r"^(?:Profile\s*:\s*|View\s+)", "", name, flags=re.IGNORECASE).strip()

    # Fallback to snippet inspection if role or company missing
    if snippet and (not role or not company):
        for d_title in DEFAULT_DECISION_MAKER_TITLES:
            if not role and d_title.lower() in snippet.lower():
                role = d_title
            m_snip = re.search(
                re.escape(d_title) + r"\s+at\s+([A-Za-z0-9\s.,&'\-]+?)(?:\.|\,|\;|\bExperience|\bLocation|\bEducation|\bView|$)",
                snippet,
                flags=re.IGNORECASE,
            )
            if m_snip:
                if not role:
                    role = d_title
                if not company:
                    company = m_snip.group(1).strip()
                break

    if not name or len(name) < 2:
        return None

    return {
        "name": name[:90],
        "title": role[:90],
        "company": company[:90],
        "profile_url": canonical_url,
        "platform": plat,
        "snippet": (snippet or "")[:250],
    }


class XRaySearchMixin:
    """Mixin providing RecruitIn-style search and multi-channel lead enrichment."""

    def search_xray_profiles(
        self,
        company_name: str,
        country: str = "",
        job_titles: Optional[List[str]] = None,
        platform: str = "linkedin",
        max_results: int = 5,
        keywords: Optional[List[str]] = None,
        exclusions: Optional[List[str]] = None,
    ) -> List[Dict[str, str]]:
        """Executes targeted X-ray search across DuckDuckGo HTML and Bing without bot blocks."""
        query = build_xray_query(
            company_name=company_name,
            job_titles=job_titles,
            country=country,
            platform=platform,
            keywords=keywords,
            exclusions=exclusions,
        )

        results: List[Dict[str, str]] = []
        seen_urls = set()

        search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote_plus(query)}"
        if hasattr(self, "log"):
            self.log("HTTP", f"Executing RecruitIn X-ray search for '{company_name}': {query}", url=search_url)

        fetch_func = getattr(self, "fetch_page", None)
        if not fetch_func:
            return results

        html, status, latency = fetch_func(search_url, timeout=7.0, polite_jitter=True)
        if html and status in (200, 202):
            soup = BeautifulSoup(html, "lxml")
            for result_div in soup.find_all("div", class_=re.compile(r"result\b")):
                a_tag = result_div.find("a", class_="result__url") or result_div.find("a", class_="result__snippet") or result_div.find("a", href=True)
                title_tag = result_div.find("a", class_="result__title") or result_div.find("h2") or a_tag
                snippet_tag = result_div.find("a", class_="result__snippet") or result_div.find("div", class_="result__snippet")

                if not a_tag or not a_tag.get("href"):
                    continue

                raw_href = a_tag["href"]
                if "uddg=" in raw_href:
                    m = re.search(r"uddg=([^&]+)", raw_href)
                    if m:
                        raw_href = urllib.parse.unquote(m.group(1))

                title_text = title_tag.get_text(" ", strip=True) if title_tag else ""
                snip_text = snippet_tag.get_text(" ", strip=True) if snippet_tag else ""

                parsed = parse_xray_serp_title_and_snippet(title_text, snip_text, raw_href, platform=platform)
                if parsed and parsed["profile_url"] not in seen_urls:
                    seen_urls.add(parsed["profile_url"])
                    results.append(parsed)
                    if len(results) >= max_results:
                        break

        # Bing fallback if DDG returned 0 profiles
        if not results:
            bing_url = f"https://www.bing.com/search?q={urllib.parse.quote_plus(query)}"
            if hasattr(self, "log"):
                self.log("HTTP", f"DuckDuckGo X-ray returned 0 results; executing Bing fallback", url=bing_url)

            b_html, b_status, b_lat = fetch_func(bing_url, timeout=7.0, polite_jitter=True)
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

                    b_title = a_el.get_text(" ", strip=True)
                    snip_el = li.select_one(".b_caption p, .b_snippet")
                    b_snip = snip_el.get_text(" ", strip=True) if snip_el else ""

                    parsed = parse_xray_serp_title_and_snippet(b_title, b_snip, target_url, platform=platform)
                    if parsed and parsed["profile_url"] not in seen_urls:
                        seen_urls.add(parsed["profile_url"])
                        results.append(parsed)
                        if len(results) >= max_results:
                            break

        if hasattr(self, "log"):
            self.log("PARSE", f"Discovered {len(results)} X-ray persona profiles for '{company_name}'", url=search_url)

        return results

    def enrich_lead_multichannel(
        self,
        lead_data: Dict[str, Any],
        target_country: str = "",
    ) -> Dict[str, Any]:
        """Enriches a lead record with 7 distinct communication sources."""
        enriched = dict(lead_data or {})
        co_name = (enriched.get("company_name") or "").strip()
        country = (target_country or "").strip() or (enriched.get("country") or "").strip()

        # 1 & 2: Primary & Secondary Emails
        raw_emails = enriched.get("emails")
        if isinstance(raw_emails, list):
            email_list = [str(e).strip() for e in raw_emails if e and "@" in str(e)]
        elif raw_emails:
            email_list = [e.strip() for e in re.split(r"[;,]", str(raw_emails)) if e.strip() and "@" in e]
        else:
            email_list = []
        enriched["primary_email"] = (enriched.get("primary_email") or "").strip() or (email_list[0] if email_list else "")
        enriched["secondary_email"] = (enriched.get("secondary_email") or "").strip() or (email_list[1] if len(email_list) > 1 else "")

        # 3: Direct Phone
        raw_phones = enriched.get("phones")
        if isinstance(raw_phones, list):
            phone_list = [str(p).strip() for p in raw_phones if p and str(p).strip()]
        elif raw_phones:
            phone_list = [p.strip() for p in re.split(r"[;,]", str(raw_phones)) if p.strip()]
        else:
            phone_list = []
        enriched["direct_phone"] = (enriched.get("direct_phone") or "").strip() or (phone_list[0] if phone_list else "")

        # 4: WhatsApp Outreach Link
        existing_wa = (enriched.get("whatsapp_url") or enriched.get("whatsapp_outreach_url") or "").strip()
        if existing_wa:
            enriched["whatsapp_url"] = existing_wa
            enriched["whatsapp_outreach_url"] = existing_wa
        else:
            phone_val = enriched["direct_phone"] or (str(raw_phones) if raw_phones else "")
            clean_digits = re.sub(r"[^\d]", "", phone_val)
            if clean_digits:
                c_person = (enriched.get("contact_person") or "").split("(")[0].strip() or "Purchase Manager"
                clean_co = co_name.split("(")[0].strip() or "your company"
                wa_msg = urllib.parse.quote_plus(
                    f"Hello {c_person}, we noticed {clean_co} actively imports grains and agricultural merchandise. "
                    f"We are an APEDA-accredited rice mill in West Bengal exporting Non-Basmati Parboiled IR-64 & 1121 Basmati. "
                    f"May we share our current CIF quote and lab inspection specifications?"
                )
                enriched["whatsapp_url"] = f"https://wa.me/{clean_digits}?text={wa_msg}"
                enriched["whatsapp_outreach_url"] = enriched["whatsapp_url"]
            else:
                enriched["whatsapp_url"] = ""
                enriched["whatsapp_outreach_url"] = ""

        # 5: LinkedIn Persona Profile URL (Primary: X-ray discovery, Fallback: 1-click search link)
        existing_li = (enriched.get("linkedin_persona_url") or enriched.get("linkedin_search_url") or "").strip()
        if "/in/" in existing_li:
            enriched["linkedin_persona_url"] = existing_li
            enriched["linkedin_search_url"] = existing_li
        else:
            profiles = []
            if co_name:
                try:
                    profiles = self.search_xray_profiles(company_name=co_name, country=country, platform="linkedin", max_results=2)
                except Exception as exc:
                    if hasattr(self, "log"):
                        self.log("WARN", f"X-ray profile discovery error for '{co_name}': {exc}")

            if profiles:
                best = profiles[0]
                enriched["linkedin_persona_url"] = best["profile_url"]
                enriched["linkedin_search_url"] = best["profile_url"]
                curr_cp = (enriched.get("contact_person") or "").strip()
                if not curr_cp or curr_cp in ("Purchase Manager", "Commercial Trade Desk", "Owner"):
                    title_part = f" ({best['title']})" if best.get("title") else ""
                    enriched["contact_person"] = f"{best['name']}{title_part}"
            else:
                clean_co_search = re.sub(r"\b(?:LLC|W\.L\.L\.|Ltd|SARL|Est\.|Inc\.|FZE|Pte)\b", "", co_name, flags=re.IGNORECASE).strip()
                target_term = f"{clean_co_search} Purchase Manager".strip()
                fallback_search = f"https://www.linkedin.com/search/results/people/?keywords={urllib.parse.quote_plus(target_term)}"
                enriched["linkedin_persona_url"] = fallback_search
                enriched["linkedin_search_url"] = fallback_search

        # 6: Corporate Contact Page URL
        corp_url = (enriched.get("corporate_contact_page_url") or "").strip()
        website = (enriched.get("website") or "").strip()
        if not corp_url and website:
            clean_site = website.rstrip("/")
            corp_url = f"{clean_site}/contact"
        enriched["corporate_contact_page_url"] = corp_url

        # 7: Address
        enriched["address"] = (enriched.get("address") or "").strip()

        # Contact person string hygiene
        enriched["contact_person"] = (enriched.get("contact_person") or "").strip()

        return enriched
