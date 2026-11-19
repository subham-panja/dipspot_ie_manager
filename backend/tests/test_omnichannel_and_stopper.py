import pytest
from app.factory import create_app
from app.db import get_db, now_iso
from app.smtp_stopper import SmtpQuotaManager
from app.followup_engine import FollowUpEngine
from app.routes.omnichannel import classify_inbound_intent, generate_ai_smart_draft


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture(autouse=True)
def clean_test_collections():
    db = get_db()
    # Reset stopper tracker
    db.system_config.delete_one({"_id": "smtp_quota_tracker"})
    # Seed a test lead if none exists
    lead = db.leads.find_one({"id": 9999})
    if not lead:
        db.leads.insert_one({
            "id": 9999,
            "company_name": "Test Global Traders LLC",
            "country": "United Arab Emirates",
            "emails": "procurement@testglobal-uae.com",
            "phones": "+971501234567",
            "category": "importer",
            "score": 85,
            "pipeline_status": "new",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })
    yield
    # Cleanup test lead
    db.leads.delete_one({"id": 9999})
    db.campaigns.delete_many({"campaign_id": {"$regex": "^TEST-CAMP-"}})
    db.cadence_enrollments.delete_many({"lead_id": 9999})
    db.omnichannel_threads.delete_many({"lead_id": 9999})
    db.system_config.delete_one({"_id": "smtp_quota_tracker"})


# ==============================================================================
# 1. SMTP QUOTA & HARD-BREAK STOPPER TESTS
# ==============================================================================

def test_smtp_stopper_initialization_and_status():
    status = SmtpQuotaManager.get_status()
    assert status["sent_today"] == 0
    assert status["daily_limit"] == 450
    assert status["is_hard_stopped"] is False
    assert status["remaining"] == 450
    assert "window_resets_in" in status


def test_smtp_stopper_record_send_and_quota_breach():
    db = get_db()
    # Configure low quota for testing
    SmtpQuotaManager.configure_quota(daily_limit=5)

    can_send, _ = SmtpQuotaManager.check_can_send()
    assert can_send is True

    # Record 4 sends
    SmtpQuotaManager.record_send(count=4)
    status = SmtpQuotaManager.get_status()
    assert status["sent_today"] == 4
    assert status["is_hard_stopped"] is False

    # 5th send hits ceiling -> auto hard-break
    SmtpQuotaManager.record_send(count=1)
    status = SmtpQuotaManager.get_status()
    assert status["sent_today"] == 5
    assert status["is_hard_stopped"] is True
    assert "limit" in status["stop_reason"].lower()

    # Further sending attempts are blocked
    can_send, reason = SmtpQuotaManager.check_can_send()
    assert can_send is False
    assert "HARD-STOPPED" in reason


def test_smtp_stopper_campaign_freeze_and_resume():
    db = get_db()
    # Create an active email campaign
    camp_id = "TEST-CAMP-001"
    db.campaigns.insert_one({
        "campaign_id": camp_id,
        "name": "Test Rice Export Blast",
        "channel": "Email",
        "status": "Active",
        "enrolled_leads_count": 10,
        "created_at": now_iso(),
    })

    # Trigger emergency hard break
    SmtpQuotaManager.trigger_hard_break(
        reason="Test manual emergency freeze",
        error_details="SMTP 550 User sending limit exceeded",
    )

    c = db.campaigns.find_one({"campaign_id": camp_id})
    assert c["status"] == "Hard-Stopped (SMTP Quota Exceeded)"
    assert "Test manual emergency freeze" in c["hard_stop_reason"]

    # Verify check_can_send blocks
    can_send, reason = SmtpQuotaManager.check_can_send()
    assert can_send is False

    # Resume and clear hard break
    res = SmtpQuotaManager.resume_and_clear_hard_break()
    assert res["resumed"] is True
    assert res["campaigns_resumed"] >= 1

    c_resumed = db.campaigns.find_one({"campaign_id": camp_id})
    assert c_resumed["status"] == "Active"

    # Counter reset
    reset_stat = SmtpQuotaManager.reset_counter()
    assert reset_stat["sent_today"] == 0
    assert reset_stat["is_hard_stopped"] is False


# ==============================================================================
# 2. AUTOMATED CADENCE & CENTRALIZED AUTO-PAUSE TESTS
# ==============================================================================

def test_cadences_initialization_and_enrollment():
    cadences = FollowUpEngine.get_cadences()
    assert len(cadences) >= 1
    c = cadences[0]
    assert c["cadence_id"] == "CAD-COMMERCIAL-OUTREACH"
    assert len(c["steps"]) == 4

    # Enroll test lead
    enrollment = FollowUpEngine.enroll_lead(lead_id=9999, cadence_id="CAD-COMMERCIAL-OUTREACH")
    assert enrollment["lead_id"] == 9999
    assert enrollment["current_step"] == 1
    assert enrollment["status"] == "Active"
    assert enrollment["has_replied"] is False


def test_cadence_due_followups_execution():
    FollowUpEngine.enroll_lead(lead_id=9999, cadence_id="CAD-COMMERCIAL-OUTREACH")
    result = FollowUpEngine.execute_due_followups()
    assert result["processed_count"] >= 1

    # Verify enrollment stepped forward to step 2
    db = get_db()
    enr = db.cadence_enrollments.find_one({"lead_id": 9999})
    assert enr["current_step"] == 2
    assert len(enr["execution_history"]) >= 1
    assert enr["execution_history"][0]["step"] == 1


