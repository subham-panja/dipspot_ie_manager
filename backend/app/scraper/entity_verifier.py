"""Commercial trade entity and commodity relevance verification."""

import re
from typing import Tuple
from app.verifier import extract_domain
from app.lead_engine import clean_company_name, is_pure_generic_category
from app.scraper.filters import (
    B2B_DIRECTORY_DOMAINS,
    COMMODITY_KEYWORDS_MAP,
    CORPORATE_INDICATORS,
    GENERAL_AGRI_TRADE_TERMS,
    JUNK_DOMAINS,
    JUNK_PATTERNS,
    TRADE_ROLE_TERMS,
    is_blacklisted_domain,
)

def is_trade_business_entity(
    cand_name: str,
    cand_snippet: str = "",
    cand_url: str = "",
    target_commodity: str = "",
    lead_type: str = "importer",
) -> Tuple[bool, str]:
    """
    Strictly verifies whether a scraped entity represents a legitimate commercial enterprise
    engaged in trading, milling, importing, exporting, or wholesale distribution of the target commodity.

    Discards all gaming companies, dictionaries, consumer fast food chains,
    tech articles, repositories, personal blogs, job notifications, and unrelated businesses.
    Enforces 100% strict Buyer vs Supplier separation: Indian mills or exporters are NEVER
    accepted when harvesting international importers/buyers.
    """
    clean_name = clean_company_name(cand_name)
    if not clean_name or len(clean_name) < 3:
        return False, "Entity name empty or generic directory category"

    if is_pure_generic_category(clean_name):
        return False, "Entity name is a pure generic category descriptor or website title"

    # Reject names that look like questions, articles, or consumer headlines
    low_name = clean_name.lower()
    if any(low_name.startswith(p) for p in (
        "how to", "what is", "why ", "where ", "top ", "best ", "21 must", "15 must",
        "order pizza", "order online", "online application", "definition", "meaning of",
        "download ", "play online"
    )):
        return False, "Entity name is an article headline, guide, or tutorial"

    if "?" in clean_name or clean_name.endswith("!"):
        return False, "Entity name contains question or exclamation (article/blog title)"

    # Reject aggregator portal names as standalone leads
    if low_name in {"indiamart", "tradeindia", "go4worldbusiness", "exportersindia", "kompass", "europages", "volza", "panjiva"}:
        return False, "Entity name is directory portal aggregator itself"

    # Reject product specifications, packaging types, and weight attributes masquerading as company names
    PACKAGING_SPEC_PATTERNS = [
        r"\b(?:plastic|jute|gunny|pp|woven)\s*bags?\b",
        r"\b\d+\s*(?:kg|mt|gm)\b",
        r"\b(?:packaging\s*type|for\s*cooking)\b",
        r"\b(?:5kg|10kg|25kg|50kg)\b",
        r"^(?:white|yellow|non-parboiled|parboiled)(?:,\s*packaging|\s*rice)?$",
    ]
    for pat in PACKAGING_SPEC_PATTERNS:
        if re.search(pat, low_name):
            return False, f"Entity name '{clean_name}' is a product specification or packaging attribute, not a business entity"

    # Check domain blacklist (maps.google.com and openstreetmap.org are location coordinates, not company domains)
    cand_domain = extract_domain(cand_url) if cand_url else ""
    if cand_domain and not any(m in cand_domain for m in ("maps.google.com", "openstreetmap.org")):
        if cand_domain in B2B_DIRECTORY_DOMAINS or any(cand_domain.endswith("." + bd) for bd in B2B_DIRECTORY_DOMAINS):
            pass  # Verified B2B directory source
        elif is_blacklisted_domain(cand_domain):
            return False, f"Domain '{cand_domain}' is blacklisted"

    combined_text = f"{clean_name} {cand_snippet} {cand_url}".lower()

    # Check negative junk patterns
    for pat in JUNK_PATTERNS:
        if pat.search(combined_text):
            return False, f"Matched negative non-commercial pattern: {pat.pattern}"

    # STRICT BUYER VS SUPPLIER SEPARATION
    # If lead_type is 'importer' (buyer), NEVER permit Indian exporters / mills or foreign supply facilities
    if lead_type in ("importer", "importers", "buyer", "buyers"):
        exporter_supplier_patterns = [
            r"\b(?:exporters?|suppliers?|manufacturers?|millers?|rice\s+mill)\s+(?:in|from)\s+india\b",
            r"\b(?:indian\s+(?:rice\s+)?(?:exporters?|suppliers?|manufacturers?|millers?))\b",
            r"\b(?:exporters?\s+from\s+india|indian\s+rice\s+exporters?|rice\s+mill\s+in\s+india)\b",
            r"\b(?:leading\s+exporter\s+from\s+india|manufacturer\s+and\s+exporter)\b",
            r"\b(?:punjab\s+rice\s+mill|haryana\s+rice\s+mill|karnal\s+rice\s+mill|burdwan\s+rice\s+mill|hooghly\s+rice\s+mill)\b",
            r"\b(?:rice\s+exporters?\s+in\s+india|basmati\s+rice\s+exporters?|non\s+basmati\s+rice\s+exporters?)\b",
            r"\b(?:we\s+are\s+leading\s+manufacturers?|milling\s+unit\s+in\s+india|processing\s+plant\s+in\s+india)\b",
            r"\b(?:rcmc\s+certified\s+exporter|sfda\s+approved\s+mill|exporting\s+from\s+india)\b",
            r"\b(?:royal\s+basmati\s+exports|annapurna\s+rice\s+mill|krbl|lt\s+foods|grm\s+overseas)\b",
        ]
        for pat in exporter_supplier_patterns:
            if re.search(pat, combined_text):
                return False, f"Matched producer/exporter signal '{pat}' when querying for importer (buyer)"

    # Commodity relevance verification
    target_comm_low = (target_commodity or "").lower().strip()
    relevant_commodity_words = set()
    for comm_key, word_set in COMMODITY_KEYWORDS_MAP.items():
        if comm_key in target_comm_low:
            relevant_commodity_words.update(word_set)

    if not relevant_commodity_words and target_comm_low:
        relevant_commodity_words.update([t for t in re.split(r"[\s\-_,]+", target_comm_low) if len(t) > 2])

    # If no target commodity specified, accept any standard agricultural / trade commodity
    if not relevant_commodity_words:
        for word_set in COMMODITY_KEYWORDS_MAP.values():
            relevant_commodity_words.update(word_set)

    relevant_commodity_words.update(GENERAL_AGRI_TRADE_TERMS)

    has_commodity_match = any(cw in combined_text for cw in relevant_commodity_words)

    # Corporate indicators or Trade role check
    name_tokens = set(re.findall(r"[a-z]+", low_name))
    has_corporate_indicator = bool(name_tokens & CORPORATE_INDICATORS)
    has_trade_role = any(tr in combined_text for tr in TRADE_ROLE_TERMS)

    if not (has_corporate_indicator or has_trade_role):
        return False, "Entity lacks corporate indicator or commercial trade role"

    if not has_commodity_match:
        if has_corporate_indicator and any(tr in combined_text for tr in ("commercial", "distribution", "trading", "import", "grossiste", "agro", "négoce", "food", "consignee")):
            has_commodity_match = True
        else:
            return False, f"Entity has no relevance to target commodity '{target_commodity}'"

    return True, "Verified commercial trade entity"

