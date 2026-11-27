"""HTTP route tests for /api/config/chatwoot*, /api/config/whatsapp, and /api/config/chatwoot/test."""
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest.mock import MagicMock, patch

import httpx
import pytest


@pytest.fixture(autouse=True)
def isolate_chatwoot_and_whatsapp_config(app, monkeypatch):
    """Ensure system_config chatwoot/whatsapp fields and env vars are clean per test."""
    from app.db import get_db

    for key in list(os.environ.keys()):
        if key.startswith("CHATWOOT_") or key.startswith("WHATSAPP_"):
            monkeypatch.delenv(key, raising=False)

    with app.app_context():
        mongo_db = get_db()
        mongo_db.system_config.update_one(
            {"_id": "singleton_config"},
            {"$unset": {"chatwoot": "", "whatsapp": ""}},
        )

    yield

    with app.app_context():
        mongo_db = get_db()
        mongo_db.system_config.update_one(
            {"_id": "singleton_config"},
            {"$unset": {"chatwoot": "", "whatsapp": ""}},
        )


# ============================================================================
# 1. Chatwoot Config & Widget HTTP Endpoints
# ============================================================================


def test_get_chatwoot_unconfigured_defaults(client):
    resp = client.get("/api/config/chatwoot")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["configured"] is False
    assert data["enabled"] is False
    assert data["base_url"] == "http://localhost:3001"
    assert data["public_url"] == "http://localhost:3001"
    assert data["account_id"] == "1"
    assert data["has_api_token"] is False
    assert data["masked_api_token"] == ""
    assert data["has_webhook_secret"] is False
    assert data["has_website_hmac_secret"] is False
    assert data["channels"] == {"email": False, "whatsapp": False, "website": False}
    for forbidden in ("api_access_token", "webhook_secret", "website_hmac_secret"):
        assert forbidden not in data


def test_patch_and_post_chatwoot_persistence_and_secret_masking(app, client):
    from app.config import get_chatwoot_config

    api_secret = "cw_api_token_super_secret_1234"
    webhook_secret = "cw_wh_secret_5678"
    hmac_secret = "cw_hmac_secret_9012"

    resp = client.patch(
        "/api/config/chatwoot",
        json={
            "enabled": True,
            "base_url": "http://chatwoot-web:3000/",
            "public_url": "https://inbox.tradepulse.local/",
            "account_id": 3,
            "email_inbox_id": "10",
            "whatsapp_inbox_id": "20",
            "website_inbox_id": "30",
            "website_token": "pub_widget_tok_xyz",
            "api_access_token": api_secret,
            "webhook_secret": webhook_secret,
            "website_hmac_secret": hmac_secret,
        },
    )
    assert resp.status_code == 200
    body_text = resp.get_data(as_text=True)
    assert api_secret not in body_text
    assert webhook_secret not in body_text
    assert hmac_secret not in body_text

    data = resp.get_json()
    assert data["configured"] is True
    assert data["enabled"] is True
    assert data["base_url"] == "http://chatwoot-web:3000"
    assert data["public_url"] == "https://inbox.tradepulse.local"
    assert data["account_id"] == "3"
    assert data["has_api_token"] is True
    assert data["masked_api_token"] == "••••••••1234"
    assert data["has_webhook_secret"] is True
    assert data["masked_webhook_secret"] == "••••••••5678"
    assert data["has_website_hmac_secret"] is True
    assert data["masked_website_hmac_secret"] == "••••••••9012"
    assert data["channels"] == {"email": True, "whatsapp": True, "website": True}
    for forbidden in ("api_access_token", "webhook_secret", "website_hmac_secret"):
        assert forbidden not in data

    # POST alias also updates cleanly
    post_resp = client.post("/api/config/chatwoot", json={"account_id": "4"})
    assert post_resp.status_code == 200
    assert post_resp.get_json()["account_id"] == "4"

    # GET reflects persisted values without exposing secrets
    get_resp = client.get("/api/config/chatwoot")
    assert get_resp.status_code == 200
    get_text = get_resp.get_data(as_text=True)
    assert api_secret not in get_text
    assert webhook_secret not in get_text
    assert hmac_secret not in get_text

    with app.app_context():
        raw = get_chatwoot_config(include_secrets=True)
        assert raw["api_access_token"] == api_secret
        assert raw["webhook_secret"] == webhook_secret
        assert raw["website_hmac_secret"] == hmac_secret


