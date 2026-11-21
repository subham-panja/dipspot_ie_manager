import io
import json
import csv
import pytest
from bs4 import BeautifulSoup
from app.factory import create_app
from app.db import get_db, now_iso
from app.real_scraper import RealisticWebScraper
from app.routes.api import CSV_EXPORT_FIELDS


@pytest.fixture
def test_app():
    app = create_app("testing")
    with app.app_context():
        mongo_db = get_db()
        # Seed test data for bulk operations and exports
        mongo_db.leads.delete_many({"job_id": 99999})
        mongo_db.leads.insert_many([
            {
                "id": 999901,
                "company_name": "Gulf Rice Trading FZE",
                "country": "United Arab Emirates",
                "city_or_hub": "Dubai",
                "contact_person": "Rashid Al-Maktoum (Purchase Manager)",
                "phones": "+971 4 2234567",
                "emails": "procurement@gulfrice.ae",
                "website": "https://www.gulfrice.ae",
                "address": "JAFZA South Zone, Dubai, UAE",
                "matched_varieties": "IR-64 Parboiled Rice 5% Broken; 1121 Basmati",
                "hs_codes_applicable": "10063019; 10063090",
                "priority_score": 95,
                "lead_type": "importer",
                "nearest_port": "Jebel Ali Port (AEJEA)",
                "shipment_volume": "1-3 Containers / mo (25-75 MT)",
                "importer_tier": "sme_importer",
                "customs_manifest_data": "Customs B/L Manifest (HS 100630) | Port: Jebel Ali Port (AEJEA)",
                "twitter_url": "https://x.com/gulfrice_uae",
                "linkedin_company_url": "https://www.linkedin.com/company/gulfrice-trading",
                "deal_status": "unassigned",
                "job_id": 99999,
                "is_deleted": False,
                "created_at": now_iso(),
            },
            {
                "id": 999902,
                "company_name": "Bahrain Commercial Grains W.L.L.",
                "country": "Bahrain",
                "city_or_hub": "Manama",
                "contact_person": "Yousuf Kanoo (Procurement)",
                "phones": "+973 17223344",
                "emails": "trade@bahraingrains.bh",
                "website": "https://www.bahraingrains.bh",
                "address": "Mina Salman Industrial Area, Bahrain",
                "matched_varieties": "Non-Basmati Parboiled Rice",
                "hs_codes_applicable": "10063019",
                "priority_score": 88,
                "lead_type": "importer",
                "nearest_port": "Khalifa Bin Salman Port (BHKBS)",
                "shipment_volume": "1-3 Containers / mo (25-75 MT)",
                "importer_tier": "sme_importer",
                "customs_manifest_data": "Customs B/L Manifest (HS 100630) | Port: Khalifa Bin Salman Port (BHKBS)",
                "twitter_url": "https://x.com/bahraingrains",
                "deal_status": "inquiry",
                "job_id": 99999,
                "is_deleted": False,
                "created_at": now_iso(),
            },
            {
                "id": 999903,
                "company_name": "Burdwan Modern Agro Complex Pvt Ltd",
                "country": "India",
                "state": "West Bengal",
                "district": "Burdwan",
                "city_or_hub": "Burdwan Agro Cluster",
                "contact_person": "Amitava Roy (Managing Director)",
                "phones": "+91 9434123456",
                "emails": "sales@burdwanrice.in",
                "website": "https://www.burdwanrice.in",
                "address": "NH-2 Bypass, Burdwan - 713101, West Bengal, India",
                "gstin": "19AABCB1234F1Z9",
                "matched_varieties": "Sortex IR-64 Parboiled; Swarna Raw Rice",
                "hs_codes_applicable": "10063019",
                "priority_score": 92,
                "lead_type": "wb_mill",
                "deal_status": "unassigned",
                "job_id": 99999,
                "is_deleted": False,
                "created_at": now_iso(),
            },
        ])
        yield app
        mongo_db.leads.delete_many({"job_id": 99999})


