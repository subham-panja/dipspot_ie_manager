"""M2 Integration Tests — ChatwootClient, Webhook Security, Lead Resolution, Lifecycle & DB Indexes."""

import hashlib
import hmac
import json
import os
import re
import time
from typing import Any, Dict, List, Optional

import httpx
import pytest

from app.chatwoot_client import ChatwootClient, compute_hmac, is_non_synthetic_email, normalise_channel
from app.chatwoot_sync import resolve_lead_from_webhook
from app.db import get_db, init_db, now_iso
from app.followup_engine import FollowUpEngine


class _MockChatwootTransport(httpx.BaseTransport):
    """Stateful in-process Chatwoot v3.16 MockTransport for deterministic M2 tests."""

    def __init__(self, expected_token: str = "cw_tok_m2"):
        self.expected_token = expected_token
        self.inboxes: List[Dict[str, Any]] = [
            {"id": 10, "name": "Email Inbox", "channel_type": "Channel::Email"},
            {"id": 11, "name": "WhatsApp Inbox", "channel_type": "Channel::Whatsapp"},
            {"id": 12, "name": "Website Inbox", "channel_type": "Channel::WebWidget"},
        ]
        self.contacts: Dict[int, Dict[str, Any]] = {}
        self.conversations: Dict[int, Dict[str, Any]] = {}
        self.separate_messages: Dict[int, List[Dict[str, Any]]] = {}
        self.webhooks: List[Dict[str, Any]] = []
        self.requests: List[Dict[str, Any]] = []
        self.fault_mode: Optional[str] = None
        self._seq = {"contact": 100, "conv": 200, "msg": 1000, "wh": 10}

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content.decode("utf-8")) if request.content else {}
        self.requests.append({"method": request.method, "path": request.url.path, "json": body})
        if self.fault_mode == "connect_error":
            raise httpx.ConnectError("Connection refused", request=request)
        if self.fault_mode == "timeout":
            raise httpx.ReadTimeout("Timed out", request=request)
        if self.fault_mode in ("401", "422", "500"):
            return httpx.Response(int(self.fault_mode), json={"error": f"Simulated {self.fault_mode}"})
        path, method = request.url.path, request.method
        if path == "/api" and method == "GET":
            return httpx.Response(200, json={"version": "3.16.0", "status": "ok"})
        if path.startswith("/api/v1/") and request.headers.get("api_access_token") != self.expected_token:
            return httpx.Response(401, json={"error": "Unauthorized"})
        tail = [p for p in path.split("/") if p][4:]
        if tail == ["inboxes"]:
            if method == "GET":
                return httpx.Response(200, json={"payload": self.inboxes})
            nid = max((i["id"] for i in self.inboxes), default=12) + 1
            item = {"id": nid, "name": body.get("name"), "channel_type": body.get("channel_type")}
            self.inboxes.append(item)
            return httpx.Response(200, json=item)
        if tail == ["contacts", "search"] and method == "GET":
            q = (request.url.params.get("q") or "").strip().lower()
            matches = [c for c in self.contacts.values() if not q or any(q in str(c.get(k) or "").lower() for k in ("email", "phone_number", "identifier", "name"))]
            return httpx.Response(200, json={"payload": matches})
        if tail == ["contacts"] and method == "POST":
            self._seq["contact"] += 1
            cid = self._seq["contact"]
            c = {"id": cid, "name": body.get("name"), "email": body.get("email"), "phone_number": body.get("phone_number"), "identifier": body.get("identifier"), "custom_attributes": body.get("custom_attributes") or {}, "contact_inboxes": []}
            self.contacts[cid] = c
            return httpx.Response(200, json={"payload": {"contact": c}})
        if len(tail) == 3 and tail[0] == "contacts" and tail[2] == "contact_inboxes" and method == "POST":
            ci = {"source_id": body.get("source_id") or f"src-{tail[1]}", "inbox": {"id": body.get("inbox_id")}}
            if int(tail[1]) in self.contacts:
                self.contacts[int(tail[1])]["contact_inboxes"].append(ci)
            return httpx.Response(200, json=ci)
        if tail == ["conversations"]:
            if method == "GET":
                return httpx.Response(200, json={"data": {"payload": list(self.conversations.values()), "meta": {"all_count": len(self.conversations)}}})
            self._seq["conv"] += 1
            cid = self._seq["conv"]
            contact_id = int(body.get("contact_id") or 0)
            inbox_id = int(body.get("inbox_id") or 12)
            inbox = next((i for i in self.inboxes if i["id"] == inbox_id), {"channel_type": "Channel::WebWidget"})
            conv = {"id": cid, "inbox_id": inbox_id, "channel": inbox["channel_type"], "status": body.get("status") or "open", "contact_id": contact_id, "meta": {"sender": self.contacts.get(contact_id, {"id": contact_id})}, "custom_attributes": body.get("custom_attributes") or {}, "messages": []}
            self.conversations[cid] = conv
            return httpx.Response(200, json=conv)
        if len(tail) >= 2 and tail[0] == "conversations" and int(tail[1]) in self.conversations:
            conv = self.conversations[int(tail[1])]
            if len(tail) == 2 and method == "GET":
                return httpx.Response(200, json=conv)
            if len(tail) == 3 and tail[2] == "messages":
                if method == "GET":
                    return httpx.Response(200, json={"payload": conv["messages"] or self.separate_messages.get(conv["id"], [])})
                self._seq["msg"] += 1
                msg = {"id": self._seq["msg"], "conversation_id": conv["id"], "message_type": body.get("message_type") or "outgoing", "content": body.get("content") or "", "content_attributes": body.get("content_attributes") or {}}
                conv["messages"].append(msg)
                return httpx.Response(200, json=msg)
            if len(tail) == 3 and tail[2] == "toggle_status":
                conv["status"] = body.get("status") or ("resolved" if conv["status"] == "open" else "open")
                return httpx.Response(200, json={"payload": {"conversation_id": conv["id"], "current_status": conv["status"]}})
        if tail == ["webhooks"]:
            if method == "GET":
                return httpx.Response(200, json={"payload": {"webhooks": self.webhooks}})
            self._seq["wh"] += 1
            wh = {"id": self._seq["wh"], "url": body.get("url"), "subscriptions": body.get("subscriptions", [])}
            self.webhooks.append(wh)
            return httpx.Response(200, json={"payload": {"webhook": wh}})
        return httpx.Response(404, json={"error": "Not found"})


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
def _isolate_cw(app, monkeypatch):
    for k in list(os.environ.keys()):
        if k.startswith("CHATWOOT_") or k.startswith("WHATSAPP_"):
            monkeypatch.delenv(k, raising=False)
    with app.app_context():
        db = get_db()
        db.system_config.delete_one({"_id": "smtp_quota_tracker"})
        db.system_config.update_one({"_id": "singleton_config"}, {"$unset": {"chatwoot": "", "whatsapp": ""}})
    yield


