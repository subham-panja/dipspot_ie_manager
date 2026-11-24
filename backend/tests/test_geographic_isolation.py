import pytest
from app.verified_catalog import get_verified_trade_leads
from app.map_extractor import search_google_maps_places
from app.real_scraper import RealisticWebScraper, sanitize_lead_geography
from app.tasks import resolve_country_profile, run_importer_scrape_thread
from app.factory import create_app
from app.db import get_db


# ---------------------------------------------------------------------------
# Shared forbidden-token lists per country for geographic cross-contamination
# ---------------------------------------------------------------------------
FORBIDDEN_TOKENS_TOGO = [
    "india", "bengal", "hooghly", "arambagh", "burdwan", "punjab", "delhi", "dubai", "uae",
]


def test_country_importer_isolation():
    """Verify 100% strict isolation for country importers: zero cross-contamination."""
    country = "Togo"
    leads = get_verified_trade_leads(
        lead_type="importer",
        country=country,
        commodity="Non basmati rice ir64",
        count=100,
    )
    assert len(leads) == 100

    togo_cities = ["Lome", "Kara", "Atakpame", "Sokode", "Kpalime"]
    for l in leads:
        # Strict country
        assert l["country"] == country
        # Strict lead type
        assert l["lead_type"] == "importer"
        # Strict phone code (+228)
        assert l["phones"].startswith("+228")
        # Strict port (Lome)
        assert "Lome" in l["nearest_port"] or "PAL" in l["nearest_port"]
        # Strict city in Togo
        assert any(c.lower() in l["city_or_hub"].lower() for c in togo_cities)
        # Strict address in Togo
        assert "Togo" in l["address"]
        # Zero foreign leaks
        addr_low = l["address"].lower()
        for forbidden in FORBIDDEN_TOKENS_TOGO:
            assert forbidden not in addr_low, f"Forbidden '{forbidden}' leaked into {country} address: {l['address']}"


def test_country_supplier_isolation():
    """Verify country suppliers are agricultural millers and processing complexes in the target country."""
    country = "Togo"
    leads = get_verified_trade_leads(
        lead_type="supplier",
        country=country,
        commodity="Non basmati rice ir64",
        count=50,
    )
    assert len(leads) == 50
    for l in leads:
        assert l["country"] == country
        assert l["lead_type"] == "wb_mill"
        assert l["phones"].startswith("+228")
        assert "Togo" in l["address"]
        for forbidden in FORBIDDEN_TOKENS_TOGO:
            assert forbidden not in l["address"].lower()


def test_map_extractor_country_isolation():
    """Verify search_google_maps_places never outputs foreign addresses for the target country."""
    country = "Togo"
    places = search_google_maps_places("rice wholesale Togo", country=country, limit=30, lead_type="importer")
    assert len(places) > 0
    for p in places:
        assert p["country"] == country
        assert p["phones"].startswith("+228")
        assert "Togo" in p["formatted_address"]
        addr_low = p["formatted_address"].lower()
        for forbidden in ["india", "bengal", "hooghly", "arambagh", "burdwan", "dubai"]:
            assert forbidden not in addr_low


def test_sanitize_geography_cross_contamination():
    """Verify sanitize_lead_geography rejects foreign contamination and preserves valid country leads."""
    country = "Togo"
    c_profile = resolve_country_profile(country)
    leaked_lead = {
        "company_name": "Annapurna Rice Mill (Hooghly Cluster)",
        "country": "Togo",
        "city_or_hub": "Arambagh",
        "address": "Arambagh Link Road, Hooghly - 712601, West Bengal, India",
        "phones": "+91 9434123890",
        "nearest_port": "Haldia Port Terminal",
        "lead_type": "importer",
    }
    # Foreign candidate must be discarded (return None) to prevent fabricating fake Togo addresses
    sanitized = sanitize_lead_geography(leaked_lead, country, c_profile)
    assert sanitized is None, "Foreign contaminated candidate must be discarded (None), never mutated with fake target country address"

    # Genuine country lead must be preserved intact
    valid_lead = {
        "company_name": "SIAB Togo SARL",
        "country": "Togo",
        "city_or_hub": "Lome",
        "address": "Zone Portuaire, BP 1234, Lome, Togo",
        "phones": "+228 22 21 00 11",
        "nearest_port": "Port Autonome de Lome",
        "lead_type": "importer",
    }
    valid_sanitized = sanitize_lead_geography(valid_lead, country, c_profile)
    assert valid_sanitized is not None
    assert valid_sanitized["country"] == country
    assert valid_sanitized["city_or_hub"] in c_profile["cities"]
    assert "Togo" in valid_sanitized["address"]
    assert valid_sanitized["phones"].startswith("+228")


def test_end_to_end_country_crawler():
    """Simulate complete crawler execution for a target country and verify database records."""
    country = "Togo"
    app = create_app("testing")
    with app.app_context():
        db = get_db()
        test_job_id = 88888
        db.crawler_jobs.delete_many({"job_id": test_job_id})
        db.leads.delete_many({"job_id": test_job_id})

        run_importer_scrape_thread(
            app=app,
            job_id=test_job_id,
            country=country,
            commodity="Non basmati rice ir64",
            depth=25,
            custom_label="Togo IR-64 Buyers Verification Run",
        )

        job = db.crawler_jobs.find_one({"job_id": test_job_id})
        assert job is not None
        assert job["status"] == "completed"

        leads = list(db.leads.find({"job_id": test_job_id}))
        assert len(leads) >= 10

        for l in leads:
            assert l["country"] == country, f"Found country {l['country']} in {country} crawl"
            assert not l["phones"].startswith("+91"), f"Found Indian phone {l['phones']} in {country} crawl"
            assert l["phones"] == "" or l["phones"].startswith("+228"), f"Found non-{country} phone {l['phones']}"
            assert "india" not in l["address"].lower(), f"India leaked into {country} lead: {l['address']}"
            assert "bengal" not in l["address"].lower(), f"Bengal leaked into {country} lead: {l['address']}"
            assert "hooghly" not in l["address"].lower(), f"Hooghly leaked into {country} lead: {l['address']}"
            assert "arambagh" not in l["address"].lower(), f"Arambagh leaked into {country} lead: {l['address']}"
            assert "arambagh" not in l["city_or_hub"].lower(), f"Arambagh in city_or_hub: {l['city_or_hub']}"
            assert "annapurna" not in l["company_name"].lower(), f"Annapurna leaked into {country}: {l['company_name']}"
            assert l["lead_type"] == "importer"
