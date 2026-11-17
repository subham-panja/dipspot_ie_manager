import os
import re
from typing import Dict, List, Optional, Tuple
import phonenumbers
from email_validator import EmailNotValidError, validate_email
from rapidfuzz import fuzz
from app.config import Config

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


def clean_company_key(name: str) -> str:
    n = (name or "").lower()
    n = re.sub(
        r"\b(pvt\.?|private|ltd\.?|limited|llc|l\.l\.c\.?|w\.l\.l\.?|wll|fze|fzco|dmcc|est\.?|co\.?|company|corp\.?|inc\.?|llp|m/s)\b",
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