def test_osint_social_profile_extraction():
    """Verify that crawl_contact_details extracts Twitter/X, LinkedIn, Facebook, and Instagram handles."""
    scraper = RealisticWebScraper()
    test_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Arabian Grain Imports LLC - Dubai Contact</title>
        <meta property="og:site_name" content="Arabian Grain Imports LLC" />
    </head>
    <body>
        <header>
            <h1>Arabian Grain Imports LLC</h1>
        </header>
        <div>
            <p>Contact Person: Khalid Al-Sayed</p>
            <p>Office: JAFZA Gate 4, Jebel Ali, Dubai, UAE</p>
            <a href="mailto:trade@arabiangrains.ae">trade@arabiangrains.ae</a>
            <a href="tel:+97148812345">+971 4 881 2345</a>
        </div>
        <footer>
            <a href="https://twitter.com/arabiangrain">Twitter / X</a>
            <a href="https://www.linkedin.com/company/arabian-grain-imports">LinkedIn Profile</a>
            <a href="https://www.facebook.com/arabiangrainsofficial">Facebook</a>
            <a href="https://www.instagram.com/arabiangrains">Instagram</a>
            <p>&copy; 2024 Arabian Grain Imports LLC. All Rights Reserved.</p>
        </footer>
    </body>
    </html>
    """

    # Mock fetch_page to return our test_html
    original_fetch = scraper.fetch_page
    scraper.fetch_page = lambda url, timeout=4.0, polite_jitter=False: (test_html, 200, 0.05)

    try:
        details = scraper.crawl_contact_details("https://www.arabiangrains.ae")
        assert details["legal_name"] == "Arabian Grain Imports LLC"
        assert details["contact_person"] == "Khalid Al-Sayed"
        assert "trade@arabiangrains.ae" in details["emails"]
        assert any("97148812345" in p.replace(" ", "") for p in details["phones"])
        assert details["twitter_url"] == "https://x.com/arabiangrain"
        assert details["linkedin_company_url"] == "https://www.linkedin.com/company/arabian-grain-imports"
        assert details["facebook_url"] == "https://www.facebook.com/arabiangrainsofficial"
        assert details["instagram_url"] == "https://www.instagram.com/arabiangrains"
    finally:
        scraper.fetch_page = original_fetch


def test_twenty_style_filtered_export_csv(test_app):
    """Verify that filtered export CSV only downloads leads matching the query parameters."""
    client = test_app.test_client()
    resp = client.get("/api/leads/export/csv?lead_type=importer&country=Bahrain&job_id=99999")
    assert resp.status_code == 200
    assert resp.mimetype == "text/csv"

    csv_text = resp.data.decode("utf-8")
    reader = csv.DictReader(io.StringIO(csv_text))
    rows = list(reader)
    assert len(rows) == 1
    assert rows[0]["company_name"] == "Bahrain Commercial Grains W.L.L."
    assert rows[0]["country"] == "Bahrain"
    assert rows[0]["nearest_port"] == "Khalifa Bin Salman Port (BHKBS)"
    assert rows[0]["shipment_volume"] == "1-3 Containers / mo (25-75 MT)"
    assert rows[0]["twitter_url"] == "https://x.com/bahraingrains"


def test_twenty_style_selective_ids_export(test_app):
    """Verify selective export by comma-separated lead IDs (Twenty CRM pattern)."""
    client = test_app.test_client()
    # Export only ID 999901 in JSON format
    resp = client.get("/api/leads/export/json?ids=999901")
    assert resp.status_code == 200
    assert resp.mimetype == "application/json"

    data = json.loads(resp.data.decode("utf-8"))
    assert len(data) == 1
    assert data[0]["id"] == 999901
    assert data[0]["company_name"] == "Gulf Rice Trading FZE"
    assert data[0]["twitter_url"] == "https://x.com/gulfrice_uae"


def test_twenty_style_bulk_update(test_app):
    """Verify Twenty-style bulk status update across multiple selected leads."""
    client = test_app.test_client()
    resp = client.post(
        "/api/leads/bulk-update",
        json={"ids": [999901, 999902], "deal_status": "negotiation"},
    )
    assert resp.status_code == 200
    res_data = resp.get_json()
    assert res_data["success"] is True
    assert res_data["modified_count"] == 2

    # Verify directly from database
    mongo_db = get_db()
    lead1 = mongo_db.leads.find_one({"id": 999901})
    lead2 = mongo_db.leads.find_one({"id": 999902})
    assert lead1["deal_status"] == "negotiation"
    assert lead2["deal_status"] == "negotiation"


def test_twenty_style_bulk_delete(test_app):
    """Verify Twenty-style bulk soft delete across selected leads."""
    client = test_app.test_client()
    resp = client.post(
        "/api/leads/bulk-delete",
        json={"ids": [999901, 999902]},
    )
    assert resp.status_code == 200
    res_data = resp.get_json()
    assert res_data["success"] is True
    assert res_data["deleted_count"] == 2

    mongo_db = get_db()
    lead1 = mongo_db.leads.find_one({"id": 999901})
    lead2 = mongo_db.leads.find_one({"id": 999902})
    assert lead1.get("is_deleted") is True
    assert lead2.get("is_deleted") is True


def test_manual_lead_creation_and_persistence(test_app):
    """Verify manual lead creation persists port, shipment scale, and OSINT handles directly to document store."""
    client = test_app.test_client()
    new_lead_payload = {
        "company_name": "Apex Milled Grain S.A.",
        "country": "Togo",
        "city_or_hub": "Lome",
        "nearest_port": "Autonomous Port of Lome (TGLFW)",
        "shipment_volume": "1-3 Containers / mo (25-75 MT)",
        "importer_tier": "sme_importer",
        "contact_person": "Edem Koffi (Procurement Director)",
        "phones": "+228 90 12 34 56",
        "emails": "procurement@apexgrain.tg",
        "website": "https://www.apexgrain.tg",
        "matched_varieties": "IR-64 Parboiled Rice 5% Broken",
        "lead_type": "importer",
        "twitter_url": "https://x.com/apexgrain_togo",
        "deal_status": "unassigned",
        "job_id": 99999,
    }
    resp = client.post("/api/leads", json=new_lead_payload)
    assert resp.status_code == 201
    created = resp.get_json()["lead"]
    assert created["company_name"] == "Apex Milled Grain S.A."
    assert created["country"] == "Togo"
    assert created["nearest_port"] == "Autonomous Port of Lome (TGLFW)"
    assert created["shipment_volume"] == "1-3 Containers / mo (25-75 MT)"
    assert created["twitter_url"] == "https://x.com/apexgrain_togo"
    assert "wa.me/22890123456" in created["whatsapp_outreach_url"]