def _enable_cw(client, secret: str = "wh_sec_m2"):
    r = client.patch("/api/config/chatwoot", json={
        "enabled": True, "base_url": "http://chatwoot.local", "public_url": "http://localhost:3001",
        "account_id": "1", "api_access_token": "cw_tok_m2", "webhook_secret": secret,
        "website_token": "web_tok_m2", "website_hmac_secret": "hmac_sec_m2",
        "email_inbox_id": "10", "whatsapp_inbox_id": "11", "website_inbox_id": "12",
    })
    assert r.status_code == 200


def _sign_headers(secret: str, raw: bytes, ts: Optional[int] = None, delivery: str = "del-1") -> Dict[str, str]:
    t = int(time.time()) if ts is None else ts
    sig = hmac.new(secret.encode("utf-8"), f"{t}.".encode("utf-8") + raw, hashlib.sha256).hexdigest()
    return {"X-Chatwoot-Signature": f"sha256={sig}", "X-Chatwoot-Timestamp": str(t), "X-Chatwoot-Delivery": delivery, "Content-Type": "application/json"}


def _insert_lead(db, lid: int, **extra) -> Dict[str, Any]:
    doc = {"id": lid, "company_name": f"Co {lid}", "country": "United Arab Emirates", "emails": "", "phones": "", "direct_phone": "", "lead_type": "importer", "deal_status": "new", "is_deleted": False, "created_at": now_iso(), "updated_at": now_iso(), **extra}
    db.leads.insert_one(doc)
    return doc


