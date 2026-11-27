"""M2 Integration Tests — Omnichannel Routes, Outage Replay, Global Pull Sync & Chatwoot Status."""

import hashlib
import hmac
import os

import httpx
import pytest

from app.db import get_db, now_iso
from app.smtp_stopper import SmtpQuotaManager
from tests.test_chatwoot_integration import _MockChatwootTransport, _enable_cw, _insert_lead


@pytest.fixture
def cw_mock(monkeypatch):
    transport = _MockChatwootTransport()
    orig_init = httpx.Client.__init__

    def _patched_init(self, *args, **kwargs):
        kwargs.setdefault("transport", transport)
        return orig_init(self, *args, **kwargs)

    monkeypatch.setattr(httpx.Client, "__init__", _patched_init)
    return transport


@pytest.fixture(autouse=True)
def _isolate_routes(app, monkeypatch):
    for k in list(os.environ.keys()):
        if k.startswith("CHATWOOT_") or k.startswith("WHATSAPP_"):
            monkeypatch.delenv(k, raising=False)
    with app.app_context():
        db = get_db()
        db.system_config.delete_one({"_id": "smtp_quota_tracker"})
        db.system_config.update_one({"_id": "singleton_config"}, {"$unset": {"chatwoot": "", "whatsapp": ""}})
    yield


def test_threads_no_auto_seed_and_harmonized_schema_with_cadence_state(client):
    db = get_db()
    _insert_lead(db, 701, emails="buyer701@gulfrice.ae", phones="+971501112233")
    r_empty = client.get("/api/omnichannel/threads")
    assert r_empty.status_code == 200
    assert r_empty.get_json()["threads"] == []
    assert db.omnichannel_messages.count_documents({}) == 0

    db.omnichannel_messages.insert_one({
        "message_id": "MSG-701", "lead_id": 701, "company_name": "Co 701", "channel": "WhatsApp",
        "direction": "inbound", "content": "Send CIF quote", "intent": "High Commercial Intent (RFQ)",
        "sentiment": "Positive", "urgency": "High", "timestamp": now_iso(), "chatwoot_synced": True,
        "chatwoot_conversation_id": 555, "chatwoot_contact_id": 666, "is_visitor_thread": False,
    })
    db.cadence_enrollments.insert_one({"enrollment_id": "ENR-701", "lead_id": 701, "status": "Paused (Client Replied)", "has_replied": True, "updated_at": now_iso()})
    _enable_cw(client)

    threads = client.get("/api/omnichannel/threads").get_json()["threads"]
    assert len(threads) == 1
    t = threads[0]
    for key in ("lead_id", "thread_id", "latest_message", "last_message", "intent", "latest_intent", "latest_timestamp", "last_activity_at", "cadence_status", "cadence_paused", "chatwoot_conversation_id", "chatwoot_contact_id", "chatwoot_synced", "chatwoot_url", "badge_color"):
        assert key in t
    assert t["cadence_paused"] is True
    assert t["cadence_status"] == "Paused (Client Replied)"
    assert t["chatwoot_url"].endswith("/app/accounts/1/conversations/555")

    det = client.get("/api/omnichannel/threads/701").get_json()
    assert det["chatwoot"]["conversation_id"] == 555
    assert det["chatwoot"]["url"].endswith("/app/accounts/1/conversations/555")


