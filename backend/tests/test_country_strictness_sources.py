import pytest
from app.sources import IMPORTER_SOURCES, SUPPLIER_SOURCES, get_all_sources
from app.tasks import (
    _generate_dynamic_importers,
    _generate_dynamic_suppliers,
    resolve_country_profile,
    _save_leads_with_dedup,
)


class TestCountryStrictnessAndSources:
    def test_sources_count_at_least_50_each(self):
        """Verify there are at least 50 importer sources and 50 supplier sources."""
        assert len(IMPORTER_SOURCES) >= 50, f"Expected >= 50 importer sources, got {len(IMPORTER_SOURCES)}"
        assert len(SUPPLIER_SOURCES) >= 50, f"Expected >= 50 supplier sources, got {len(SUPPLIER_SOURCES)}"

        all_sources = get_all_sources()
        assert len(all_sources) >= 100

    def test_sources_api_endpoint(self, client):
        """Verify the /api/crawler/sources endpoint returns both categories with accurate counts."""
        resp = client.get("/api/crawler/sources")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["importer_sources_count"] >= 50
        assert data["supplier_sources_count"] >= 50
        assert data["total_sources"] >= 100
        assert len(data["sources"]) >= 100

    def test_country_strictness_saudi_arabia_importers(self):
        """Verify that selecting Saudi Arabia generates 100% Saudi Arabia leads, zero other countries."""
        leads = _generate_dynamic_importers(
            run_idx=0,
            count=50,
            country_str="Saudi Arabia",
            commodity_str="Basmati & Non-Basmati Rice",
        )
        assert len(leads) == 50
        for lead in leads:
            assert lead["country"] == "Saudi Arabia", f"Lead country was {lead['country']}, expected Saudi Arabia"
            assert lead["lead_type"] == "importer"
            assert lead["phones"].startswith("+966")
            assert "source_name" in lead and lead["source_name"]

    def test_country_strictness_germany_importers(self):
        """Verify that selecting Germany generates 100% Germany leads, zero other countries."""
        leads = _generate_dynamic_importers(
            run_idx=0,
            count=40,
            country_str="Germany",
            commodity_str="Refined Cane Sugar ICUMSA 45",
        )
        assert len(leads) == 40
        for lead in leads:
            assert lead["country"] == "Germany"
            assert lead["lead_type"] == "importer"
            assert lead["phones"].startswith("+49")

    def test_country_strictness_custom_country_japan(self):
        """Verify custom country lookup for Japan with Google Maps coordinates."""
        leads = _generate_dynamic_importers(
            run_idx=0,
            count=30,
            country_str="Japan",
            custom_city="Tokyo",
            custom_lat=35.6762,
            custom_lng=139.6503,
        )
        assert len(leads) == 30
        for lead in leads:
            assert lead["country"] == "Japan"
            assert lead["lead_type"] == "importer"
            assert lead["phones"].startswith("+81")
            assert "Japan" in lead["city_or_hub"]

    def test_country_strictness_suppliers_uae(self):
        """Verify suppliers generated for UAE are 100% UAE processing facilities."""
        suppliers = _generate_dynamic_suppliers(
            run_idx=0,
            count=35,
            country_str="United Arab Emirates",
            commodity_str="Packaged Foodstuffs & Edible Oils",
        )
        assert len(suppliers) == 35
        for sup in suppliers:
            assert sup["country"] == "United Arab Emirates"
            assert sup["lead_type"] == "wb_mill"
            assert sup["phones"].startswith("+971")
            assert "source_name" in sup

    def test_depth_200_importers_continuous_harvest(self, app):
        """Verify continuous harvesting for 200 leads strictly in selected country."""
        leads_200 = _generate_dynamic_importers(
            run_idx=5,
            count=200,
            country_str="United States",
            commodity_str="Industrial Chemicals & Polymers",
        )
        assert len(leads_200) == 200
        for lead in leads_200:
            assert lead["country"] == "United States"
            assert lead["lead_type"] == "importer"
            assert lead["phones"].startswith("+1")

        # Save to database
        saved = _save_leads_with_dedup(app, leads_200)
        assert saved > 0

    def test_crawl_now_importer_only_never_spawns_supplier(self, client, monkeypatch):
        """Verify POST /api/scrape/crawl-now with lead_type='importers' never invokes supplier scraper."""
        importer_called = []
        supplier_called = []

        monkeypatch.setattr("app.routes.api.start_importer_scrape", lambda *args, **kwargs: importer_called.append(True) or 101)
        monkeypatch.setattr("app.routes.api.start_wb_mills_scrape", lambda *args, **kwargs: supplier_called.append(True) or 102)

        resp = client.post("/api/scrape/crawl-now", json={
            "lead_type": "importers",
            "country": "Saudi Arabia",
            "commodity": "Basmati Rice",
            "depth": 200,
        })
        assert resp.status_code == 202
        assert len(importer_called) == 1, "Importer scraper should have been called exactly once"
        assert len(supplier_called) == 0, "Supplier scraper MUST NOT be called when importing is requested"

    def test_crawl_now_supplier_only_never_spawns_importer(self, client, monkeypatch):
        """Verify POST /api/scrape/crawl-now with lead_type='suppliers' never invokes importer scraper."""
        importer_called = []
        supplier_called = []

        monkeypatch.setattr("app.routes.api.start_importer_scrape", lambda *args, **kwargs: importer_called.append(True) or 101)
        monkeypatch.setattr("app.routes.api.start_wb_mills_scrape", lambda *args, **kwargs: supplier_called.append(True) or 102)

        resp = client.post("/api/scrape/crawl-now", json={
            "lead_type": "suppliers",
            "country": "India",
            "commodity": "Swarna Rice",
            "depth": 50,
        })
        assert resp.status_code == 202
        assert len(supplier_called) == 1, "Supplier scraper should have been called exactly once"
        assert len(importer_called) == 0, "Importer scraper MUST NOT be called when supplying is requested"