# ==============================================================================
# Group 1 — ChatwootClient Unit & Contract Tests
# ==============================================================================


@pytest.mark.parametrize("raw,expected", [
    (None, ""), ("", ""), ("  ", ""), ("Channel::Email", "Email"), ("email", "Email"),
    ("Channel::Whatsapp", "WhatsApp"), ("wa", "WhatsApp"), ("Channel::WebWidget", "Website"),
    ("web_widget", "Website"), ("Website Live Chat", "Website"), ("web", "Website"),
])
def test_normalise_channel_null_safe(raw, expected):
    assert normalise_channel(raw) == expected


@pytest.mark.parametrize("email,expected", [
    (None, False), ("", False), ("not-an-email", False), ("trade@corp.ae", False),
    ("procurement@corp.ae", False), ("test@corp.ae", False), ("mock@corp.ae", False),
    ("dummy@corp.ae", False), ("noreply@corp.ae", False), ("no-reply@corp.ae", False),
    ("buyer@example.com", False), ("buyer@example.org", False), ("buyer@sub.example.net", False),
    ("buyer@test.com", False), ("buyer@domain.com", False), ("a@wixpress.com", False),
    ("a@sentry.io", False), ("buyer@gulfrice.ae", True),
])
def test_zero_mock_email_filter(email, expected):
    assert is_non_synthetic_email(email) is expected


def test_client_feature4_crud_id0_split_custom_attrs_and_errors(cw_mock):
    cli = ChatwootClient("http://chatwoot.local", "1", "cw_tok_m2")
    assert cli.healthcheck() == ({"version": "3.16.0", "status": "ok"}, 200)
    assert cli.create_inbox("Custom Inbox", "Channel::Email")[1] == 200
    assert len(cli.list_inboxes()[0]) == 4

    lead0 = {"id": 0, "company_name": "Zero Corp", "emails": "trade@zero.ae; sales@zero.ae, ops@zero.ae", "direct_phone": " ", "phones": "+971500000001; +971500000002", "country": "United Arab Emirates", "lead_type": "importer"}
    cid, created = cli.upsert_contact_for_lead(lead0, inbox_id=10)
    assert created is True and cid is not None
    c_req = next(r for r in cw_mock.requests if r["path"].endswith("/contacts"))
    assert c_req["json"]["identifier"] == "tradepulse_lead_0"
    assert c_req["json"]["email"] == "sales@zero.ae"
    assert c_req["json"]["phone_number"] == "+971500000001"
    assert c_req["json"]["custom_attributes"]["tradepulse_lead_id"] == "0"
    assert "additional_attributes" not in c_req["json"]

    assert cli.create_contact_inbox(cid, 11, source_id="src-0")[1] == 200
    conv_id, conv_created = cli.upsert_conversation_for_lead(lead0, cid, 10, "Email")
    assert conv_created is True and conv_id is not None
    conv_req = next(r for r in cw_mock.requests if r["path"].endswith("/conversations") and r["method"] == "POST")
    assert conv_req["json"]["custom_attributes"]["tradepulse_lead_id"] == "0"
    assert "additional_attributes" not in conv_req["json"]

    msg_res, st = cli.create_message(conv_id, "Offer", content_attributes={"email": {"subject": "SCO"}, "tradepulse_message_id": "M1"})
    assert st == 200 and msg_res["content_attributes"]["email"]["subject"] == "SCO"
    assert len(cli.list_messages(conv_id)[0]) == 1
    assert cli.toggle_status(conv_id, "resolved")[0]["payload"]["current_status"] == "resolved"
    assert cli.register_webhook("http://localhost:5001/api/omnichannel/chatwoot/webhook")[1] == 200
    assert len(cli.list_webhooks()[0]) == 1
    assert compute_hmac("sec", "id-1") == hmac.new(b"sec", b"id-1", hashlib.sha256).hexdigest()

    for mode, exp_st in (("401", 401), ("422", 422), ("500", 500), ("connect_error", 502), ("timeout", 502)):
        cw_mock.fault_mode = mode
        err, code = cli.list_inboxes()
        assert code == exp_st and "error" in err


