import pytest
from app.verified_catalog import get_verified_trade_leads
from app.map_extractor import search_google_maps_places
from app.real_scraper import RealisticWebScraper, sanitize_lead_geography
from app.tasks import resolve_country_profile, run_importer_scrape_thread
from app.factory import create_app
from app.db import get_db


def test_togo_importers_strict_isolation():
    """Verify 100% strict isolation for Togo: zero Indian or UAE cross-contamination."""
    leads = get_verified_trade_leads(
        lead_type="importer",
        country="Togo",
        commodity="Non basmati rice ir64",
        count=100,
    )
    assert len(leads) == 100

    togo_cities = ["Lome", "Kara", "Atakpame", "Sokode", "Kpalime"]
    for l in leads:
        # Strict country
        assert l["country"] == "Togo"
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
        for forbidden in ["india", "bengal", "hooghly", "arambagh", "burdwan", "punjab", "delhi", "dubai", "uae"]:
            assert forbidden not in addr_low, f"Forbidden '{forbidden}' leaked into Togo address: {l['address']}"


def test_togo_suppliers_strict_isolation():
    """Verify Togo suppliers are agricultural millers and processing complexes in Togo."""
    leads = get_verified_trade_leads(
        lead_type="supplier",
        country="Togo",
        commodity="Non basmati rice ir64",
        count=50,
    )
    assert len(leads) == 50
    for l in leads:
        assert l["country"] == "Togo"
        assert l["lead_type"] == "wb_mill"
        assert l["phones"].startswith("+228")
        assert "Togo" in l["address"]
        for forbidden in ["india", "bengal", "hooghly", "arambagh", "burdwan", "punjab", "delhi", "dubai", "uae"]:
            assert forbidden not in l["address"].lower()


def test_map_extractor_togo_isolation():
    """Verify search_google_maps_places never outputs Indian or Dubai addresses for Togo."""
    places = search_google_maps_places("rice wholesale Togo", country="Togo", limit=30, lead_type="importer")
    assert len(places) > 0
    for p in places:
        assert p["country"] == "Togo"
        assert p["phones"].startswith("+228")
        assert "Togo" in p["formatted_address"]
        addr_low = p["formatted_address"].lower()
        for forbidden in ["india", "bengal", "hooghly", "arambagh", "burdwan", "dubai"]:
            assert forbidden not in addr_low


def test_sanitize_lead_geography_togo():
    """Verify sanitize_lead_geography purges foreign contamination if any source leaks it."""
    c_profile = resolve_country_profile("Togo")
    leaked_lead = {
        "company_name": "Annapurna Rice Mill (Hooghly Cluster)",
        "country": "Togo",
        "city_or_hub": "Arambagh",
        "address": "Arambagh Link Road, Hooghly - 712601, West Bengal, India",
        "phones": "+91 9434123890",
        "nearest_port": "Haldia Port Terminal",
        "lead_type": "importer",
    }
    sanitized = sanitize_lead_geography(leaked_lead, "Togo", c_profile)

    assert sanitized["country"] == "Togo"
    assert sanitized["city_or_hub"] in c_profile["cities"]
    assert "India" not in sanitized["address"]
    assert "Hooghly" not in sanitized["address"]
    assert "Arambagh" not in sanitized["address"]
    assert "Togo" in sanitized["address"]
    assert not sanitized["phones"].startswith("+91")
    assert sanitized["phones"] == "" or sanitized["phones"].startswith("+228")
    assert "Lome" in sanitized["nearest_port"]


def test_end_to_end_togo_crawler_job():
    """Simulate complete crawler execution for Togo and verify MongoDB records."""
    app = create_app("testing")
    with app.app_context():
        db = get_db()
        test_job_id = 88888
        db.crawler_jobs.delete_many({"job_id": test_job_id})
        db.leads.delete_many({"job_id": test_job_id})

        run_importer_scrape_thread(
            app=app,
            job_id=test_job_id,
            country="Togo",
            commodity="Non basmati rice ir64",
            depth=25,
            custom_label="Togo IR-64 Buyers Verification Run",
        )

        job = db.crawler_jobs.find_one({"job_id": test_job_id})
        assert job is not None
        assert job["status"] == "completed"

        leads = list(db.leads.find({"job_id": test_job_id}))
        assert len(leads) >= 15

        for l in leads:
            assert l["country"] == "Togo", f"Found country {l['country']} in Togo crawl"
            assert not l["phones"].startswith("+91"), f"Found Indian phone {l['phones']} in Togo crawl"
            assert l["phones"] == "" or l["phones"].startswith("+228"), f"Found non-Togo phone {l['phones']}"
            assert "india" not in l["address"].lower(), f"India leaked into Togo lead: {l['address']}"
            assert "bengal" not in l["address"].lower(), f"Bengal leaked into Togo lead: {l['address']}"
            assert "hooghly" not in l["address"].lower(), f"Hooghly leaked into Togo lead: {l['address']}"
            assert "arambagh" not in l["address"].lower(), f"Arambagh leaked into Togo lead: {l['address']}"
            assert "arambagh" not in l["city_or_hub"].lower(), f"Arambagh in city_or_hub: {l['city_or_hub']}"
            assert "annapurna" not in l["company_name"].lower(), f"Annapurna leaked into Togo: {l['company_name']}"
            assert l["lead_type"] == "importer"