def test_visitor_thread_detail_reply_ai_draft_and_404(client, cw_mock):
    _enable_cw(client)
    db = get_db()
    assert client.get("/api/omnichannel/threads/cw_conv_9999").status_code == 404
    assert client.post("/api/omnichannel/threads/cw_conv_9999/reply", json={"channel": "Website", "content": "Hi"}).status_code == 404
    assert client.post("/api/omnichannel/threads/cw_conv_9999/ai-draft", json={"channel": "Website"}).status_code == 404

    cw_mock.conversations[888] = {"id": 888, "inbox_id": 12, "channel": "Channel::WebWidget", "status": "open", "contact_id": 321, "meta": {"sender": {"id": 321, "name": "Web Guest"}}, "messages": []}
    db.chatwoot_conversation_meta.insert_one({"conversation_id": 888, "contact_id": 321, "visitor_thread_id": "cw_conv_888", "is_visitor_thread": True, "conversation_status": "open", "channel": "Website", "updated_at": now_iso()})
    db.omnichannel_messages.insert_one({"message_id": "CW-IN-888", "lead_id": "cw_conv_888", "chatwoot_conversation_id": 888, "chatwoot_contact_id": 321, "channel": "Website", "direction": "inbound", "content": "Need CIF pricing", "is_visitor_thread": True, "chatwoot_synced": True, "timestamp": now_iso()})

    det = client.get("/api/omnichannel/threads/cw_conv_888").get_json()
    assert det["is_visitor_thread"] is True
    assert det["chatwoot"]["conversation_id"] == 888
    assert det["chatwoot"]["contact_id"] == 321
    assert det["chatwoot"]["synced"] is True
    assert det["chatwoot"]["url"].endswith("/app/accounts/1/conversations/888")

    r_draft = client.post("/api/omnichannel/threads/cw_conv_888/ai-draft", json={"channel": "Website"})
    assert r_draft.status_code == 200 and r_draft.get_json()["channel"] == "Website"

    r_rep = client.post("/api/omnichannel/threads/cw_conv_888/reply", json={"channel": "Website", "content": "Live desk reply"})
    assert r_rep.status_code == 200
    assert r_rep.get_json()["record"]["chatwoot_synced"] is True
    assert len(cw_mock.conversations[888]["messages"]) == 1


def test_reply_content_attributes_smtp_429_ai_draft_and_legal_analysis(client, cw_mock):
    _enable_cw(client)
    db = get_db()
    _insert_lead(db, 702, company_name="Al Fazal Rice", emails="buyer702@alfazal.ae", phones="+971502223344", matched_varieties="1121 Basmati", nearest_port="Jebel Ali")
    SmtpQuotaManager.configure_quota(daily_limit=1)

    r_email = client.post("/api/omnichannel/threads/702/reply", json={"channel": "Email", "subject": "SCO Offer", "content": "Attached offer"})
    assert r_email.status_code == 200
    rec = r_email.get_json()["record"]
    assert rec["chatwoot_synced"] is True and rec["chatwoot_message_id"] is not None
    cw_msg = cw_mock.conversations[rec["chatwoot_conversation_id"]]["messages"][0]
    assert cw_msg["content_attributes"]["email"]["subject"] == "SCO Offer"
    assert cw_msg["content_attributes"]["tradepulse_message_id"] == rec["message_id"]
    assert db.chatwoot_conversation_meta.find_one({"lead_id": 702})["conversation_id"] == rec["chatwoot_conversation_id"]

    # 2nd email hits SMTP 429 hard stop; WhatsApp & Website still succeed
    r_429 = client.post("/api/omnichannel/threads/702/dispatch", json={"channel": "Email", "content": "Blocked"})
    assert r_429.status_code == 429 and r_429.get_json()["error"] == "GMAIL_SMTP_HARD_STOPPED"
    assert client.post("/api/omnichannel/threads/702/dispatch", json={"channel": "WhatsApp", "content": "WA ping"}).status_code == 200
    assert client.post("/api/omnichannel/threads/702/dispatch", json={"channel": "Website", "content": "Web ping"}).status_code == 200

    # Channel-aware AI drafts differ across all 3 channels (seed inbound RFQ)
    db.omnichannel_messages.insert_one({"message_id": "IN-702", "lead_id": 702, "channel": "Email", "direction": "inbound", "content": "Please quote CIF Jebel Ali for 5 containers", "timestamp": now_iso()})
    d_email = client.post("/api/omnichannel/threads/702/ai-draft", json={"channel": "Email"}).get_json()["draft_content"]
    d_wa = client.post("/api/omnichannel/threads/702/ai-draft", json={"channel": "WhatsApp"}).get_json()["draft_content"]
    d_web = client.post("/api/omnichannel/threads/702/ai-draft", json={"channel": "Website"}).get_json()["draft_content"]
    assert "Dear" in d_email and d_email != d_wa and d_wa != d_web and "Live Desk" in d_web

    for ep in ("/api/omnichannel/whatsapp/status", "/api/omnichannel/whatsapp/legal-status"):
        st = client.get(ep)
        assert st.status_code == 200 and "legal_analysis" in st.get_json()