# ==============================================================================
# Group 2 — Webhook Security, Dedup, Lead Resolution, Lifecycle & DB Indexes
# ==============================================================================


def test_webhook_hmac_timestamp_and_no_unsigned_fallback(client):
    _enable_cw(client, secret="wh_sec_m2")
    payload = {"event": "message_created", "id": 1, "content": "Hi", "message_type": "incoming", "sender": {"email": "x@y.ae"}, "conversation": {"id": 99}}
    raw = json.dumps(payload).encode("utf-8")

    assert client.post("/api/omnichannel/chatwoot/webhook", data=raw, content_type="application/json").status_code == 401
    assert client.post("/api/omnichannel/chatwoot/webhook", data=raw, headers=_sign_headers("wrong", raw)).status_code == 401
    assert client.post("/api/omnichannel/chatwoot/webhook", data=raw, headers=_sign_headers("wh_sec_m2", raw, ts=int(time.time()) - 360)).status_code == 401

    # Timestamped header with raw-only signature (no ts prefix) MUST NOT fall back to unsigned check
    raw_only_sig = hmac.new(b"wh_sec_m2", raw, hashlib.sha256).hexdigest()
    hdrs = {"X-Chatwoot-Signature": f"sha256={raw_only_sig}", "X-Chatwoot-Timestamp": str(int(time.time())), "Content-Type": "application/json"}
    assert client.post("/api/omnichannel/chatwoot/webhook", data=raw, headers=hdrs).status_code == 401
    # Whitespace tamper invalidates signature
    sig_hdrs = _sign_headers("wh_sec_m2", raw)
    assert client.post("/api/omnichannel/chatwoot/webhook", data=raw + b" ", headers=sig_hdrs).status_code == 401


def test_webhook_delivery_id_message_id_and_echo_dedup(client):
    _enable_cw(client, secret="wh_sec_m2")
    db = get_db()
    _insert_lead(db, 401, emails="buyer401@gulfrice.ae")

    p1 = {"event": "message_created", "id": 5101, "content": "Quote please", "message_type": "incoming", "sender": {"email": "buyer401@gulfrice.ae"}, "inbox": {"id": 10, "channel_type": "Channel::Email"}, "conversation": {"id": 701, "status": "open"}}
    r1 = json.dumps(p1).encode("utf-8")
    assert client.post("/api/omnichannel/chatwoot/webhook", data=r1, headers=_sign_headers("wh_sec_m2", r1, delivery="del-dup-1")).status_code == 200
    assert client.post("/api/omnichannel/chatwoot/webhook", data=r1, headers=_sign_headers("wh_sec_m2", r1, delivery="del-dup-1")).get_json()["note"] == "duplicate delivery skipped"
    assert client.post("/api/omnichannel/chatwoot/webhook", data=r1, headers=_sign_headers("wh_sec_m2", r1, delivery="del-dup-2")).get_json()["note"] == "duplicate skipped"
    assert db.omnichannel_messages.count_documents({"lead_id": 401}) == 1

    # Outbound echo with tradepulse_message_id is suppressed
    db.omnichannel_messages.insert_one({"message_id": "RPL-EM-ECHO1", "lead_id": 401, "channel": "Email", "direction": "outbound", "content": "Sent", "timestamp": now_iso(), "chatwoot_synced": True})
    p_echo = {"event": "message_created", "id": 5102, "content": "Sent", "message_type": "outgoing", "content_attributes": {"tradepulse_message_id": "RPL-EM-ECHO1"}, "sender": {"email": "buyer401@gulfrice.ae"}, "conversation": {"id": 701}}
    r_echo = json.dumps(p_echo).encode("utf-8")
    assert client.post("/api/omnichannel/chatwoot/webhook", data=r_echo, headers=_sign_headers("wh_sec_m2", r_echo, delivery="del-echo")).get_json()["note"] == "echo suppressed"


