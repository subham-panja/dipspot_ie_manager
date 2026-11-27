"""Opaque-box local HTTP mock Chatwoot v3.16 server, transport router, and DB/env isolation."""

import hashlib
import hmac
import json
import os
import socket
import threading
import time
import urllib.parse
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, List, Optional

import httpx
import pytest
import requests

_ORIG_HTTPX_SYNC_SEND = httpx.Client.send
_ORIG_HTTPX_ASYNC_SEND = httpx.AsyncClient.send
_ORIG_REQUESTS_REQUEST = requests.sessions.Session.request


def _parse_int(val: Any) -> Optional[int]:
    if val is None or isinstance(val, bool):
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None

DEFAULT_INBOXES = [
    {"id": 10, "name": "TradePulse Email", "channel_type": "Channel::Email"},
    {"id": 11, "name": "TradePulse WhatsApp", "channel_type": "Channel::Whatsapp"},
    {"id": 12, "name": "TradePulse Website", "channel_type": "Channel::WebWidget"},
]


def sign_chatwoot_webhook(
    secret: str, raw_body: bytes, timestamp: Optional[int] = None, delivery_id: Optional[str] = None
) -> Dict[str, str]:
    ts = int(time.time()) if timestamp is None else int(timestamp)
    digest = hmac.new(secret.encode("utf-8"), f"{ts}.".encode("utf-8") + raw_body, hashlib.sha256).hexdigest()
    return {
        "X-Chatwoot-Signature": f"sha256={digest}",
        "X-Chatwoot-Timestamp": str(ts),
        "X-Chatwoot-Delivery": delivery_id or f"del-{uuid.uuid4().hex[:12]}",
        "Content-Type": "application/json",
    }


