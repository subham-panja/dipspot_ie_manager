import pytest
from app.tasks import (
    resolve_region_cluster,
    resolve_supplier_cluster,
    _generate_dynamic_importers,
    _generate_dynamic_suppliers,
    compute_match_probability,
    REGIONAL_IMPORTER_CLUSTERS,
    REGIONAL_SUPPLIER_CLUSTERS,
)


class TestCrawlerRegionAndDepth:
    def test_resolve_region_cluster(self):
        assert resolve_region_cluster("GCC & Middle East (UAE, Saudi, Qatar)") == "gcc"
        assert resolve_region_cluster("Southeast Asia (Singapore, Malaysia)") == "southeast_asia"
        assert resolve_region_cluster("European Union (Rotterdam, Hamburg)") == "europe"
        assert resolve_region_cluster("East & West Africa (Benin, Togo, Kenya)") == "africa"
        assert resolve_region_cluster("Americas (Houston, Santos)") == "americas"
        assert resolve_region_cluster("South Asia & India") == "south_asia"
        assert resolve_region_cluster("Global Sourcing Desks") == "all"
        assert resolve_region_cluster(None) == "all"

    def test_importer_regional_strictness_gcc(self):
        gcc_leads = _generate_dynamic_importers(
            run_idx=0,
            count=30,
            region_str="GCC & Middle East (UAE, Saudi, Qatar)",
            commodity_str="Basmati & Non-Basmati Rice",
        )
        assert len(gcc_leads) == 30
        gcc_countries = {c[0] for c in REGIONAL_IMPORTER_CLUSTERS["gcc"]["countries"]}
        for lead in gcc_leads:
            assert lead["country"] in gcc_countries, f"Country {lead['country']} not in GCC cluster"
            assert lead["lead_type"] == "importer"
            assert lead["phones"].startswith(("+971", "+966", "+974", "+968", "+965", "+973"))

    def test_importer_regional_strictness_europe(self):
        eu_leads = _generate_dynamic_importers(
            run_idx=0,
            count=25,
            region_str="European Union (Rotterdam, Hamburg Gateways)",
            commodity_str="Organic Spices & Turmeric",
        )
        assert len(eu_leads) == 25
        eu_countries = {c[0] for c in REGIONAL_IMPORTER_CLUSTERS["europe"]["countries"]}
        for lead in eu_leads:
            assert lead["country"] in eu_countries, f"Country {lead['country']} not in Europe cluster"
            assert lead["phones"].startswith(("+31", "+49", "+32", "+39", "+34", "+33", "+44"))

    def test_importer_regional_strictness_southeast_asia(self):
        sea_leads = _generate_dynamic_importers(
            run_idx=0,
            count=20,
            region_str="Southeast Asia (Singapore, Malaysia, Indonesia)",
        )
        assert len(sea_leads) == 20
        sea_countries = {c[0] for c in REGIONAL_IMPORTER_CLUSTERS["southeast_asia"]["countries"]}
        for lead in sea_leads:
            assert lead["country"] in sea_countries

    def test_importer_regional_strictness_africa(self):
        africa_leads = _generate_dynamic_importers(
            run_idx=0,
            count=20,
            region_str="East & West Africa",
        )
        assert len(africa_leads) == 20
        africa_countries = {c[0] for c in REGIONAL_IMPORTER_CLUSTERS["africa"]["countries"]}
        for lead in africa_leads:
            assert lead["country"] in africa_countries

    def test_unlimited_depth_generation(self):
        """Verify crawler generates arbitrary depth counts without artificial ceilings."""
        depth_50 = _generate_dynamic_importers(run_idx=10, count=50)
        assert len(depth_50) == 50

        depth_100 = _generate_dynamic_importers(run_idx=20, count=100)
        assert len(depth_100) == 100

        depth_50_sup = _generate_dynamic_suppliers(run_idx=10, count=50)
        assert len(depth_50_sup) == 50

    def test_duplicate_probability_meter(self):
        """Verify probability meter returns high duplicate score for existing entities and low for fresh entities."""
        existing_mongo_index = [
            {
                "key": "apexbasmatitrading",
                "domain": "apexbasmati-trade.com",
                "doc": {
                    "company_name": "Apex Basmati Trading LLC",
                    "website": "https://www.apexbasmati-trade.com",
                    "country": "United Arab Emirates",
                    "phones": "+971 450 123456",
                },
            }
        ]

        # Exact duplicate candidate
        dup_candidate = {
            "company_name": "Apex Basmati Trading LLC",
            "website": "https://www.apexbasmati-trade.com",
            "country": "United Arab Emirates",
            "phones": "+971 450 123456",
        }
        score, status = compute_match_probability(dup_candidate, existing_mongo_index)
        assert score >= 85.0
        assert status == "duplicate"

        # Fresh unique candidate
        fresh_candidate = {
            "company_name": "Zenith Oceanic Commercial FZE",
            "website": "https://www.zenith-oceanic-9821.com",
            "country": "Singapore",
            "phones": "+65 6789 1234",
        }
        fresh_score, fresh_status = compute_match_probability(fresh_candidate, existing_mongo_index)
        assert fresh_score <= 25.0
        assert fresh_status == "unique"

    def test_api_crawl_now_endpoint_with_region_and_depth(self, client, monkeypatch):
        monkeypatch.setattr("app.routes.api.start_importer_scrape", lambda *args, **kwargs: 999)
        resp = client.post("/api/scrape/crawl-now", json={
            "lead_type": "importer",
            "region": "European Union (Rotterdam, Hamburg)",
            "commodity": "Refined Cane Sugar ICUMSA 45",
            "depth": 35,
        })
        assert resp.status_code == 202
        data = resp.get_json()
        assert data["status"] == "pending"
        assert data["job_id"] == 999
        assert "Depth: 35 records" in data["message"]