def test_resolve_lead_all_paths_exact_email_and_geo_phone_isolation(app):
    with app.app_context():
        db = get_db()
        _insert_lead(db, 10, country="Togo", phones="+228 90 11 22 33", direct_phone="")
        _insert_lead(db, 20, country="India", phones="+91 90 11 22 33", direct_phone="")
        _insert_lead(db, 30, country="United Arab Emirates", emails="ba@b.com", phones="+971501234567", direct_phone="")
        db.chatwoot_conversation_meta.insert_one({"conversation_id": 880, "contact_id": 990, "lead_id": 30, "updated_at": now_iso()})
        db.omnichannel_messages.insert_one({"message_id": "M-881", "lead_id": 10, "chatwoot_conversation_id": 881, "is_visitor_thread": False, "timestamp": now_iso()})
        db.contacts.insert_one({"contact_id": "CNT-1", "norm_email": "c1@rice.tg", "email": "c1@rice.tg", "phone": "+22891000011"})
        db.company_contacts.insert_one({"lead_id": 10, "contact_id": "CNT-1"})

        assert resolve_lead_from_webhook(db, {"conversation": {"id": 1, "custom_attributes": {"tradepulse_lead_id": "30"}}})["id"] == 30
        assert resolve_lead_from_webhook(db, {"sender": {"identifier": "tradepulse_lead_10"}})["id"] == 10
        assert resolve_lead_from_webhook(db, {"event": "conversation_status_changed", "id": 880, "meta": {"sender": {"id": 1}}})["id"] == 30
        assert resolve_lead_from_webhook(db, {"sender": {"id": 990}, "conversation": {"id": 999}})["id"] == 30
        assert resolve_lead_from_webhook(db, {"event": "message_created", "conversation": {"id": 881}})["id"] == 10
        # Substring email a@b.co MUST NOT match ba@b.com
        assert resolve_lead_from_webhook(db, {"sender": {"email": "a@b.co"}}) is None
        assert resolve_lead_from_webhook(db, {"sender": {"email": "BA@B.COM"}})["id"] == 30
        assert resolve_lead_from_webhook(db, {"sender": {"email": "c1@rice.tg"}})["id"] == 10
        # Country-safe phone matching (Togo vs India sharing same local 8 digits!)
        assert resolve_lead_from_webhook(db, {"sender": {"phone_number": "+22890112233"}})["id"] == 10
        assert resolve_lead_from_webhook(db, {"sender": {"phone_number": "+9190112233"}})["id"] == 20
        assert resolve_lead_from_webhook(db, {"sender": {"phone_number": "+23490112233"}}) is None  # Nigeria must NOT match Togo/India!
        assert resolve_lead_from_webhook(db, {"sender": {"phone_number": "+971501234567"}})["id"] == 30


