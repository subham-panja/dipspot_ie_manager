"""Trade directory and customs manifest sources registry."""

from typing import Dict, List, Optional
from app.importer_sources import (
    GOOGLE_DORK_IMPORTER_SOURCE,
    GOOGLE_MAPS_IMPORTER_SOURCE,
    IMPORTER_SOURCES,
)
from app.supplier_sources import (
    GOOGLE_DORK_SUPPLIER_SOURCE,
    GOOGLE_MAPS_SUPPLIER_SOURCE,
    SUPPLIER_SOURCES,
)

def _get_country_coverage_tokens(country: str) -> List[str]:
    c_low = country.lower().strip()
    tokens = [c_low]
    if c_low in ("united arab emirates", "uae", "dubai", "abu dhabi", "sharjah", "ajman"):
        tokens.extend(["united arab emirates", "uae", "gcc", "middle east", "gulf"])
    elif c_low in ("saudi arabia", "saudi", "riyadh", "jeddah", "dammam"):
        tokens.extend(["saudi arabia", "saudi", "gcc", "middle east", "gulf"])
    elif c_low in ("qatar", "oman", "kuwait", "bahrain"):
        tokens.extend(["gcc", "middle east", "gulf"])
    elif c_low in ("india", "west bengal", "punjab", "haryana", "andhra pradesh", "telangana", "odisha", "bihar"):
        tokens.extend(["india", "indian", "south asia"])
    elif c_low in ("germany", "netherlands", "france", "spain", "italy", "belgium", "poland"):
        tokens.extend(["europe", "european union", "eu"])
    elif c_low in ("united kingdom", "uk", "britain"):
        tokens.extend(["united kingdom", "uk", "europe"])
    elif c_low in ("united states", "usa", "us"):
        tokens.extend(["united states", "usa", "north america", "americas"])
    elif c_low in ("singapore", "malaysia", "thailand", "vietnam", "indonesia", "philippines"):
        tokens.extend(["asean", "southeast asia"])
    elif c_low in ("benin", "togo", "nigeria", "ghana", "ivory coast", "senegal", "guinea"):
        tokens.extend(["west africa"])
    elif c_low in ("kenya", "tanzania", "uganda", "rwanda", "ethiopia", "djibouti"):
        tokens.extend(["east africa"])
    elif c_low in ("south africa", "namibia", "mozambique", "zimbabwe"):
        tokens.extend(["southern africa", "sadc"])
    elif c_low in ("egypt", "morocco", "algeria", "tunisia"):
        tokens.extend(["north africa"])
    return list(dict.fromkeys(tokens))


def get_all_sources(
    lead_type: Optional[str] = None,
    country: Optional[str] = None,
    is_indian: Optional[bool] = None,
    is_map: Optional[bool] = None,
    disabled_ids: Optional[List[str]] = None,
    selected_ids: Optional[List[str]] = None,
) -> List[Dict]:
    """Returns verified trade sources filtered optionally by lead type, country, Indian focus, map status, and disabled/selected IDs."""
    sources: List[Dict] = []
    if lead_type in ("importer", "importers", "buyer", "buyers"):
        sources = list(IMPORTER_SOURCES)
    elif lead_type in ("supplier", "suppliers", "wb_mill", "wb_mills", "mill", "mills"):
        sources = list(SUPPLIER_SOURCES)
    else:
        sources = list(IMPORTER_SOURCES) + list(SUPPLIER_SOURCES)

    if selected_ids:
        selected_set = set(selected_ids)
        # If caller specified selected sources, strictly return ONLY those sources
        all_pool = list(IMPORTER_SOURCES) + list(SUPPLIER_SOURCES)
        return [s for s in all_pool if s.get("id") in selected_set]

    if disabled_ids:
        disabled_set = set(disabled_ids)
        sources = [s for s in sources if s.get("id") not in disabled_set]

    if is_map is True:
        return [s for s in sources if s.get("is_map_extractor")]
    elif is_map is False:
        sources = [s for s in sources if not s.get("is_map_extractor")]

    if is_indian is True:
        return [
            s for s in sources
            if s.get("is_indian") or "india" in s.get("country_coverage", "").lower()
        ]

    if country and country.lower() not in ("all", "all countries", "global", ""):
        tokens = _get_country_coverage_tokens(country)
        c_low = country.lower().strip()
        # Direct country matches first, then regional sub-zone matches
        direct_matches = [
            s for s in sources
            if c_low in s.get("country_coverage", "").lower() or c_low in s.get("name", "").lower()
        ]
        regional_matches = [
            s for s in sources
            if any(t in s.get("country_coverage", "").lower() for t in tokens if t != c_low)
            and s not in direct_matches
        ]
        # Include universal global tools (Google Maps, Dorks, Customs B/L) but exclude foreign national portals (e.g. FIEO for non-India, KPA for non-Kenya)
        foreign_portals = ("fieo", "apeda", "dgft", "indian", "kenya", "saudi", "dubai", "kolkata", "cotonou", "dakar", "abidjan")
        global_sources = [
            s for s in sources
            if s.get("country_coverage", "").lower() == "global"
            and not any(fh in s.get("name", "").lower() for fh in foreign_portals if fh not in c_low)
            and s not in direct_matches
            and s not in regional_matches
        ]
        combined = direct_matches + regional_matches + global_sources
        if combined:
            return combined

    return sources


def get_importer_sources(country: Optional[str] = None, disabled_ids: Optional[List[str]] = None, selected_ids: Optional[List[str]] = None) -> List[Dict]:
    return get_all_sources(lead_type="importer", country=country, disabled_ids=disabled_ids, selected_ids=selected_ids)


def get_supplier_sources(country: Optional[str] = None, is_indian: Optional[bool] = None, disabled_ids: Optional[List[str]] = None, selected_ids: Optional[List[str]] = None) -> List[Dict]:
    return get_all_sources(lead_type="supplier", country=country, is_indian=is_indian, disabled_ids=disabled_ids, selected_ids=selected_ids)


def get_indian_supplier_sources(disabled_ids: Optional[List[str]] = None) -> List[Dict]:
    """Returns verified Indian trade councils, commodity boards, and milling registries."""
    return get_all_sources(lead_type="supplier", is_indian=True, disabled_ids=disabled_ids)


get_sources_for_crawler = get_all_sources


__all__ = [
    GOOGLE_DORK_IMPORTER_SOURCE,
    GOOGLE_DORK_SUPPLIER_SOURCE,
    GOOGLE_MAPS_IMPORTER_SOURCE,
    GOOGLE_MAPS_SUPPLIER_SOURCE,
    IMPORTER_SOURCES,
    SUPPLIER_SOURCES,
    get_all_sources,
    get_importer_sources,
    get_supplier_sources,
    get_indian_supplier_sources,
    get_sources_for_crawler,
]
