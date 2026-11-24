"""Facade module for RealisticWebScraper and harvesting utilities."""

from app.scraper.filters import (
    AUTHORIZED_GOVT_AND_PORT_DOMAINS,
    B2B_DIRECTORY_DOMAINS,
    COMMODITY_KEYWORDS_MAP,
    CORPORATE_INDICATORS,
    GENERAL_AGRI_TRADE_TERMS,
    JUNK_DOMAINS,
    JUNK_PATTERNS,
    TRADE_ROLE_TERMS,
    USER_AGENTS,
    is_blacklisted_domain,
)
from app.scraper.entity_verifier import is_trade_business_entity
from app.scraper.http_client import FREE_PROXY_POOL, _get_random_headers, decode_bing_u
from app.scraper.geo_sanitizer import sanitize_lead_geography
from app.scraper.pipeline import execute_realistic_harvest
from app.scraper.scraper_class import RealisticWebScraper
from app.verifier import extract_domain, filter_live_emails, is_domain_live, verify_website_live

__all__ = [
    "AUTHORIZED_GOVT_AND_PORT_DOMAINS",
    "B2B_DIRECTORY_DOMAINS",
    "COMMODITY_KEYWORDS_MAP",
    "CORPORATE_INDICATORS",
    "FREE_PROXY_POOL",
    "GENERAL_AGRI_TRADE_TERMS",
    "JUNK_DOMAINS",
    "JUNK_PATTERNS",
    "RealisticWebScraper",
    "TRADE_ROLE_TERMS",
    "USER_AGENTS",
    "decode_bing_u",
    "execute_realistic_harvest",
    "extract_domain",
    "filter_live_emails",
    "is_blacklisted_domain",
    "is_domain_live",
    "is_trade_business_entity",
    "sanitize_lead_geography",
    "verify_website_live",
]
