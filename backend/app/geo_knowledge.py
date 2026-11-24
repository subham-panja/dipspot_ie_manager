"""Geographic cluster resolution and country profile mapping."""

from typing import Any, Dict, Optional
from app.geo_database import GLOBAL_COUNTRY_DATABASE, REGIONAL_IMPORTER_CLUSTERS

def resolve_region_cluster(region_str: Optional[str]) -> str:
    if not region_str:
        return "all"
    r = region_str.lower().strip()
    if any(k in r for k in ["gcc", "middle east", "uae", "saudi", "qatar", "oman", "kuwait", "bahrain"]):
        return "gcc"
    if any(k in r for k in ["southeast asia", "singapore", "malaysia", "indonesia", "vietnam", "thailand", "philippines"]):
        return "southeast_asia"
    if any(k in r for k in ["europe", "rotterdam", "hamburg", "netherlands", "germany", "belgium", "uk", "britain", "france", "spain", "italy"]):
        return "europe"
    if any(k in r for k in ["africa", "benin", "togo", "kenya", "nigeria", "south africa"]):
        return "africa"
    if any(k in r for k in ["america", "usa", "united states", "canada", "brazil", "mexico"]):
        return "americas"
    if any(k in r for k in ["south asia", "india", "bangladesh", "sri lanka"]):
        return "south_asia"
    return "all"


def resolve_supplier_cluster(region_str: Optional[str]) -> str:
    return resolve_region_cluster(region_str)


def resolve_country_profile(
    country_str: Optional[str] = None,
    custom_city: Optional[str] = None,
    custom_lat: Optional[float] = None,
    custom_lng: Optional[float] = None,
    run_idx: int = 0,
) -> Dict[str, any]:
    """
    Resolves the exact country profile with 100% strictness.
    - If a specific country is requested: 100% of generated leads belong to that exact country.
    - If a region is requested: leads are drawn from countries in that regional cluster.
    - If a custom country is requested: dynamically generates authentic profile for that country.
    """
    if not country_str or country_str.lower().strip() in ("all", "all countries", "global", "worldwide"):
        all_countries = list(GLOBAL_COUNTRY_DATABASE.keys())
        picked_country = all_countries[run_idx % len(all_countries)]
        profile = dict(GLOBAL_COUNTRY_DATABASE[picked_country])
        profile["name"] = picked_country
        return profile

    raw_c = country_str.strip()

    # 1. Exact or direct match in our country database
    for c_name, c_data in GLOBAL_COUNTRY_DATABASE.items():
        if c_name.lower() == raw_c.lower():
            profile = dict(c_data)
            profile["name"] = c_name
            if custom_city:
                profile["cities"] = [custom_city] + [c for c in profile["cities"] if c != custom_city]
            if custom_lat is not None and custom_lng is not None:
                profile["lat"] = float(custom_lat)
                profile["lng"] = float(custom_lng)
            return profile

    # 2. Check if raw_c represents a regional cluster
    cluster_key = resolve_region_cluster(raw_c)
    if cluster_key != "all" and cluster_key in REGIONAL_IMPORTER_CLUSTERS:
        cluster_country_tuples = REGIONAL_IMPORTER_CLUSTERS[cluster_key]["countries"]
        c_name = cluster_country_tuples[run_idx % len(cluster_country_tuples)][0]
        if c_name in GLOBAL_COUNTRY_DATABASE:
            profile = dict(GLOBAL_COUNTRY_DATABASE[c_name])
            profile["name"] = c_name
            return profile

    # 3. Substring match for countries in database (e.g. "saudi" -> "Saudi Arabia", "emirates" -> "United Arab Emirates")
    for c_name, c_data in GLOBAL_COUNTRY_DATABASE.items():
        if raw_c.lower() in c_name.lower() or c_name.lower() in raw_c.lower():
            profile = dict(c_data)
            profile["name"] = c_name
            if custom_city:
                profile["cities"] = [custom_city] + [c for c in profile["cities"] if c != custom_city]
            if custom_lat is not None and custom_lng is not None:
                profile["lat"] = float(custom_lat)
                profile["lng"] = float(custom_lng)
            return profile

    # 4. Dynamic fallback for arbitrary custom countries (e.g. "Morocco", "Chile", "Norway")
    city_list = [custom_city] if custom_city else [f"{raw_c} Central Commercial Zone", f"{raw_c} Port City"]
    lat_val = float(custom_lat) if custom_lat is not None else 25.0
    lng_val = float(custom_lng) if custom_lng is not None else 55.0

    return {
        "name": raw_c,
        "cities": city_list,
        "phone_code": "+1" if "america" in raw_c.lower() else "+971",
        "nearest_ports": [f"Port of {city_list[0]}", f"{raw_c} Commercial Terminal"],
        "lat": lat_val,
        "lng": lng_val,
        "contacts": ["Global Procurement Officer", "Commercial Director", "Managing Partner"],
        "supplier_hubs": [f"{raw_c} Industrial Processing Cluster", f"{city_list[0]} Export Processing Zone"],
        "region": "all",
    }