def build_message_created_payload(
    *,
    message_id: int = 5001,
    conversation_id: int = 700,
    inbox_id: int = 10,
    channel_type: str = "Channel::Email",
    message_type: str = "incoming",
    content: str = "Please send CIF price",
    sender: Optional[Dict[str, Any]] = None,
    conversation_status: str = "open",
    content_attributes: Optional[Dict[str, Any]] = None,
    additional_attributes: Optional[Dict[str, Any]] = None,
    custom_attributes: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    sender_doc = sender or {"id": 301, "name": "Gulf Buyer", "email": "buyer@gulfrice.ae"}
    return {
        "event": "message_created",
        "id": message_id,
        "content": content,
        "message_type": message_type,
        "content_type": "text",
        "content_attributes": content_attributes or {},
        "created_at": int(time.time()),
        "sender": sender_doc,
        "inbox": {"id": inbox_id, "name": f"Inbox {inbox_id}", "channel_type": channel_type},
        "conversation": {
            "id": conversation_id,
            "inbox_id": inbox_id,
            "status": conversation_status,
            "channel": channel_type,
            "additional_attributes": additional_attributes or {},
            "custom_attributes": custom_attributes or {},
            "meta": {"sender": sender_doc},
        },
        "account": {"id": 1, "name": "TradePulse EXIM"},
    }


def build_lifecycle_event_payload(
    event: str,
    *,
    conversation_id: int = 700,
    inbox_id: int = 12,
    channel_type: str = "Channel::WebWidget",
    status: str = "open",
    sender: Optional[Dict[str, Any]] = None,
    message_id: int = 5001,
    content: str = "Updated message content",
) -> Dict[str, Any]:
    sender_doc = sender or {"id": 801, "name": "Port Visitor", "identifier": ""}
    if event == "message_updated":
        p = build_message_created_payload(
            message_id=message_id, conversation_id=conversation_id, inbox_id=inbox_id,
            channel_type=channel_type, message_type="incoming", content=content,
            sender=sender_doc, conversation_status=status,
        )
        p["event"] = "message_updated"
        return p
    if event == "webwidget_triggered":
        return {
            "event": "webwidget_triggered", "id": conversation_id, "contact": sender_doc,
            "current_conversation": {"id": conversation_id, "inbox_id": inbox_id, "status": status},
            "source_id": f"src-{conversation_id}",
        }
    return {"event": event, "id": conversation_id, "inbox_id": inbox_id, "status": status, "channel": channel_type, "meta": {"sender": sender_doc}, "messages": []}


class FakeChatwootServer:
    """In-memory Chatwoot v3.16 HTTP server bound to 127.0.0.1:0."""

    def __init__(self, expected_token: str = "cw_test_token_123"):
        self.expected_token = expected_token
        self.inboxes: List[Dict[str, Any]] = [dict(x) for x in DEFAULT_INBOXES]
        self.contacts: Dict[int, Dict[str, Any]] = {}
        self.conversations: Dict[int, Dict[str, Any]] = {}
        self.webhooks: List[Dict[str, Any]] = []
        self.requests_log: List[Dict[str, Any]] = []
        self.fault_mode: str = "healthy"
        self.fault_paths: Dict[str, str] = {}
        self._seq = {"contact": 100, "conv": 200, "msg": 1000, "wh": 10}
        self._lock = threading.Lock()
        parent = self

        class _Handler(BaseHTTPRequestHandler):
            def _send(self, code: int, data: Any):
                raw = json.dumps(data).encode("utf-8")
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)

            def _handle(self, method: str):
                parsed = urllib.parse.urlparse(self.path)
                path, query = parsed.path, urllib.parse.parse_qs(parsed.query)
                length = max(_parse_int(self.headers.get("Content-Length")) or 0, 0)
                raw_body = self.rfile.read(length) if length > 0 else b""
                try:
                    body_json = json.loads(raw_body.decode("utf-8")) if raw_body else {}
                except Exception:
                    body_json = {}
                headers_dict = {k.lower(): v for k, v in self.headers.items()}
                with parent._lock:
                    parent.requests_log.append({"method": method, "path": path, "query": query, "headers": headers_dict, "body_raw": raw_body, "json": body_json})
                if not isinstance(body_json, dict):
                    if method in ("POST", "PUT", "PATCH") and raw_body:
                        self._send(400, {"error": "JSON object required"})
                        return
                    body_json = {}
                code, payload = parent._dispatch(method, path, query, headers_dict, body_json)
                self._send(code, payload)

            def do_GET(self):
                self._handle("GET")

            def do_POST(self):
                self._handle("POST")

            def do_PATCH(self):
                self._handle("PATCH")

            def log_message(self, format, *args):
                return

        self._httpd = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
        self.port = self._httpd.server_address[1]
        self.base_url = f"http://127.0.0.1:{self.port}"
        self._thread = threading.Thread(target=self._httpd.serve_forever, daemon=True)
        self._thread.start()

    def _dispatch(self, method: str, path: str, query: dict, headers: dict, body: dict):
        mode = self.fault_mode
        for pat, pmode in self.fault_paths.items():
            if pat in path:
                mode = pmode
                break
        if mode == "unauthorized_401":
            return 401, {"error": "Unauthorized"}
        if mode == "unprocessable_422":
            return 422, {"message": "Unprocessable Entity"}
        if mode == "server_error_500":
            return 500, {"error": "Internal Server Error"}
        if mode == "timeout":
            time.sleep(0.5)
        if path == "/api" and method == "GET":
            return 200, {"version": "3.16.0", "status": "ok"}
        if path.startswith("/api/v1/"):
            tok = headers.get("api_access_token") or ""
            auth = headers.get("authorization") or ""
            if auth.lower().startswith("bearer "):
                tok = auth[7:].strip()
            if self.expected_token and tok != self.expected_token:
                return 401, {"error": "Invalid api_access_token"}

        parts = [p for p in path.split("/") if p]
        if len(parts) < 5 or parts[:3] != ["api", "v1", "accounts"]:
            return 404, {"error": "Not found"}
        account_id = _parse_int(parts[3])
        if account_id is None:
            return 404, {"error": "Not found"}
        tail = parts[4:]
        with self._lock:
            if tail == ["inboxes"]:
                if method == "GET":
                    return 200, {"payload": self.inboxes}
                if method == "POST":
                    nid = max((i["id"] for i in self.inboxes), default=12) + 1
                    item = {"id": nid, "name": body.get("name", f"Inbox {nid}"), "channel_type": body.get("channel_type", "Channel::WebWidget")}
                    self.inboxes.append(item)
                    return 200, item
            if tail == ["contacts", "search"] and method == "GET":
                q = (query.get("q") or [""])[0].strip().lower()
                matches = [c for c in self.contacts.values() if not q or any(q in str(c.get(k) or "").lower() for k in ("email", "phone_number", "identifier", "name"))]
                return 200, {"payload": matches}
            if tail == ["contacts"]:
                if method == "GET":
                    return 200, {"payload": list(self.contacts.values())}
                if method == "POST":
                    self._seq["contact"] += 1
                    cid = self._seq["contact"]
                    contact = {"id": cid, "name": body.get("name") or "Trade Contact", "email": body.get("email"), "phone_number": body.get("phone_number"), "identifier": body.get("identifier"), "custom_attributes": body.get("custom_attributes") or {}, "contact_inboxes": []}
                    if body.get("inbox_id"):
                        contact["contact_inboxes"].append({"source_id": f"src-{cid}", "inbox": {"id": body["inbox_id"]}})
                    self.contacts[cid] = contact
                    return 200, {"payload": {"contact": contact, "contact_inbox": contact["contact_inboxes"][0] if contact["contact_inboxes"] else {}}}
            if len(tail) == 3 and tail[0] == "contacts" and tail[2] == "contact_inboxes" and method == "POST":
                cid = _parse_int(tail[1])
                inbox_id = _parse_int(body.get("inbox_id") or 12)
                if cid is None or inbox_id is None:
                    return 404, {"error": "Not found"}
                ci = {"source_id": body.get("source_id") or f"src-{cid}-{inbox_id}", "inbox": {"id": inbox_id}}
                if cid in self.contacts:
                    self.contacts[cid].setdefault("contact_inboxes", []).append(ci)
                return 200, ci
            if tail == ["conversations"]:
                if method == "GET":
                    convs = list(self.conversations.values())
                    return 200, {"data": {"payload": convs, "meta": {"all_count": len(convs)}}}
                if method == "POST":
                    cid = _parse_int(body.get("contact_id") or 0)
                    inbox_id = _parse_int(body.get("inbox_id") or 12)
                    if cid is None or inbox_id is None:
                        return 404, {"error": "Not found"}
                    self._seq["conv"] += 1
                    conv_id = self._seq["conv"]
                    sender = self.contacts.get(cid, {"id": cid, "name": "Visitor"})
                    inbox = next((i for i in self.inboxes if i["id"] == inbox_id), {"id": inbox_id, "channel_type": "Channel::WebWidget"})
                    conv = {"id": conv_id, "account_id": account_id, "inbox_id": inbox_id, "channel": inbox["channel_type"], "status": body.get("status") or "open", "contact_id": cid, "meta": {"sender": sender}, "custom_attributes": body.get("custom_attributes") or {}, "messages": []}
                    self.conversations[conv_id] = conv
                    return 200, conv
            if len(tail) >= 2 and tail[0] == "conversations":
                conv_id = _parse_int(tail[1])
                if conv_id is None:
                    return 404, {"error": "Not found"}
                conv = self.conversations.get(conv_id)
                if not conv:
                    return 404, {"error": "Conversation not found"}
                if len(tail) == 2 and method == "GET":
                    return 200, conv
                if len(tail) == 3 and tail[2] == "messages":
                    if method == "GET":
                        return 200, {"payload": conv["messages"]}
                    if method == "POST":
                        self._seq["msg"] += 1
                        msg = {"id": self._seq["msg"], "conversation_id": conv["id"], "inbox_id": conv["inbox_id"], "message_type": body.get("message_type") or "outgoing", "content": body.get("content") or "", "content_attributes": body.get("content_attributes") or {}, "private": bool(body.get("private", False)), "created_at": int(time.time())}
                        conv["messages"].append(msg)
                        return 200, msg
                if len(tail) == 3 and tail[2] == "toggle_status" and method == "POST":
                    conv["status"] = body.get("status") or ("resolved" if conv["status"] == "open" else "open")
                    return 200, {"payload": {"conversation_id": conv["id"], "current_status": conv["status"]}}
            if tail == ["webhooks"]:
                if method == "GET":
                    return 200, {"payload": {"webhooks": self.webhooks}}
                if method == "POST":
                    self._seq["wh"] += 1
                    wh = {"id": self._seq["wh"], "url": body.get("url", ""), "subscriptions": body.get("subscriptions", [])}
                    self.webhooks.append(wh)
                    return 200, {"payload": {"webhook": wh}}
        return 404, {"error": f"Unhandled route {method} {path}"}

    def seed_conversation(
        self, *, conv_id: int = 900, contact_id: int = 400, inbox_id: int = 12,
        channel_type: str = "Channel::WebWidget", name: str = "Seeded Visitor",
        email: Optional[str] = None, phone_number: Optional[str] = None,
        identifier: Optional[str] = None, message_text: str = "Hello, need export specs", status: str = "open",
    ) -> Dict[str, Any]:
        with self._lock:
            contact = {"id": contact_id, "name": name, "email": email, "phone_number": phone_number, "identifier": identifier, "custom_attributes": {}, "contact_inboxes": []}
            self.contacts[contact_id] = contact
            self._seq["msg"] += 1
            msg = {"id": self._seq["msg"], "conversation_id": conv_id, "inbox_id": inbox_id, "message_type": "incoming", "content": message_text, "content_attributes": {}, "created_at": int(time.time())}
            conv = {"id": conv_id, "account_id": 1, "inbox_id": inbox_id, "channel": channel_type, "status": status, "contact_id": contact_id, "meta": {"sender": contact}, "messages": [msg]}
            self.conversations[conv_id] = conv
            return conv

    def close(self):
        self._httpd.shutdown()
        self._httpd.server_close()


