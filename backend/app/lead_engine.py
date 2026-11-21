import os
import re
from typing import Dict, List, Optional, Tuple
import phonenumbers
from email_validator import EmailNotValidError, validate_email
from rapidfuzz import fuzz
from app.config import Config
from app.verifier import (
    extract_domain,
    filter_live_emails,
    is_domain_live,
    is_email_domain_live,
    is_synthetic_domain_format,
    verify_domain_resolves,
    verify_website_live,
)

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,10}", re.I)
OBFUSCATED_EMAIL_REGEX = re.compile(
    r"([a-zA-Z0-9._%+\-]+)\s*(?:\[at\]|\(at\)|\bat\b)\s*([a-zA-Z0-9.\-]+)\s*(?:\[dot\]|\(dot\)|\bdot\b)\s*([a-zA-Z]{2,10})",
    re.I,
)
PHONE_CANDIDATE_REGEX = re.compile(r"(?:\+|00)?\d[\d\s\-\(\)/\.]{7,18}\d")
INDIAN_GSTIN_REGEX = re.compile(r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b")
INDIAN_PAN_REGEX = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b")
FSSAI_14_REGEX = re.compile(r"\b[12][0-9]{13}\b")

JUNK_EMAIL_DOMAINS = {
    "example.com", "domain.com", "yoursite.com", "email.com",
    "sentry.io", "wixpress.com", "cloudflare.com", "w3.org",
}
JUNK_EMAIL_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js")

COUNTRY_TO_ISO2: Dict[str, str] = {
    "united arab emirates": "AE", "uae": "AE", "dubai": "AE", "abu dhabi": "AE", "sharjah": "AE",
    "saudi arabia": "SA", "ksa": "SA", "riyadh": "SA", "jeddah": "SA", "dammam": "SA",
    "qatar": "QA", "doha": "QA",
    "oman": "OM", "muscat": "OM",
    "kuwait": "KW",
    "bahrain": "BH", "manama": "BH",
    "india": "IN", "west bengal": "IN",
}

SHARED_PLATFORM_AND_DIRECTORY_DOMAINS = {
    "indiamart.com", "go4worldbusiness.com", "tradeindia.com", "exportersindia.com",
    "maps.google.com", "google.com", "kompass.com", "europages.com", "europages.co.uk",
    "apeda.gov.in", "atninfo.com", "exportmandi.com", "tradekey.com", "volza.com",
    "panjiva.com", "trademo.com", "importgenius.com", "hidubai.com", "yellowpages.com",
    "justdial.com", "alibaba.com", "aliexpress.com", "ec21.com", "made-in-china.com",
    "globalsources.com", "openstreetmap.org", "wikipedia.org", "facebook.com",
    "linkedin.com", "instagram.com", "twitter.com", "x.com", "youtube.com", "github.com",
}


def normalize_deobfuscated_emails(raw_text: str) -> List[str]:
    if not raw_text:
        return []

    text = OBFUSCATED_EMAIL_REGEX.sub(r"\1@\2.\3", raw_text)
    candidates = set(EMAIL_REGEX.findall(text))
    valid_emails = []
    check_mx = os.getenv("VALIDATE_EMAIL_MX", "false").lower() == "true"

    for cand in candidates:
        cand_clean = cand.strip(".,;:()[]<>\"'").lower()
        if cand_clean.endswith(JUNK_EMAIL_EXTENSIONS):
            continue
        domain = cand_clean.split("@")[-1]
        if domain in JUNK_EMAIL_DOMAINS:
            continue
        try:
            v = validate_email(cand_clean, check_deliverability=check_mx)
            valid_emails.append(v.normalized)
        except EmailNotValidError:
            continue

    return sorted(set(valid_emails))


def normalize_phones(raw_text: str, region_hint: str = "IN") -> List[str]:
    if not raw_text:
        return []

    iso_region = COUNTRY_TO_ISO2.get(region_hint.lower().strip(), region_hint.upper()[:2])
    if len(iso_region) != 2:
        iso_region = "IN"

    results = []
    for match in PHONE_CANDIDATE_REGEX.findall(raw_text):
        cleaned = re.sub(r"[^\d\+]", "", match)
        if cleaned.startswith("00"):
            cleaned = "+" + cleaned[2:]
        try:
            parsed = phonenumbers.parse(cleaned, iso_region)
            if phonenumbers.is_valid_number(parsed) or phonenumbers.is_possible_number(parsed):
                e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
                results.append(e164)
                continue
        except phonenumbers.NumberParseException:
            pass

        if cleaned.startswith("+") and 9 <= len(cleaned) <= 16:
            results.append(cleaned)

    return sorted(set(results))


def classify_non_basmati_relevance(text: str) -> Tuple[bool, str, int]:
    t_low = (text or "").lower()
    if not t_low.strip():
        return False, "No_Text", 0

    cfg = Config()
    pos_keywords = [k.lower() for k in cfg.POSITIVE_RICE_KEYWORDS]

    for bad_hs in cfg.EXCLUDE_HS_CODES:
        if bad_hs in t_low and "10063019" not in t_low and "non-basmati" not in t_low:
            return False, "Excluded_HS_Basmati", 0

    matched = [kw for kw in pos_keywords if kw in t_low]
    has_basmati = "basmati" in re.sub(r"non[\s\-]?basmati", "", t_low)
    has_non_basmati_signal = any(
        w in t_low
        for w in [
            "non-basmati", "non basmati", "ir64", "ir-64", "ir 64", "parboiled",
            "parboild", "swarna", "miniket", "minikit", "ratna", "sona masoori",
            "ponni", "matta", "gobindobhog", "banskathi", "broken rice",
            "10063019", "10063010",
        ]
    )

    if cfg.STRICT_NO_BASMATI and has_basmati and not has_non_basmati_signal:
        return False, "Rejected_Basmati_Only", 0

    score = 0
    if any(k in t_low for k in ["ir64", "ir-64", "ir 64"]):
        score += 40
    if any(k in t_low for k in ["parboiled", "parboild", "boiled rice"]):
        score += 35
    if any(k in t_low for k in ["swarna", "miniket", "minikit", "ratna", "gobindobhog", "banskathi"]):
        score += 30
    if any(k in t_low for k in ["non-basmati", "non basmati", "10063019", "10063010"]):
        score += 25
    if any(k in t_low for k in ["rice", "grains", "foodstuff"]):
        score += 10

    if score == 0:
        return False, "No_Rice_Signal", 0

    return True, "; ".join(sorted(set(matched))) or "general_rice", min(score, 100)


def decode_gstin_and_fssai(text: str) -> Tuple[str, str, str]:
    gstin_matches = INDIAN_GSTIN_REGEX.findall(text or "")
    pan_matches = INDIAN_PAN_REGEX.findall(text or "")
    fssai_matches = FSSAI_14_REGEX.findall(text or "")

    gstin = gstin_matches[0] if gstin_matches else ""
    pan = pan_matches[0] if pan_matches else (gstin[2:12] if len(gstin) == 15 else "")
    fssai = fssai_matches[0] if fssai_matches else ""
    return gstin, pan, fssai


def clean_company_name(raw_name: str) -> str:
    """
    Intelligently extracts and normalizes a corporate entity name from raw search result titles,
    DOM headings, or B2B directory listings.
    
    Eliminates:
    - Trailing/leading SEO slogans ('| Best Price', '- Online Grocery Shopping', 'Buy Rice Online')
    - Plural trade categories ('Rice Exporters in India', 'Basmati Rice Suppliers')
    - Page actions & navigation ('Home | ...', 'Contact Us - ...', 'Order Now')
    - Redundant parentheticals and domain suffixes
    """
    if not raw_name:
        return ""
    
    import html as html_lib
    name = html_lib.unescape(raw_name.strip())
    name = re.sub(r"[\u2010\u2011\u2012\u2013\u2014\u2015]", "-", name)
    name = re.sub(r"[\u2018\u2019]", "'", name)
    name = re.sub(r"[\u201C\u201D]", '"', name)
    name = re.sub(r"\s+", " ", name).strip()
    
    # Check if whole title is a known SEO question, article, tutorial, or search category
    low_full = name.lower()
    if any(low_full.startswith(p) for p in ("how to", "what is", "why ", "where to", "top 10", "best 10", "list of", "must try")):
        if not any(sep in name for sep in ("|", " - ", " – ", " — ", "•", "·", "::")):
            return ""

    GENERIC_CATEGORY_DISCARDS = [
        r"\b(?:top|best|leading|list\s+of|find)\s+\d*\s*(?:rice|exporters|suppliers|manufacturers|millers)",
        r"\b(?:rice\s+exporters|rice\s+suppliers|rice\s+manufacturers|rice\s+millers)\s+(?:in|from)\s+[a-z]+",
        r"\b(?:basmati|non\s+basmati)\s+rice\s+(?:exporters|suppliers|manufacturers)",
        r"\b(?:buy|order)\s+rice\s+online",
        r"\bwholesale\s+(?:\w+\s+)?(?:market|distributors|suppliers)\s+(?:in|from)\s+[a-z]+",
        r"^rice\s+exporters\s+in\s+india$",
        r"^exporters\s+in\s+india$",
        r"\b(?:mandi\s+rates?|mandi\s+prices?|wholesale\s+rice\s+prices?)\b",
    ]
    for pat in GENERIC_CATEGORY_DISCARDS:
        if re.search(pat, low_full) and not any(sep in name for sep in ("|", " - ", " – ", " — ", "•", "·", "::")):
            return ""

    # Strip parenthetical annotations like (Hooghly Cluster), (Foodstuff Wholesale), etc., unless legal form like (Pvt Ltd)
    def clean_paren(match):
        inner = match.group(1).lower()
        if any(re.search(r"\b" + corp + r"\b", inner) for corp in ("pvt", "ltd", "llc", "sarl", "gmbh", "inc", "corp", "sa")):
            return match.group(0)
        return ""
    name = re.sub(r"\s*\(([^)]+)\)", clean_paren, name).strip()

    # Split title by common delimiters: "|", " - ", " – ", " — ", " • ", " · ", " :: ", " : "
    chunks = re.split(r"\s+[|•·]\s+|\s+[-–—]\s+|::|\s+:\s+", name)
    chunks = [c.strip() for c in chunks if c.strip()]
    if not chunks:
        return ""

    if len(chunks) == 1:
        single = chunks[0]
        single = re.sub(r"\.(?:com|org|net|ae|in|co|gov|edu)$", "", single, flags=re.I).strip()
        single = re.sub(r"\s+[-–—]\s+[A-Za-z\s]+$", "", single).strip()
        for pat in GENERIC_CATEGORY_DISCARDS:
            if re.search(pat, single.lower()):
                return ""
        return single

    def score_chunk(chunk: str) -> float:
        c_low = chunk.lower()
        words = chunk.split()
        
        # Immediate disqualifiers:
        if any(re.search(pat, c_low) for pat in [
            r"^(?:home|official\s*site|official\s*website|contact\s*us|contact|about\s*us|about|overview|index|main\s*page|products|services|catalog|blog|news|portal|welcome)$",
            r"^(?:suppliers|dealers|manufacturers|exporters|wholesalers)(\s+(?:and|&)\s+(?:dealers|suppliers|manufacturers|exporters|wholesalers))?$",
            r"\b(?:buy\s+online|order\s+now|best\s+price|cheap\s+prices|free\s+shipping|free\s+delivery|order\s+fresh|order\s+groceries|grocery\s+shopping|online\s+shopping|same\s+day\s+delivery)\b",
            r"\b(?:exporters\s+(?:in|from)|suppliers\s+(?:in|from)|manufacturers\s+(?:in|from)|dealers\s+(?:in|from)|wholesalers\s+(?:in|from)|leading\s+exporter|top\s+exporter|leading\s+rice)\b",
            r"\b(?:rice\s+exporters|rice\s+suppliers|rice\s+manufacturers|rice\s+millers|basmati\s+rice|non\s+basmati\s+rice)\b",
            r"\b(?:buy\s+rice|order\s+rice|wholesale\s+prices|wholesale\s+(?:\w+\s+)?market|rice\s+brands|indian\s+rice\s+brands|best\s+rice\s+brands|mandi\s+rates?)\b",
            r"\b(?:how\s+to|what\s+is|why\s+|where\s+to|recipes?|calories|definition|meaning\s+of)\b",
            r"\b(?:login|sign\s*in|register|search\s+results|all\s+rights\s+reserved)\b",
            r"\b(?:online\s+supermarket\s+in|supermarket\s+in|grocery\s+in|online\s+grocery)\b",
        ]):
            return -100.0

        score = 15.0
        # Positive signals: Corporate suffixes
        corp_suffixes = [
            r"\b(?:llc|l\.l\.c\.|ltd|limited|pvt|inc|corp|corporation)\b",
            r"\b(?:sarl|s\.a\.r\.l\.|gmbh|b\.v\.|bv|sa|s\.a\.|pjsc|jsc)\b",
            r"\b(?:wll|w\.l\.l\.|fze|fzco|dmcc|llp|est|establishment|spc)\b",
        ]
        for pat in corp_suffixes:
            if re.search(pat, c_low):
                score += 50.0

        corp_nouns = [
            r"\b(?:group|holdings|enterprises|industries|trading|general\s+trading)\b",
            r"\b(?:foods|foodstuff|foodstuffs|supermarket|supermarkets|hypermarket|cash\s*&\s*carry)\b",
            r"\b(?:agro|mills|mill|millers|international|exports|imports|farms|logistics|terminal)\b",
        ]
        for pat in corp_nouns:
            if re.search(pat, c_low):
                score += 35.0

        # Preference for reasonable brand lengths (1-5 words, 4-40 chars)
        if 1 <= len(words) <= 4:
            score += 20.0
        elif len(words) > 6:
            score -= 25.0

        if 4 <= len(chunk) <= 35:
            score += 15.0
        elif len(chunk) > 55:
            score -= 30.0

        # Proper casing
        if any(w[0].isupper() for w in words if len(w) > 1):
            score += 10.0

        return score

    scored_chunks = [(c, score_chunk(c)) for c in chunks]
    valid_chunks = [sc for sc in scored_chunks if sc[1] > -30.0]
    if not valid_chunks:
        return ""

    valid_chunks.sort(key=lambda x: x[1], reverse=True)
    best_chunk = valid_chunks[0][0]
    best_chunk = re.sub(r"^(?:Welcome\s+to|Official\s+Site\s+of)\s+", "", best_chunk, flags=re.I).strip()
    best_chunk = re.sub(r"\.(?:com|org|net|ae|in|co|gov|edu)$", "", best_chunk, flags=re.I).strip()
    best_chunk = re.sub(r"\s+[-–—]\s+(?:UAE|Dubai|India|Togo|USA|UK|Kolkata)$", "", best_chunk, flags=re.I).strip()
    return best_chunk.strip()


def clean_company_key(name: str) -> str:
    cleaned = clean_company_name(name) if name else ""
    n = (cleaned or name or "").lower()
    n = re.sub(
        r"\b(pvt\.?|private|ltd\.?|limited|llc|l\.l\.c\.?|w\.l\.l\.?|wll|fze|fzco|dmcc|est\.?|co\.?|company|corp\.?|inc\.?|llp|m/s|uae|dubai|india)\b",
        " ",
        n,
    )
    words = [
        w for w in re.sub(r"[^a-z0-9]+", " ", n).split()
        if len(w) > 1 or w.isdigit()
    ]
    return " ".join(words).strip()


def is_machinery_or_spare_parts_seller(text: str) -> bool:
    t_low = (text or "").lower()
    if "supplier of rice mill spare parts" in t_low or "solvent plants" in t_low:
        return True
    return any(term.lower() in t_low for term in Config().MILL_NEGATIVE_KEYWORDS)


def detect_wb_district(text: str, configured_districts: List[str]) -> str:
    t_low = (text or "").lower()
    for d in configured_districts:
        if d.lower() in t_low:
            if d.lower() in ("burdwan", "bardhaman", "purba bardhaman"):
                return "Purba Bardhaman (Burdwan)"
            return d.title()
    return "West Bengal"


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
            matching_fields.append("website")
            return (98.5, f"Exact Web Domain match ({c_dom})", matching_fields)

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
        partial = fuzz.partial_ratio(c_key, e_key)

        # Weighted composite score
        name_score = round(0.55 * sort_ratio + 0.35 * set_ratio + 0.10 * partial, 1)

        c_country = (candidate.get("country") or "").strip().lower()
        e_country = (existing.get("country") or "").strip().lower()

        # If in the same country, high name similarity confirms same entity
        if c_country and e_country and c_country == e_country:
            matching_fields.append("country")
            if name_score >= 90.0:
                name_score = min(round(name_score * 1.05, 1), 100.0)
            if name_score >= 95.0:
                matching_fields.append("company_name")
                return (name_score, f"Company Name NLP match ({name_score}%) in same country", matching_fields)

        if name_score >= 95.0:
            matching_fields.append("company_name")
            return (name_score, f"High-confidence Company Name NLP match ({name_score}%)", matching_fields)

        return (name_score, "Sub-threshold similarity", matching_fields)

    return (0.0, "No similarity detected", [])