def test_lifecycle_no_synthetic_msgs_message_updated_and_cadence_safety(client):
    _enable_cw(client, secret="wh_sec_m2")
    db = get_db()
    _insert_lead(db, 501, emails="buyer501@gulfrice.ae")
    db.cadence_enrollments.insert_many([
        {"enrollment_id": "E-ACT", "lead_id": 501, "status": "Active", "has_replied": False, "updated_at": now_iso()},
        {"enrollment_id": "E-CMP", "lead_id": 501, "status": "Completed", "has_replied": False, "updated_at": now_iso()},
    ])

    events = [
        {"event": "conversation_created", "id": 750, "inbox_id": 10, "status": "open", "channel": "Channel::Email", "meta": {"sender": {"id": 601, "email": "buyer501@gulfrice.ae"}}},
        {"event": "message_created", "id": 6101, "content": "Hello", "message_type": "incoming", "sender": {"id": 601, "email": "buyer501@gulfrice.ae"}, "inbox": {"id": 10, "channel_type": "Channel::Email"}, "conversation": {"id": 750, "status": "open"}},
        {"event": "message_updated", "id": 6101, "content": "Need CIF price for 5 containers", "message_type": "incoming", "sender": {"id": 601}, "inbox": {"id": 10, "channel_type": "Channel::Email"}, "conversation": {"id": 750, "status": "open"}},
        {"event": "conversation_updated", "id": 750, "status": "pending", "meta": {"sender": {"id": 601}}},
        {"event": "conversation_status_changed", "id": 750, "status": "resolved", "meta": {"sender": {"id": 601}}},
        {"event": "webwidget_triggered", "id": 750, "contact": {"id": 601}, "current_conversation": {"id": 750, "inbox_id": 12, "status": "open"}},
    ]
    for idx, ev in enumerate(events):
        raw = json.dumps(ev).encode("utf-8")
        assert client.post("/api/omnichannel/chatwoot/webhook", data=raw, headers=_sign_headers("wh_sec_m2", raw, delivery=f"del-lc-{idx}")).status_code == 200

    msgs = list(db.omnichannel_messages.find({"lead_id": 501}))
    assert len(msgs) == 1
    assert msgs[0]["content"] == "Need CIF price for 5 containers"
    assert "High Commercial Intent" in msgs[0]["intent"]
    assert not any("[Chatwoot event:" in m.get("content", "") for m in msgs)
    assert db.cadence_enrollments.find_one({"enrollment_id": "E-ACT"})["status"] == "Paused (Client Replied)"
    assert db.cadence_enrollments.find_one({"enrollment_id": "E-CMP"})["status"] == "Completed"

    # Anonymous Website visitor isolated from db.leads
    vis = {"event": "message_created", "id": 6201, "content": "Hi live chat", "message_type": "incoming", "sender": {"id": 9001, "name": "Anon"}, "inbox": {"id": 12, "channel_type": "Channel::WebWidget"}, "conversation": {"id": 799, "status": "open"}}
    r_vis = json.dumps(vis).encode("utf-8")
    assert client.post("/api/omnichannel/chatwoot/webhook", data=r_vis, headers=_sign_headers("wh_sec_m2", r_vis, delivery="del-vis")).status_code == 200
    assert db.leads.count_documents({}) == 1
    assert db.omnichannel_messages.find_one({"lead_id": "cw_conv_799"})["is_visitor_thread"] is True


def test_db_init_indexes_and_nullable_chatwoot_message_id(app):
    with app.app_context():
        db = get_db()
        init_db(db)
        msg_idx = db.omnichannel_messages.index_information()
        assert any(v["key"] == [("chatwoot_message_id", 1)] and not v.get("unique") for v in msg_idx.values())
        assert any(v["key"] == [("message_id", 1)] and not v.get("unique") for v in msg_idx.values())
        assert any(v["key"] == [("lead_id", 1), ("timestamp", 1)] for v in msg_idx.values())
        meta_idx = db.chatwoot_conversation_meta.index_information()
        assert any(v["key"] == [("conversation_id", 1)] for v in meta_idx.values())
        del_idx = db.chatwoot_webhook_deliveries.index_information()
        assert any(v["key"] == [("delivery_id", 1)] and v.get("unique") for v in del_idx.values())
        # Two offline messages with chatwoot_message_id=None must insert cleanly
        db.omnichannel_messages.insert_one({"message_id": "OFF-1", "lead_id": 1, "chatwoot_message_id": None, "timestamp": now_iso()})
        db.omnichannel_messages.insert_one({"message_id": "OFF-2", "lead_id": 1, "chatwoot_message_id": None, "timestamp": now_iso()})
        assert db.omnichannel_messages.count_documents({"lead_id": 1}) == 2