def get_unused_local_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def install_httpx_chatwoot_router(
    monkeypatch, server: FakeChatwootServer, closed_port: bool = False, timeout_paths: Optional[List[str]] = None
):
    """Intercept outbound Chatwoot HTTP at the httpx/requests transport boundary."""
    timeout_paths = timeout_paths or []

    def _is_cw(url_str: str) -> bool:
        p = urllib.parse.urlparse(url_str)
        h = (p.hostname or "").lower()
        return (h in ("127.0.0.1", "localhost") and p.port == server.port) or h in ("chatwoot-web", "chatwoot.local", "chatwoot.example.com")

    def _rewrite(url_str: str) -> str:
        p = urllib.parse.urlparse(url_str)
        return urllib.parse.urlunparse(("http", f"127.0.0.1:{server.port}", p.path, p.params, p.query, ""))

    def _sync_send(client_self, request, *args, **kwargs):
        url_str = str(request.url)
        if _is_cw(url_str):
            if closed_port:
                raise httpx.ConnectError("Simulated connection refused", request=request)
            if any(tp in request.url.path for tp in timeout_paths):
                raise httpx.ReadTimeout("Simulated Chatwoot timeout", request=request)
            request.url = httpx.URL(_rewrite(url_str))
        return _ORIG_HTTPX_SYNC_SEND(client_self, request, *args, **kwargs)

    async def _async_send(client_self, request, *args, **kwargs):
        url_str = str(request.url)
        if _is_cw(url_str):
            if closed_port:
                raise httpx.ConnectError("Simulated connection refused", request=request)
            if any(tp in request.url.path for tp in timeout_paths):
                raise httpx.ReadTimeout("Simulated Chatwoot timeout", request=request)
            request.url = httpx.URL(_rewrite(url_str))
        return await _ORIG_HTTPX_ASYNC_SEND(client_self, request, *args, **kwargs)

    def _req(sess_self, method, url, *args, **kwargs):
        url_str = str(url)
        if _is_cw(url_str):
            if closed_port:
                raise requests.ConnectionError("Simulated connection refused")
            if any(tp in urllib.parse.urlparse(url_str).path for tp in timeout_paths):
                raise requests.ReadTimeout("Simulated Chatwoot timeout")
            url = _rewrite(url_str)
        return _ORIG_REQUESTS_REQUEST(sess_self, method, url, *args, **kwargs)

    monkeypatch.setattr(httpx.Client, "send", _sync_send)
    monkeypatch.setattr(httpx.AsyncClient, "send", _async_send)
    monkeypatch.setattr(requests.sessions.Session, "request", _req)