def test_get_chatwoot_widget_config_and_secret_exclusion(client):
    # Disabled when unconfigured
    resp = client.get("/api/config/chatwoot/widget")
    assert resp.status_code == 200
    assert resp.get_json() == {
        "enabled": False,
        "base_url": "http://localhost:3001",
        "website_token": "",
        "hmac_enabled": False,
    }

    # Enabled with website_token + public_url + hmac_secret (never exposes secrets)
    client.patch(
        "/api/config/chatwoot",
        json={
            "enabled": True,
            "base_url": "http://chatwoot-web:3000",
            "public_url": "https://chat.tradepulse.example",
            "website_token": "website_pub_tok_123",
            "api_access_token": "super_secret_api_key_xyz",
            "webhook_secret": "super_secret_wh_xyz",
            "website_hmac_secret": "super_secret_hmac_xyz",
        },
    )
    widget_resp = client.get("/api/config/chatwoot/widget")
    assert widget_resp.status_code == 200
    raw_text = widget_resp.get_data(as_text=True)
    assert "super_secret" not in raw_text
    widget_data = widget_resp.get_json()
    assert widget_data == {
        "enabled": True,
        "base_url": "https://chat.tradepulse.example",
        "website_token": "website_pub_tok_123",
        "hmac_enabled": True,
    }


# ============================================================================
# 2. Chatwoot Connection Test Endpoint (Offline, Mocked, & Real HTTPServer)
# ============================================================================


def test_chatwoot_connection_offline_connect_error_and_timeout(client):
    for exc in (httpx.ConnectError("connection refused"), httpx.TimeoutException("timed out")):
        mock_http = MagicMock()
        mock_http.__enter__.return_value = mock_http
        mock_http.get.side_effect = exc

        with patch("app.routes.config_routes.httpx.Client", return_value=mock_http):
            resp = client.post("/api/config/chatwoot/test", json={"base_url": "http://127.0.0.1:39999"})

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is False
        assert data["reachable"] is False
        assert data["status_code"] is None
        assert data["inboxes"] == []
        assert "unreachable" in data["message"].lower()


def test_chatwoot_connection_reachable_without_token(client):
    api_resp = MagicMock(status_code=200)
    api_resp.json.return_value = {"version": "3.16.0"}
    mock_http = MagicMock()
    mock_http.__enter__.return_value = mock_http
    mock_http.get.return_value = api_resp

    with patch("app.routes.config_routes.httpx.Client", return_value=mock_http):
        resp = client.post("/api/config/chatwoot/test", json={"base_url": "http://localhost:3001"})

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert data["reachable"] is True
    assert data["status_code"] == 200
    assert data["inboxes"] == []


def test_chatwoot_connection_reachable_with_token_and_inboxes(client):
    client.patch(
        "/api/config/chatwoot",
        json={
            "base_url": "http://chatwoot-web:3000",
            "account_id": "2",
            "api_access_token": "cw_valid_token_9999",
        },
    )

    api_resp = MagicMock(status_code=200)
    api_resp.json.return_value = {"version": "3.16.0"}
    inboxes_resp = MagicMock(status_code=200)
    inboxes_resp.json.return_value = {
        "payload": [
            {"id": 1, "name": "EXIM Support Email", "channel_type": "Channel::Email", "extra": "ignored"},
            {"id": 2, "name": "WhatsApp Desk", "channel_type": "Channel::Whatsapp"},
            {"id": 3, "name": "Website Live Chat", "channel_type": "Channel::WebWidget"},
        ]
    }

    mock_http = MagicMock()
    mock_http.__enter__.return_value = mock_http
    mock_http.get.side_effect = [api_resp, inboxes_resp]

    with patch("app.routes.config_routes.httpx.Client", return_value=mock_http):
        resp = client.post("/api/config/chatwoot/test", json={})

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert data["reachable"] is True
    assert data["status_code"] == 200
    assert data["inboxes"] == [
        {"id": 1, "name": "EXIM Support Email", "channel_type": "Channel::Email"},
        {"id": 2, "name": "WhatsApp Desk", "channel_type": "Channel::Whatsapp"},
        {"id": 3, "name": "Website Live Chat", "channel_type": "Channel::WebWidget"},
    ]
    assert mock_http.get.call_args_list[0].args[0] == "http://chatwoot-web:3000/api"
    assert mock_http.get.call_args_list[1].args[0] == "http://chatwoot-web:3000/api/v1/accounts/2/inboxes"
    assert mock_http.get.call_args_list[1].kwargs["headers"] == {"api_access_token": "cw_valid_token_9999"}


def test_chatwoot_connection_rejected_token_401(client):
    api_resp = MagicMock(status_code=200)
    api_resp.json.return_value = {"version": "3.16.0"}
    inboxes_resp = MagicMock(status_code=401)
    mock_http = MagicMock()
    mock_http.__enter__.return_value = mock_http
    mock_http.get.side_effect = [api_resp, inboxes_resp]

    with patch("app.routes.config_routes.httpx.Client", return_value=mock_http):
        resp = client.post(
            "/api/config/chatwoot/test",
            json={"base_url": "http://localhost:3001", "api_access_token": "bad_token_1234"},
        )

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is False
    assert data["reachable"] is True
    assert data["status_code"] == 401
    assert data["inboxes"] == []


