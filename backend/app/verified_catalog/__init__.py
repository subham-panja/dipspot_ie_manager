"""Verified Global Enterprises Catalog package."""

from typing import Any, Dict, List
from app.verified_catalog.catalog_india import CATALOG_INDIA
from app.verified_catalog.catalog_uae import CATALOG_UAE
from app.verified_catalog.catalog_gulf import CATALOG_GULF
from app.verified_catalog.catalog_africa_west import CATALOG_AFRICA_WEST
from app.verified_catalog.catalog_africa_east_north import CATALOG_AFRICA_EAST_NORTH
from app.verified_catalog.catalog_americas_europe import CATALOG_AMERICAS_EUROPE
from app.verified_catalog.catalog_asia_oceania import CATALOG_ASIA_OCEANIA
from app.verified_catalog.lead_generator import generate_registered_country_leads
from app.verified_catalog.query import GIANT_CONGLOMERATES, get_verified_trade_leads

VERIFIED_GLOBAL_ENTERPRISES: List[Dict[str, Any]] = (
    CATALOG_INDIA
    + CATALOG_UAE
    + CATALOG_GULF
    + CATALOG_AFRICA_WEST
    + CATALOG_AFRICA_EAST_NORTH
    + CATALOG_AMERICAS_EUROPE
    + CATALOG_ASIA_OCEANIA
)

__all__ = [
    "VERIFIED_GLOBAL_ENTERPRISES",
    "GIANT_CONGLOMERATES",
    "get_verified_trade_leads",
    "generate_registered_country_leads",
    "CATALOG_INDIA",
    "CATALOG_UAE",
    "CATALOG_GULF",
    "CATALOG_AFRICA_WEST",
    "CATALOG_AFRICA_EAST_NORTH",
    "CATALOG_AMERICAS_EUROPE",
    "CATALOG_ASIA_OCEANIA",
]
