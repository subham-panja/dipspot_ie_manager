"""RecruitIn-style X-Ray search query generator, SERP scraper, and multi-channel lead enrichment."""

import logging
import re
import urllib.parse
from typing import Any, Dict, List, Optional

from app.scraper.xray_providers import (
    DEFAULT_DECISION_MAKER_TITLES,
    _normalize_website_base,
    build_bing_xray_query,
    build_genuine_fallbacks,
    build_relaxed_xray_query,
    clean_company_for_xray,
    parse_xray_serp_title_and_snippet,
    query_xray_provider,
)

logger = logging.getLogger(__name__)


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
        tokens.append(ex_clean if ex_clean.startswith("-") else f"-{ex_clean}")

    return " ".join(tokens)


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
        """Executes live X-ray search across DDG, Bing, and Google with genuine zero-mock handling."""
        self.last_xray_engine = ""
        self.last_xray_status = "no_results"

        strict_q = build_xray_query(
            company_name=company_name,
            job_titles=job_titles,
            country=country,
            platform=platform,
            keywords=keywords,
            exclusions=exclusions,
        )

        fetch_func = getattr(self, "fetch_page", None)
        if not fetch_func:
            self.last_xray_engine = "fallback"
            self.last_xray_status = "rate_limited_or_offline"
            return []

        results: List[Dict[str, str]] = []
        winning_engine = ""
        engine_states: Dict[str, tuple] = {}
        any_blocked = False

        strict_plan = [
            ("duckduckgo", strict_q, 3.5),
            ("bing", build_bing_xray_query(strict_q), 5.0),
            ("google", strict_q, 5.0),
        ]

        for prov, q_str, tout in strict_plan:
            if hasattr(self, "log"):
                self.log("HTTP", f"Executing {prov} RecruitIn X-ray search for '{company_name}': {q_str}")
            hits, blocked, status = query_xray_provider(
                fetch_func,
                provider=prov,
                query=q_str,
                platform=platform,
                max_results=max_results,
                timeout=tout,
                polite_jitter=False,
            )
            engine_states[prov] = (blocked, status)
            if blocked:
                any_blocked = True
            if hits:
                results = hits[:max_results]
                winning_engine = prov
                break

        # Relaxed fallback queries ONLY on engines that returned clean 200 without rate-limiting
        clean_co = str(company_name or "").strip()
        if not results and clean_co:
            relaxed_candidates: List[tuple] = []
            bing_blocked, bing_status = engine_states.get("bing", (True, 0))
            if not bing_blocked and bing_status in (200, 202):
                r_bing = build_relaxed_xray_query(clean_co, country=country, platform=platform)
                m_bing = build_relaxed_xray_query(clean_co, country=country, platform=platform, minimal=True)
                relaxed_candidates.append(("bing", r_bing, 5.0))
                if m_bing != r_bing:
                    relaxed_candidates.append(("bing", m_bing, 5.0))

            google_blocked, google_status = engine_states.get("google", (True, 0))
            if not google_blocked and google_status in (200, 202):
                r_google = build_relaxed_xray_query(clean_co, country=country, platform=platform)
                if (platform or "linkedin").lower().strip() == "linkedin":
                    r_google = r_google.replace("site:linkedin.com/in ", "site:linkedin.com/in/ ", 1)
                relaxed_candidates.append(("google", r_google, 5.0))

            bing_hit_block = False
            for prov, r_query, tout in relaxed_candidates:
                if prov == "bing" and bing_hit_block:
                    continue
                if hasattr(self, "log"):
                    self.log("HTTP", f"Executing relaxed {prov} X-ray query for '{clean_co}': {r_query}")
                hits, blocked, _status = query_xray_provider(
                    fetch_func,
                    provider=prov,
                    query=r_query,
                    platform=platform,
                    max_results=max_results,
                    timeout=tout,
                    polite_jitter=False,
                )
                if blocked:
                    any_blocked = True
                    if prov == "bing":
                        bing_hit_block = True
                if hits:
                    results = hits[:max_results]
                    winning_engine = prov
                    break

        if results:
            self.last_xray_engine = winning_engine
            self.last_xray_status = "live_results"
        else:
            self.last_xray_engine = "fallback"
            self.last_xray_status = "rate_limited_or_offline" if any_blocked else "no_results"

        if hasattr(self, "log"):
            self.log(
                "PARSE",
                f"Discovered {len(results)} X-ray persona profiles for '{company_name}' (engine={self.last_xray_engine}, status={self.last_xray_status})",
            )

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

        raw_emails = enriched.get("emails")
        if isinstance(raw_emails, list):
            email_list = [str(e).strip() for e in raw_emails if e and "@" in str(e)]
        elif raw_emails:
            email_list = [e.strip() for e in re.split(r"[;,]", str(raw_emails)) if e.strip() and "@" in e]
        else:
            email_list = []
        enriched["primary_email"] = (enriched.get("primary_email") or "").strip() or (email_list[0] if email_list else "")
        enriched["secondary_email"] = (enriched.get("secondary_email") or "").strip() or (email_list[1] if len(email_list) > 1 else "")

        raw_phones = enriched.get("phones")
        if isinstance(raw_phones, list):
            phone_list = [str(p).strip() for p in raw_phones if p and str(p).strip()]
        elif raw_phones:
            phone_list = [p.strip() for p in re.split(r"[;,]", str(raw_phones)) if p.strip()]
        else:
            phone_list = []
        enriched["direct_phone"] = (enriched.get("direct_phone") or "").strip() or (phone_list[0] if phone_list else "")

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

        existing_li = (enriched.get("linkedin_persona_url") or enriched.get("linkedin_search_url") or "").strip()
        if "/in/" in existing_li:
            enriched["linkedin_persona_url"] = existing_li
            enriched["linkedin_search_url"] = existing_li
        else:
            profiles: List[Dict[str, str]] = []
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
                clean_co_search = clean_company_for_xray(co_name) or co_name
                target_term = f"{clean_co_search} Purchase Manager".strip()
                fallback_search = f"https://www.linkedin.com/search/results/people/?keywords={urllib.parse.quote_plus(target_term)}"
                enriched["linkedin_persona_url"] = fallback_search
                enriched["linkedin_search_url"] = fallback_search

        corp_url = (enriched.get("corporate_contact_page_url") or "").strip()
        if corp_url and not _normalize_website_base(corp_url):
            corp_url = ""
        website = (enriched.get("website") or "").strip()
        if not corp_url and website:
            base_w = _normalize_website_base(website)
            corp_url = f"{base_w}/contact" if base_w else ""
        enriched["corporate_contact_page_url"] = corp_url
        enriched["address"] = (enriched.get("address") or "").strip()
        enriched["contact_person"] = (enriched.get("contact_person") or "").strip()

        return enriched