def configure_chatwoot_via_api(client, server: FakeChatwootServer, **overrides) -> Dict[str, Any]:
    payload = {
        "enabled": True, "base_url": server.base_url, "public_url": server.base_url, "account_id": 1,
        "api_access_token": server.expected_token, "webhook_secret": "wh_test_secret_123",
        "website_token": "web_tok_test_123", "website_hmac_secret": "hmac_test_secret",
        "email_inbox_id": 10, "whatsapp_inbox_id": 11, "website_inbox_id": 12,
    }
    payload.update(overrides)
    resp = client.patch("/api/config/chatwoot", data=json.dumps(payload), content_type="application/json")
    assert resp.status_code == 200, resp.get_data(as_text=True)
    return resp.get_json()


@pytest.fixture
def fake_chatwoot_server():
    srv = FakeChatwootServer()
    yield srv
    srv.close()


def _reset_chatwoot_state(app, monkeypatch):
    for key in list(os.environ.keys()):
        if key.startswith("CHATWOOT_") or key.startswith("WHATSAPP_"):
            monkeypatch.delenv(key, raising=False)
    from app.db import get_db
    with app.app_context():
        db = get_db()
        db.system_config.delete_one({"_id": "smtp_quota_tracker"})
        db.system_config.update_one({"_id": "singleton_config"}, {"$unset": {"chatwoot": "", "whatsapp": ""}})
        for col_name in ("system_alerts", "followup_cadences", "omnichannel_messages", "cadence_enrollments"):
            db[col_name].delete_many({})
        for col_name in db.list_collection_names():
            if "chatwoot" in col_name.lower():
                db[col_name].delete_many({})


@pytest.fixture(autouse=True)
def chatwoot_e2e_isolation(app, monkeypatch):
    _reset_chatwoot_state(app, monkeypatch)
    yield
    _reset_chatwoot_state(app, monkeypatch)
