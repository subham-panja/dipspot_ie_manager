"""
tests/test_integration.py
End-to-end integration tests for Rice Lead Engine Flask Application.
"""
import json
import pytest
from app.models import db, Lead, ScrapeJob


class TestFullLifecycleIntegration:
    """Test full application lifecycle from seeding to filtering and export."""

    def test_seed_and_stats_workflow(self, client):
        # 1. Initially database should have 0 leads
        resp = client.get("/api/dashboard/stats")
        assert resp.status_code == 200
        assert resp.get_json()["total_leads"] == 0

        # 2. Seed 35 Importers
        resp = client.post("/api/seed/importers")
        assert resp.status_code == 201
        assert resp.get_json()["count"] == 35

        # 3. Check stats updated
        resp = client.get("/api/dashboard/stats")
        data = resp.get_json()
        assert data["total_leads"] == 35
        assert data["importers_count"] == 35
        assert data["wb_mills_count"] == 0
        assert any(c["name"] == "United Arab Emirates" for c in data["countries"])
        assert any(c["name"] == "Saudi Arabia" for c in data["countries"])
        assert any(c["name"] == "Qatar" for c in data["countries"])

        # 4. Seed 30 WB Mills
        resp = client.post("/api/seed/wb-mills")
        assert resp.status_code == 201
        assert resp.get_json()["count"] == 30

        # 5. Total should now be 65
        resp = client.get("/api/dashboard/stats")
        data = resp.get_json()
        assert data["total_leads"] == 65
        assert data["importers_count"] == 35
        assert data["wb_mills_count"] == 30

    def test_deduplication_on_repeated_seeding(self, client):
        # First seed
        client.post("/api/seed/importers")
        client.post("/api/seed/wb-mills")

        # Second seed should detect existing entities and insert 0 duplicates
        resp2_imp = client.post("/api/seed/importers")
        assert resp2_imp.get_json()["count"] == 0

        resp2_mills = client.post("/api/seed/wb-mills")
        assert resp2_mills.get_json()["count"] == 0

        # Total remains 65
        resp = client.get("/api/dashboard/stats")
        assert resp.get_json()["total_leads"] == 65

    def test_search_and_district_filtering(self, client):
        # Seed all
        client.post("/api/seed/importers")
        client.post("/api/seed/wb-mills")

        # Search for Sonik Industries
        resp = client.get("/api/leads?search=Sonik")
        data = resp.get_json()
        assert data["total"] == 1
        lead = data["leads"][0]
        assert "Sonik Industries" in lead["company_name"]
        assert lead["gstin"] == "19AFEFS8977B1ZH"
        assert lead["lead_type"] == "wb_mill"
        assert lead["district"] == "Nadia"

        # Filter by Burdwan district
        resp = client.get("/api/leads?district=Bardhaman")
        data = resp.get_json()
        assert data["total"] > 0
        for l in data["leads"]:
            assert "Bardhaman" in l["district"] or "Burdwan" in l["district"]

    def test_csv_export_content(self, client):
        client.post("/api/seed/importers")
        client.post("/api/seed/wb-mills")

        # Export importers only
        resp = client.get("/api/leads/export?lead_type=importer")
        assert resp.status_code == 200
        text = resp.data.decode("utf-8")
        assert "LuLu Group International" in text
        assert "Sonik Industries" not in text

        # Export mills only
        resp = client.get("/api/leads/export?lead_type=wb_mill")
        assert resp.status_code == 200
        text = resp.data.decode("utf-8")
        assert "Sonik Industries" in text
        assert "LuLu Group" not in text

