"""Pytest configuration and shared fixtures."""
import os
import sys
import tempfile

import pytest

# Ensure the project root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope="session")
def app():
    """Create the Flask application for testing."""
    # Set test environment variables before importing app
    os.environ["FLASK_SECRET_KEY"] = "test-secret-key"
    os.environ["FLASK_ENV"] = "testing"
    os.environ["MONGO_DB_NAME"] = "trade_suite_test"
    os.environ["RESPECT_ROBOTS_TXT"] = "false"
    os.environ["CRAWL_COMPANY_WEBSITES"] = "false"
    os.environ["VALIDATE_EMAIL_MX"] = "false"
    os.environ["REQUEST_DELAY_SECONDS"] = "0"
    os.environ["GOOGLE_PLACES_API_KEY"] = ""

    # Use a temp database
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

    from app.factory import create_app
    app = create_app(testing=True)

    with app.app_context():
        from app.models import db
        db.create_all()

    yield app

        # Cleanup
    with app.app_context():
        from app.models import db
        db.drop_all()
    os.close(db_fd)
    os.unlink(db_path)


def pytest_sessionfinish(session, exitstatus):
    """Drop the test MongoDB database once all test sessions complete."""
    try:
        from pymongo import MongoClient
        c = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
        c.drop_database("trade_suite_test")
    except Exception:
        pass


@pytest.fixture(autouse=True)
def clean_db(app):
    """Clean all tables and MongoDB test collections before each test to guarantee complete test isolation."""
    from app.models import db
    from app.db import get_db
    with app.app_context():
        db.session.rollback()
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()

        try:
            mongo_db = get_db()
            for col in [
                "leads",
                "deals",
                "shipments",
                "campaigns",
                "customer_segments",
                "dispatched_messages",
                "contacts",
                "company_contacts",
                "lead_notes",
                "campaign_enrollments",
                "omnichannel_messages",
                "cadence_enrollments",
                "chatwoot_conversation_meta",
                "chatwoot_webhook_deliveries",
            ]:
                mongo_db[col].delete_many({})
        except Exception:
            pass
    yield


@pytest.fixture
def client(app):
    """Flask test client."""
    return app.test_client()


@pytest.fixture
def db_session(app):
    """Database session for testing."""
    from app.models import db
    with app.app_context():
        yield db.session
        db.session.rollback()


@pytest.fixture
def sample_lead_data():
    """Sample lead data dictionary."""
    return {
        "company_name": "Al Fazal Rice Trading LLC",
        "country": "United Arab Emirates",
        "city_or_hub": "Al Ras, Deira, Dubai",
        "contact_person": "Rice Wholesale Desk",
        "phones": "+971586363615",
        "emails": "info@alfazalrice.com",
        "website": "alfazalrice.com",
        "address": "Al Ras, Deira, Dubai, UAE",
        "matched_varieties": "rice; parboiled; non-basmati",
        "priority_score": 90,
        "source_url": "https://exportmandi.com/rice-importers-in-dubai-uae/",
        "lead_type": "importer",
    }


@pytest.fixture
def sample_mill_data():
    """Sample West Bengal rice mill data."""
    return {
        "company_name": "Sonik Industries LLP",
        "country": "India",
        "city_or_hub": "Nadia",
        "contact_person": "Export & Mill Desk",
        "phones": "+919775976251",
        "emails": "",
        "website": "",
        "address": "Ghetugachhi, Chakdaha - 741222, Nadia, West Bengal",
        "matched_varieties": "Silky Miniket; Swarna; Ratna; IR-64",
        "priority_score": 95,
        "source_url": "https://www.wbrma.com/list-of-members",
        "lead_type": "wb_mill",
        "gstin": "19AFEFS8977B1ZH",
        "state": "West Bengal",
        "district": "Nadia",
    }

