"""Lead similarity scoring and deduplication algorithms."""

import re
from typing import Dict, List, Optional, Tuple
from rapidfuzz import fuzz
from app.lead_cleaning import clean_company_key

SHARED_PLATFORM_AND_DIRECTORY_DOMAINS = {
    "indiamart.com", "go4worldbusiness.com", "tradeindia.com", "exportersindia.com",
    "maps.google.com", "google.com", "kompass.com", "europages.com", "europages.co.uk",
    "apeda.gov.in", "atninfo.com", "exportmandi.com", "tradekey.com", "volza.com",
    "panjiva.com", "trademo.com", "importgenius.com", "hidubai.com", "yellowpages.com",
    "justdial.com", "alibaba.com", "aliexpress.com", "ec21.com", "made-in-china.com",
    "globalsources.com", "openstreetmap.org", "wikipedia.org", "facebook.com",
    "linkedin.com", "instagram.com", "twitter.com", "x.com", "youtube.com", "github.com",
}


def is_duplicate(
    new_key: str, new_domain: str,
    existing_key: str, existing_domain: str,
    threshold: int = 91,
) -> bool:
    if new_domain and existing_domain and new_domain == existing_domain:
        return True
    return fuzz.token_sort_ratio(new_key, existing_key) >= threshold


def calculate_lead_similarity(
    candidate: Dict[str, any],
    existing: Dict[str, any],
) -> Tuple[float, str, List[str]]:
    """
    Computes multi-factor ML/NLP similarity score (0.0% to 100.0%) between candidate and existing lead.
    Returns (score, match_reason, matching_fields).
    """
    matching_fields: List[str] = []

    # 1. Tax ID Match (GSTIN / PAN / IEC)
    cand_gstin = (candidate.get("gstin") or "").strip().upper()
    exist_gstin = (existing.get("gstin") or "").strip().upper()
    if cand_gstin and exist_gstin and cand_gstin == exist_gstin:
        matching_fields.append("gstin")
        return (99.8, "Exact Tax ID (GSTIN) match", matching_fields)

    cand_pan = (candidate.get("pan") or "").strip().upper()
    exist_pan = (existing.get("pan") or "").strip().upper()
    if cand_pan and exist_pan and cand_pan == exist_pan:
        matching_fields.append("pan")
        return (99.5, "Exact Tax ID (PAN) match", matching_fields)

    # 2. Web Domain Match
    def clean_dom(u: str) -> str:
        return (u or "").lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0].strip()

    def clean_url_path(u: str) -> str:
        raw = (u or "").lower().replace("https://", "").replace("http://", "").replace("www.", "").strip()
        return raw.rstrip("/")

    c_dom = clean_dom(candidate.get("website") or "")
    e_dom = clean_dom(existing.get("website") or "")
    if c_dom and e_dom and c_dom == e_dom:
        if c_dom in SHARED_PLATFORM_AND_DIRECTORY_DOMAINS:
            # Different company listings on a shared B2B directory or map service must not be merged.
            # Only match if the canonical listing URL path is identical AND company names align.
            c_path = clean_url_path(candidate.get("website") or "")
            e_path = clean_url_path(existing.get("website") or "")
            if c_path and e_path and c_path == e_path:
                c_k = clean_company_key(candidate.get("company_name", ""))
                e_k = clean_company_key(existing.get("company_name", ""))
                sort_ratio = fuzz.token_sort_ratio(c_k, e_k) if (c_k and e_k) else 0
                if sort_ratio >= 65:
                    matching_fields.append("website")
                    return (98.5, f"Exact Directory Listing match ({c_path})", matching_fields)
        else:
            # Private corporate domain match (e.g. krbl.com == krbl.com)
            # Must verify that company names are consistent, preventing two completely distinct entities
            # that happen to share a holding or group domain from being collapsed.
            c_k = clean_company_key(candidate.get("company_name", ""))
            e_k = clean_company_key(existing.get("company_name", ""))
            sort_ratio = fuzz.token_sort_ratio(c_k, e_k) if (c_k and e_k) else 0

            set_ratio = fuzz.token_set_ratio(c_k, e_k) if (c_k and e_k) else 0
            w1 = set(re.findall(r"[a-z0-9]+", c_k.lower()))
            w2 = set(re.findall(r"[a-z0-9]+", e_k.lower()))
            common_words = w1 & w2

            if not c_k or not e_k or common_words or sort_ratio >= 40 or set_ratio >= 60:
                matching_fields.append("website")
                return (98.5, f"Exact Web Domain match ({c_dom})", matching_fields)
            return (70.0, f"Shared domain ({c_dom}) across distinct entities", matching_fields)

    # 3. Phone Match (normalized digits)
    c_phones = re.sub(r"\D", "", candidate.get("phones") or "")
    e_phones = re.sub(r"\D", "", existing.get("phones") or "")
    if len(c_phones) >= 8 and len(e_phones) >= 8 and c_phones[-10:] == e_phones[-10:]:
        matching_fields.append("phones")
        c_k = clean_company_key(candidate.get("company_name", ""))
        e_k = clean_company_key(existing.get("company_name", ""))
        sort_ratio = fuzz.token_sort_ratio(c_k, e_k) if (c_k and e_k) else 0
        if sort_ratio >= 45:
            return (96.5, "Exact Phone match with consistent corporate identity", matching_fields)
        return (72.0, "Shared contact phone across distinct commercial entities", matching_fields)

    # 4. Multi-Factor NLP Company Name Similarity (RapidFuzz token_sort_ratio & token_set_ratio)
    c_name = candidate.get("company_name", "").strip()
    e_name = existing.get("company_name", "").strip()
    c_key = clean_company_key(c_name)
    e_key = clean_company_key(e_name)

    if c_key and e_key and c_key == e_key:
        matching_fields.append("company_name")
        return (99.0, "Exact Normalized Company Name match", matching_fields)

    if c_key and e_key:
        sort_ratio = fuzz.token_sort_ratio(c_key, e_key)
        set_ratio = fuzz.token_set_ratio(c_key, e_key)
        full_ratio = fuzz.ratio(c_key, e_key)

        # Weighted composite score emphasizing complete token order and distinct proper names
        name_score = round(0.65 * sort_ratio + 0.25 * full_ratio + 0.10 * set_ratio, 1)

        # Verify differing tokens: if distinct proper words differ substantially (< 75% similarity), they are separate entities
        w1 = set(c_key.split())
        w2 = set(e_key.split())
        d1 = w1 - w2
        d2 = w2 - w1
        if d1 and d2:
            max_diff_sim = max(fuzz.ratio(x, y) for x in d1 for y in d2)
            if max_diff_sim < 85.0:
                name_score = min(75.0, name_score)

        c_country = (candidate.get("country") or "").strip().lower()
        e_country = (existing.get("country") or "").strip().lower()

        # If in the same country, verify high-confidence match
        if c_country and e_country and c_country == e_country:
            matching_fields.append("country")
            if name_score >= 95.0:
                matching_fields.append("company_name")
                return (name_score, f"Company Name NLP match ({name_score}%) in same country", matching_fields)

        if name_score >= 95.0:
            matching_fields.append("company_name")
            return (name_score, f"High-confidence Company Name NLP match ({name_score}%)", matching_fields)

        return (name_score, "Sub-threshold similarity", matching_fields)

    return (0.0, "No similarity detected", [])