def test_offline_outage_replay_and_global_pull_sync_no_dupes(client, cw_mock):
    _enable_cw(client)
    db = get_db()
    _insert_lead(db, 703, emails="buyer703@gulfrice.ae")

    cw_mock.fault_mode = "connect_error"
    r1 = client.post("/api/omnichannel/threads/703/reply", json={"channel": "Email", "subject": "Offline 1", "content": "Queued 1"})
    r2 = client.post("/api/omnichannel/threads/703/reply", json={"channel": "WhatsApp", "content": "Queued 2"})
    assert r1.status_code == 200 and r1.get_json()["record"]["chatwoot_synced"] is False
    assert r2.status_code == 200 and r2.get_json()["record"]["chatwoot_synced"] is False

    cw_mock.fault_mode = None
    sync_res = client.post("/api/omnichannel/chatwoot/sync").get_json()
    assert sync_res["success"] is True and sync_res["synced"] >= 1
    msgs = list(db.omnichannel_messages.find({"lead_id": 703}))
    assert len(msgs) == 2 and all(m["chatwoot_synced"] is True and m.get("chatwoot_message_id") is not None for m in msgs)
    conv_id = msgs[0]["chatwoot_conversation_id"]
    assert len(cw_mock.conversations[conv_id]["messages"]) == 2


def test_global_pull_correlates_leads_status_union_and_widget_config(client, cw_mock):
    _enable_cw(client)
    db = get_db()
    _insert_lead(db, 704, company_name="Lead 704", emails="lead704@alfazal.ae")
    _insert_lead(db, 705, company_name="Lead 705 (no msgs)", emails="lead705@alfazal.ae")

    # Sync message-less lead 705 -> status synced_threads union must include it!
    assert client.post("/api/omnichannel/threads/705/sync").status_code == 200
    st = client.get("/api/omnichannel/chatwoot/status").get_json()
    assert st["reachable"] is True and st["synced_threads"] >= 1
    assert st["channels"] == {"email": True, "whatsapp": True, "website": True}
    assert st["channel_details"]["email"]["status"] == "Active"

    # Seed 1 matched conversation & 1 visitor conversation (empty inline messages -> forces list_messages())
    cw_mock.conversations[950] = {"id": 950, "inbox_id": 10, "channel": "Channel::Email", "status": "open", "contact_id": 401, "meta": {"sender": {"id": 401, "email": "lead704@alfazal.ae", "identifier": "tradepulse_lead_704"}}, "messages": [{"id": 9501, "message_type": "incoming", "content": "Matched inquiry"}]}
    cw_mock.conversations[951] = {"id": 951, "inbox_id": 12, "channel": "Channel::WebWidget", "status": "open", "contact_id": 402, "meta": {"sender": {"id": 402, "name": "Anon 951"}}, "messages": []}
    cw_mock.separate_messages[951] = [{"id": 9511, "message_type": "incoming", "content": "Visitor ping"}]

    pull = client.post("/api/omnichannel/chatwoot/sync").get_json()
    assert pull["pulled_messages"] >= 2
    assert db.omnichannel_messages.find_one({"chatwoot_message_id": 9501})["lead_id"] == 704
    assert db.omnichannel_messages.find_one({"chatwoot_message_id": 9511})["lead_id"] == "cw_conv_951"

    convs = client.get("/api/omnichannel/chatwoot/conversations").get_json()
    by_id = {c["id"]: c for c in convs["conversations"]}
    assert by_id[950]["tradepulse_lead_id"] == 704 and by_id[950]["thread_id"] == "704"
    assert by_id[951]["tradepulse_lead_id"] is None and by_id[951]["thread_id"] == "cw_conv_951"

    wc = client.get("/api/omnichannel/chatwoot/widget-config?identifier=user-42").get_json()
    expected_hash = hmac.new(b"hmac_sec_m2", b"user-42", hashlib.sha256).hexdigest()
    assert wc["enabled"] is True and wc["identifier_hash"] == expected_hash
    for forbidden in ("api_access_token", "webhook_secret", "website_hmac_secret"):
        assert forbidden not in wc