def test_centralized_auto_pause_on_client_reply():
    db = get_db()
    FollowUpEngine.enroll_lead(lead_id=9999, cadence_id="CAD-COMMERCIAL-OUTREACH")

    enr_before = db.cadence_enrollments.find_one({"lead_id": 9999})
    assert enr_before["status"] == "Active"

    # Customer replies via WhatsApp
    FollowUpEngine.pause_on_client_reply(
        lead_id=9999,
        reply_channel="WhatsApp",
        message_text="Hello, we received your proposal. What is your CIF price for 500 MT to Jebel Ali?",
    )

    enr_after = db.cadence_enrollments.find_one({"lead_id": 9999})
    assert enr_after["status"] == "Paused (Client Replied)"
    assert enr_after["has_replied"] is True
    assert enr_after["last_reply_channel"] == "WhatsApp"
    assert "AUTO_PAUSE_ON_REPLY" in [h["action"] for h in enr_after["execution_history"]]


# ==============================================================================
# 3. AI INTENT CLASSIFICATION & SMART DRAFT GENERATION
# ==============================================================================

def test_ai_inbound_intent_classifier():
    rfq_text = "Please send us your latest price list and quotation for 2 containers of IR-64 parboiled rice CIF Dubai."
    res = classify_inbound_intent(rfq_text)
    assert "RFQ" in res["intent"] or "Commercial Intent" in res["intent"]
    assert res["sentiment"] == "Positive"
    assert res["urgency"] == "High"

    stop_text = "Please unsubscribe us and stop sending emails. We do not import rice."
    res_stop = classify_inbound_intent(stop_text)
    assert "Unsubscribe" in res_stop["intent"]
    assert res_stop["sentiment"] == "Negative"

    nego_text = "Your rate is too high. Can you give a discount of $20 per ton if we confirm 1,000 MT?"
    res_nego = classify_inbound_intent(nego_text)
    assert "Negotiation" in res_nego["intent"]


def test_ai_smart_draft_generation():
    thread_data = {
        "lead_name": "Al-Dhiyafa Foodstuff Trading",
        "contact_person": "Tariq Mansoor",
        "lead_country": "United Arab Emirates",
        "latest_intent": "RFQ / Price Inquiry",
        "latest_inbound_text": "What is the best CIF rate for 100 MT basmati rice?",
    }
    draft = generate_ai_smart_draft(thread_data, channel="WhatsApp")
    assert "Al-Dhiyafa Foodstuff Trading" in draft or "Tariq Mansoor" in draft or "CIF" in draft
    assert len(draft) > 50


# ==============================================================================
# 4. API HTTP ENDPOINT INTEGRATION TESTS
# ==============================================================================

def test_campaign_smtp_stopper_api_endpoints(client):
    # GET status
    r = client.get("/api/campaigns/smtp-stopper/status")
    assert r.status_code == 200
    assert "status" in r.get_json()

    # POST manual hard-break
    r_hb = client.post("/api/campaigns/smtp-stopper/hard-break", json={"reason": "Test freeze"})
    assert r_hb.status_code == 200
    assert r_hb.get_json()["status"]["is_hard_stopped"] is True

    # Broadcast campaign should be blocked with 429
    db = get_db()
    camp_id = "TEST-CAMP-002"
    db.campaigns.insert_one({
        "campaign_id": camp_id,
        "name": "Test Frozen Broadcast",
        "channel": "Email",
        "status": "Active",
        "enrolled_leads_count": 5,
        "created_at": now_iso(),
    })
    r_bc = client.post(f"/api/campaigns/{camp_id}/broadcast")
    assert r_bc.status_code == 429
    assert "Gmail SMTP Stopper" in r_bc.get_json()["error"]

    # Resume
    r_res = client.post("/api/campaigns/smtp-stopper/resume")
    assert r_res.status_code == 200
    assert r_res.get_json()["status"]["is_hard_stopped"] is False


def test_omnichannel_threads_and_inbound_webhook(client):
    # Send inbound webhook from client
    payload = {
        "lead_id": 9999,
        "channel": "WhatsApp",
        "sender": "+971501234567",
        "message_text": "Hello, we want to buy 500 MT of parboiled rice. Please send CIF pricing.",
    }
    r = client.post("/api/omnichannel/inbound", json=payload)
    assert r.status_code == 201
    data = r.get_json()
    assert data["success"] is True
    assert "RFQ" in data["classification"]["intent"] or "Commercial Intent" in data["classification"]["intent"]

    # Verify cadence was auto-paused
    db = get_db()
    enr = db.cadence_enrollments.find_one({"lead_id": 9999})
    if enr:
        assert enr["has_replied"] is True

    # List threads
    r_threads = client.get("/api/omnichannel/threads")
    assert r_threads.status_code == 200
    threads = r_threads.get_json()["threads"]
    assert any(t["lead_id"] == 9999 for t in threads)


def test_whatsapp_legal_status_endpoint(client):
    r = client.get("/api/omnichannel/whatsapp/legal-status")
    assert r.status_code == 200
    info = r.get_json()
    assert "legal_analysis" in info
    assert "architectural_recommendation" in info
    assert "safeguards_implemented" in info
