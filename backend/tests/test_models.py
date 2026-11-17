"""Tests for app.models — Database models (TDD: Write tests FIRST)."""
import pytest
from datetime import datetime, timezone


class TestLeadModel:
    """Test the Lead database model."""

    def test_create_importer_lead(self, app, sample_lead_data):
        from app.models import db, Lead
        with app.app_context():
            lead = Lead(**sample_lead_data)
            db.session.add(lead)
            db.session.commit()

            fetched = Lead.query.filter_by(company_name="Al Fazal Rice Trading LLC").first()
            assert fetched is not None
            assert fetched.country == "United Arab Emirates"
            assert fetched.lead_type == "importer"
            assert fetched.priority_score == 90
            db.session.delete(fetched)
            db.session.commit()

    def test_create_wb_mill_lead(self, app, sample_mill_data):
        from app.models import db, Lead
        with app.app_context():
            lead = Lead(**sample_mill_data)
            db.session.add(lead)
            db.session.commit()

            fetched = Lead.query.filter_by(company_name="Sonik Industries LLP").first()
            assert fetched is not None
            assert fetched.lead_type == "wb_mill"
            assert fetched.gstin == "19AFEFS8977B1ZH"
            assert fetched.district == "Nadia"
            db.session.delete(fetched)
            db.session.commit()

    def test_lead_has_timestamps(self, app, sample_lead_data):
        from app.models import db, Lead
        with app.app_context():
            lead = Lead(**sample_lead_data)
            db.session.add(lead)
            db.session.commit()

            assert lead.created_at is not None
            assert lead.updated_at is not None
            db.session.delete(lead)
            db.session.commit()

    def test_lead_to_dict(self, app, sample_lead_data):
        from app.models import db, Lead
        with app.app_context():
            lead = Lead(**sample_lead_data)
            db.session.add(lead)
            db.session.commit()

            d = lead.to_dict()
            assert isinstance(d, dict)
            assert d["company_name"] == "Al Fazal Rice Trading LLC"
            assert d["country"] == "United Arab Emirates"
            assert "id" in d
            db.session.delete(lead)
            db.session.commit()

    def test_lead_repr(self, app, sample_lead_data):
        from app.models import Lead
        with app.app_context():
            lead = Lead(**sample_lead_data)
            r = repr(lead)
            assert "Al Fazal Rice Trading LLC" in r


class TestScrapeJobModel:
    """Test the ScrapeJob model for tracking scraping runs."""

    def test_create_scrape_job(self, app):
        from app.models import db, ScrapeJob
        with app.app_context():
            job = ScrapeJob(
                job_type="importer",
                status="pending",
            )
            db.session.add(job)
            db.session.commit()

            fetched = db.session.get(ScrapeJob, job.id)
            assert fetched is not None
            assert fetched.status == "pending"
            assert fetched.job_type == "importer"
            db.session.delete(fetched)
            db.session.commit()

    def test_scrape_job_status_transitions(self, app):
        from app.models import db, ScrapeJob
        with app.app_context():
            job = ScrapeJob(job_type="wb_mill", status="pending")
            db.session.add(job)
            db.session.commit()

            job.status = "running"
            db.session.commit()
            assert job.status == "running"

            job.status = "completed"
            job.leads_found = 42
            db.session.commit()
            assert job.leads_found == 42
            db.session.delete(job)
            db.session.commit()

    def test_scrape_job_to_dict(self, app):
        from app.models import db, ScrapeJob
        with app.app_context():
            job = ScrapeJob(job_type="importer", status="completed", leads_found=10)
            db.session.add(job)
            db.session.commit()

            d = job.to_dict()
            assert d["job_type"] == "importer"
            assert d["leads_found"] == 10
            db.session.delete(job)
            db.session.commit()

