"""Tests for Flask API endpoints (TDD: Write tests FIRST)."""
import json
import pytest


class TestDashboardRoute:
    """Test the main dashboard HTML page."""

    def test_dashboard_returns_200(self, client):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_dashboard_contains_title(self, client):
        resp = client.get("/")
        assert b"Rice Lead Engine" in resp.data or b"Dashboard" in resp.data


class TestLeadsAPI:
    """Test the /api/leads endpoints."""

    def test_get_leads_empty(self, client):
        resp = client.get("/api/leads")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "leads" in data
        assert isinstance(data["leads"], list)

    def test_create_lead_via_api(self, client, app, sample_lead_data):
        resp = client.post(
            "/api/leads",
            data=json.dumps(sample_lead_data),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["lead"]["company_name"] == "Al Fazal Rice Trading LLC"

        # Cleanup
        from app.models import db, Lead
        with app.app_context():
            Lead.query.filter_by(company_name="Al Fazal Rice Trading LLC").delete()
            db.session.commit()

    def test_get_leads_with_data(self, client, app, sample_lead_data):
        # Create a lead first
        client.post(
            "/api/leads",
            data=json.dumps(sample_lead_data),
            content_type="application/json",
        )
        resp = client.get("/api/leads")
        data = resp.get_json()
        assert len(data["leads"]) >= 1

        # Cleanup
        from app.models import db, Lead
        with app.app_context():
            Lead.query.filter_by(company_name="Al Fazal Rice Trading LLC").delete()
            db.session.commit()

    def test_get_leads_filter_by_type(self, client, app, sample_lead_data, sample_mill_data):
        client.post("/api/leads", data=json.dumps(sample_lead_data), content_type="application/json")
        client.post("/api/leads", data=json.dumps(sample_mill_data), content_type="application/json")

        resp = client.get("/api/leads?lead_type=importer")
        data = resp.get_json()
        for lead in data["leads"]:
            assert lead["lead_type"] == "importer"

        resp = client.get("/api/leads?lead_type=wb_mill")
        data = resp.get_json()
        for lead in data["leads"]:
            assert lead["lead_type"] == "wb_mill"

        # Cleanup
        from app.models import db, Lead
        with app.app_context():
            Lead.query.delete()
            db.session.commit()

    def test_get_leads_filter_by_country(self, client, app, sample_lead_data):
        client.post("/api/leads", data=json.dumps(sample_lead_data), content_type="application/json")

        resp = client.get("/api/leads?country=United+Arab+Emirates")
        data = resp.get_json()
        assert len(data["leads"]) >= 1

        resp = client.get("/api/leads?country=Japan")
        data = resp.get_json()
        assert len(data["leads"]) == 0

        # Cleanup
        from app.models import db, Lead
        with app.app_context():
            Lead.query.delete()
            db.session.commit()

    def test_get_leads_search(self, client, app, sample_lead_data):
        client.post("/api/leads", data=json.dumps(sample_lead_data), content_type="application/json")

        resp = client.get("/api/leads?search=Fazal")
        data = resp.get_json()
        assert len(data["leads"]) >= 1

        resp = client.get("/api/leads?search=xyztotallynotexist")
        data = resp.get_json()
        assert len(data["leads"]) == 0

        # Cleanup
        from app.models import db, Lead
        with app.app_context():
            Lead.query.delete()
            db.session.commit()

    def test_get_single_lead(self, client, app, sample_lead_data):
        resp = client.post("/api/leads", data=json.dumps(sample_lead_data), content_type="application/json")
        lead_id = resp.get_json()["lead"]["id"]

        resp = client.get(f"/api/leads/{lead_id}")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["lead"]["company_name"] == "Al Fazal Rice Trading LLC"

        # Cleanup
        from app.models import db, Lead
        with app.app_context():
            Lead.query.delete()
            db.session.commit()

    def test_get_nonexistent_lead(self, client):
        resp = client.get("/api/leads/99999")
        assert resp.status_code == 404

    def test_delete_lead(self, client, app, sample_lead_data):
        resp = client.post("/api/leads", data=json.dumps(sample_lead_data), content_type="application/json")
        lead_id = resp.get_json()["lead"]["id"]

        resp = client.delete(f"/api/leads/{lead_id}")
        assert resp.status_code == 200

        resp = client.get(f"/api/leads/{lead_id}")
        assert resp.status_code == 404


class TestDashboardStatsAPI:
    """Test the /api/dashboard/stats endpoint."""

    def test_stats_returns_200(self, client):
        resp = client.get("/api/dashboard/stats")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "total_leads" in data
        assert "importers_count" in data
        assert "wb_mills_count" in data
        assert "countries" in data

    def test_stats_counts_correct(self, client, app, sample_lead_data, sample_mill_data):
        client.post("/api/leads", data=json.dumps(sample_lead_data), content_type="application/json")
        client.post("/api/leads", data=json.dumps(sample_mill_data), content_type="application/json")

        resp = client.get("/api/dashboard/stats")
        data = resp.get_json()
        assert data["total_leads"] >= 2
        assert data["importers_count"] >= 1
        assert data["wb_mills_count"] >= 1

        # Cleanup
        from app.models import db, Lead
        with app.app_context():
            Lead.query.delete()
            db.session.commit()


class TestExportCSVAPI:
    """Test the CSV export endpoint."""

    def test_export_csv(self, client, app, sample_lead_data):
        client.post("/api/leads", data=json.dumps(sample_lead_data), content_type="application/json")

        resp = client.get("/api/leads/export")
        assert resp.status_code == 200
        assert resp.content_type == "text/csv; charset=utf-8"
        assert b"company_name" in resp.data
        assert b"Al Fazal Rice Trading LLC" in resp.data

        # Cleanup
        from app.models import db, Lead
        with app.app_context():
            Lead.query.delete()
            db.session.commit()

    def test_export_csv_empty(self, client):
        resp = client.get("/api/leads/export")
        assert resp.status_code == 200
        # Should still have headers
        assert b"company_name" in resp.data


class TestScrapeAPI:
    """Test the scrape trigger endpoints."""

    def test_trigger_importer_scrape(self, client):
        resp = client.post("/api/scrape/importers")
        assert resp.status_code in (200, 202)
        data = resp.get_json()
        assert "job_id" in data or "message" in data

    def test_trigger_wb_mills_scrape(self, client):
        resp = client.post("/api/scrape/wb-mills")
        assert resp.status_code in (200, 202)

    def test_trigger_scrape_all(self, client):
        resp = client.post("/api/scrape/all")
        assert resp.status_code in (200, 202)
        data = resp.get_json()
        assert "importer_job_id" in data
        assert "wb_mills_job_id" in data

    def test_get_scrape_status(self, client):
        resp = client.get("/api/scrape/status")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "jobs" in data


class TestSeedDataAPI:
    """Test the seed data loading endpoint."""

    def test_seed_importers(self, client, app):
        resp = client.post("/api/seed/importers")
        assert resp.status_code in (200, 201)
        data = resp.get_json()
        assert data["count"] > 0

        # Cleanup
        from app.models import db, Lead
        with app.app_context():
            Lead.query.filter_by(lead_type="importer").delete()
            db.session.commit()

    def test_seed_wb_mills(self, client, app):
        resp = client.post("/api/seed/wb-mills")
        assert resp.status_code in (200, 201)
        data = resp.get_json()
        assert data["count"] > 0

        # Cleanup
        from app.models import db, Lead
        with app.app_context():
            Lead.query.filter_by(lead_type="wb_mill").delete()
            db.session.commit()