def test_chatwoot_connection_ephemeral_http_server_roundtrip(client):
    received_headers = {}

    class _StubChatwootHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == "/api":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"version": "3.16.0"}).encode("utf-8"))
                return
            if self.path == "/api/v1/accounts/5/inboxes":
                received_headers["token"] = self.headers.get("api_access_token")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(
                    json.dumps(
                        {"payload": [{"id": 9, "name": "Live Web", "channel_type": "Channel::WebWidget"}]}
                    ).encode("utf-8")
                )
                return
            self.send_response(404)
            self.end_headers()

        def log_message(self, format, *args):
            return

    server = HTTPServer(("127.0.0.1", 0), _StubChatwootHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        resp = client.post(
            "/api/config/chatwoot/test",
            json={
                "base_url": f"http://127.0.0.1:{port}",
                "account_id": "5",
                "api_access_token": "local_test_token_42",
            },
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is True
        assert data["reachable"] is True
        assert data["status_code"] == 200
        assert data["inboxes"] == [{"id": 9, "name": "Live Web", "channel_type": "Channel::WebWidget"}]
        assert received_headers["token"] == "local_test_token_42"
    finally:
        server.shutdown()
        server.server_close()


# ============================================================================
# 3. WhatsApp Config Endpoint
# ============================================================================


def test_get_whatsapp_unconfigured_zero_hardcoded_tokens(client):
    resp = client.get("/api/config/whatsapp")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["configured"] is False
    assert data["provider"] == "meta_cloud_api"
    assert data["phone_number_id"] == ""
    assert data["business_account_id"] == ""
    assert data["has_access_token"] is False
    assert data["masked_access_token"] == ""
    assert data["has_webhook_verify_token"] is False
    assert data["masked_webhook_verify_token"] == ""
    assert "EAAB" not in resp.get_data(as_text=True)
    assert "access_token" not in data
    assert "webhook_verify_token" not in data


def test_patch_and_post_whatsapp_persistence_aliases_masking_and_clearing(app, client):
    from app.config import get_whatsapp_config

    token_v1 = "meta_real_access_token_1111"
    verify_tok = "wa_verify_secret_2222"

    # Supports canonical access_token
    resp = client.patch(
        "/api/config/whatsapp",
        json={
            "provider": "meta_cloud_api",
            "phone_number_id": "1234567890",
            "business_account_id": "9988776655",
            "webhook_url": "https://api.tradepulse.example/api/omnichannel/whatsapp/webhook",
            "personal_daily_cap": 75,
            "typing_delay_jitter": "3000ms - 6000ms",
            "auto_stop_opt_out": False,
            "access_token": token_v1,
            "webhook_verify_token": verify_tok,
        },
    )
    assert resp.status_code == 200
    text = resp.get_data(as_text=True)
    assert token_v1 not in text
    assert verify_tok not in text
    data = resp.get_json()
    assert data["configured"] is True
    assert data["personal_daily_cap"] == 75
    assert data["auto_stop_opt_out"] is False
    assert data["has_access_token"] is True
    assert data["masked_access_token"] == "••••••••1111"
    assert data["has_webhook_verify_token"] is True
    assert data["masked_webhook_verify_token"] == "••••••••2222"

    # Preserves token on empty/masked update
    preserve = client.patch(
        "/api/config/whatsapp",
        json={"personal_daily_cap": 60, "access_token": "••••••••1111", "webhook_verify_token": ""},
    )
    assert preserve.status_code == 200
    assert preserve.get_json()["personal_daily_cap"] == 60
    with app.app_context():
        raw = get_whatsapp_config(include_secrets=True)
        assert raw["access_token"] == token_v1
        assert raw["webhook_verify_token"] == verify_tok

    # Supports legacy api_token alias via POST
    token_v2 = "meta_alias_token_3333"
    alias_resp = client.post("/api/config/whatsapp", json={"api_token": token_v2})
    assert alias_resp.status_code == 200
    assert alias_resp.get_json()["masked_access_token"] == "••••••••3333"

    # Explicit clearing
    cleared = client.patch(
        "/api/config/whatsapp",
        json={"clear_access_token": True, "clear_webhook_verify_token": True},
    )
    assert cleared.status_code == 200
    assert cleared.get_json()["has_access_token"] is False
    assert cleared.get_json()["has_webhook_verify_token"] is False
