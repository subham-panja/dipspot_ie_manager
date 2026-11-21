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


def test_full_kanban_pipeline_stages_and_order(test_app):
    """Verify that full deal pipeline contains all required Kanban stages in logical order."""
    client = test_app.test_client()
    resp = client.get("/api/pipeline/stages")
    assert resp.status_code == 200
    data = resp.get_json()
    stages = data.get("stages", [])
    stage_ids = [s["stage_id"] for s in stages]

    # Verify all stages from original task are present
    assert "new_lead" in stage_ids
    assert "qualified" in stage_ids
    assert "inquiry" in stage_ids
    assert "price_quoted" in stage_ids
    assert "sample_sent" in stage_ids
    assert "lc_opened" in stage_ids
    assert "closed_won" in stage_ids
    assert "closed_lost" in stage_ids

    # Verify relative order
    assert stage_ids.index("new_lead") < stage_ids.index("qualified")
    assert stage_ids.index("qualified") < stage_ids.index("inquiry")
    assert stage_ids.index("inquiry") < stage_ids.index("price_quoted")
    assert stage_ids.index("price_quoted") < stage_ids.index("sample_sent")
    assert stage_ids.index("sample_sent") < stage_ids.index("lc_opened")
    assert stage_ids.index("lc_opened") < stage_ids.index("closed_won")


def test_pipeline_deal_currency_value_and_activity_logging(test_app):
    """Verify deal creation calculates value_usd, logs stage transitions to notes, and marks lead in_pipeline."""
    client = test_app.test_client()
    deal_payload = {
        "title": "75 MT IR-64 - Gulf Rice Trading FZE",
        "company_name": "Gulf Rice Trading FZE",
        "country": "United Arab Emirates",
        "commodity": "IR-64 Parboiled Rice 5% Broken",
        "quantity_mt": 75,
        "value_usd": 35250.0,
        "incoterm": "CIF Jebel Ali Port",
        "payment_terms": "100% Irrevocable L/C at Sight",
        "stage_id": "qualified",
        "lead_id": 999901,
        "notes": ["Initial customer qualification completed via WhatsApp call"],
    }
    resp = client.post("/api/pipeline/deals", json=deal_payload)
    assert resp.status_code == 201
    deal = resp.get_json()["deal"]
    deal_id = deal["deal_id"]
    assert deal["value_usd"] == 35250.0
    assert deal["stage_id"] == "qualified"

    # Verify lead was marked in_pipeline
    mongo_db = get_db()
    lead = mongo_db.leads.find_one({"id": 999901})
    assert lead["deal_status"] == "in_pipeline"

    # Move stage: qualified -> price_quoted
    patch_resp = client.patch(
        f"/api/pipeline/deals/{deal_id}",
        json={"stage_id": "price_quoted", "note": "CIF quotation $470/MT submitted to buyer desk"},
    )
    assert patch_resp.status_code == 200
    updated_deal = patch_resp.get_json()["deal"]
    assert updated_deal["stage_id"] == "price_quoted"

    # Verify transition logged in notes
    notes = updated_deal.get("notes", [])
    assert any("Stage transitioned" in n for n in notes)
    assert any("CIF quotation" in n for n in notes)

    # Clean up deal
    client.delete(f"/api/pipeline/deals/{deal_id}?permanent=true")


def test_campaign_analytics_bounced_and_interested(test_app):
    """Verify campaign creation and broadcast record sent, opened, replied, bounced, and interested metrics."""
    client = test_app.test_client()
    camp_payload = {
        "name": "West Africa Parboiled Bulk Push",
        "channel": "Email",
        "target_commodity": "IR-64 Parboiled Rice",
        "target_countries": ["Togo", "Ghana", "Benin"],
        "enrolled_leads_count": 50,
    }
    c_resp = client.post("/api/campaigns", json=camp_payload)
    assert c_resp.status_code == 201
    campaign = c_resp.get_json()["campaign"]
    c_id = campaign["campaign_id"]
    assert campaign["bounced_count"] == 0
    assert campaign["interested_count"] == 0

    # Broadcast campaign
    b_resp = client.post(f"/api/campaigns/{c_id}/broadcast")
    assert b_resp.status_code == 200
    b_data = b_resp.get_json()
    assert b_data["sent_count"] == 50
    assert b_data["opened_count"] > 0
    assert b_data["replied_count"] > 0
    assert b_data["bounced_count"] >= 0
    assert b_data["interested_count"] >= 0

    # Verify persisted in database
    mongo_db = get_db()
    saved_camp = mongo_db.campaigns.find_one({"campaign_id": c_id})
    assert saved_camp["sent_count"] == 50
    assert saved_camp["bounced_count"] == b_data["bounced_count"]
    assert saved_camp["interested_count"] == b_data["interested_count"]

    # Clean up campaign
    client.delete(f"/api/campaigns/{c_id}")


def test_whatsapp_outreach_hs_code_and_cif_quote(test_app):
    """Verify that generated WhatsApp outreach URLs contain customized CIF quotes and HS code references."""
    client = test_app.test_client()
    resp = client.get("/api/leads/importers?country=United%20Arab%20Emirates&job_id=99999")
    assert resp.status_code == 200
    importers = resp.get_json()["importers"]
    assert len(importers) >= 1
    uae_lead = importers[0]
    wa_url = uae_lead.get("whatsapp_outreach_url", "")
    assert wa_url.startswith("https://wa.me/")
    # Must reference CIF quote and HS code
    assert "CIF" in wa_url
    assert "1006" in wa_url

