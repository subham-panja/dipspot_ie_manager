"""Pure normalization and lead-ID resolution helpers for M2M contacts."""

import re
from typing import Any, List, Tuple

_LI_PROFILE_RE = re.compile(
    r"(?:https?://)?(?:[a-z]{2,3}\.|www\.)?linkedin\.com/in/([a-zA-Z0-9\-_%]+)",
    re.IGNORECASE,
)
LI_BLOCKED_SEGMENTS = ("/search/results/", "/company/", "/jobs/", "/school/")
GENERIC_CONTACT_NAMES = {
    "purchase manager",
    "procurement division",
    "mill management",
    "commercial trade desk",
    "export & mill desk",
    "rice wholesale desk",
    "procurement desk",
    "import desk",
}


def normalize_linkedin_url(url: Any) -> str:
    raw = str(url or "").strip()
    if not raw:
        return ""
    raw_low = raw.lower()
    if any(seg in raw_low for seg in LI_BLOCKED_SEGMENTS):
        return ""
    m = _LI_PROFILE_RE.search(raw)
    if not m:
        return ""
    slug = m.group(1).strip("/").lower()
    return f"https://www.linkedin.com/in/{slug}" if slug else ""


def normalize_email(email: Any) -> str:
    raw = str(email or "").strip().lower()
    if not raw or "@" not in raw:
        return ""
    local, _, domain = raw.partition("@")
    if not local or "." not in domain:
        return ""
    return raw


def normalize_phone_digits(phone: Any) -> str:
    digits = re.sub(r"[^\d]", "", str(phone or ""))
    return digits if len(digits) >= 7 else ""


def normalize_name_phone_key(full_name: Any, phone: Any) -> str:
    name_norm = re.sub(r"\s+", " ", str(full_name or "").strip().lower())
    digits = normalize_phone_digits(phone)
    if name_norm and digits:
        return f"{name_norm}::{digits}"
    return ""


def canonical_lead_id(lead_doc: dict) -> str:
    if lead_doc.get("id") is not None:
        return str(lead_doc["id"])
    return str(lead_doc.get("_id", ""))


def possible_lead_ids(lead_doc: dict) -> List[Any]:
    candidates: List[Any] = []
    lid = lead_doc.get("id")
    if lid is not None:
        candidates.append(str(lid))
        try:
            candidates.append(int(lid))
        except (ValueError, TypeError):
            pass
    oid = lead_doc.get("_id")
    if oid is not None:
        candidates.append(str(oid))
    seen = set()
    unique: List[Any] = []
    for c in candidates:
        key = (type(c), c)
        if key not in seen:
            seen.add(key)
            unique.append(c)
    return unique


def parse_contact_person(raw_cp: str) -> Tuple[str, str]:
    cp = str(raw_cp or "").strip()
    if not cp:
        return "", ""
    m = re.match(r"^(.+?)\s*\(([^)]+)\)\s*$", cp)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return cp, ""
