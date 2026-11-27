"""Validation, URL/cap bounds, HTML/non-JSON rejection, secret masking, and lone-surrogate tests."""
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
# 1. Secret Masking, Preservation, Clearing & Non-Regression
# ============================================================================


def test_chatwoot_secret_preservation_and_explicit_clearing(app, client, monkeypatch):
    from app.config import get_chatwoot_config

    monkeypatch.setenv("CHATWOOT_API_ACCESS_TOKEN", "env_fallback_token_9999")
    initial_token = "persisted_token_abcd1234"
    client.patch(
        "/api/config/chatwoot",
        json={
            "api_access_token": initial_token,
            "webhook_secret": "wh_sec_1111222233",
            "website_hmac_secret": "hmac_sec_4444555566",
        },
    )

    # Sending empty string or masked sentinel must NOT overwrite stored secrets
    resp = client.patch(
        "/api/config/chatwoot",
        json={
            "base_url": "http://localhost:3009",
            "api_access_token": "",
            "webhook_secret": "••••••••2233",
            "website_hmac_secret": None,
        },
    )
    assert resp.status_code == 200
    assert resp.get_json()["has_api_token"] is True
    with app.app_context():
        raw = get_chatwoot_config(include_secrets=True)
        assert raw["api_access_token"] == initial_token
        assert raw["webhook_secret"] == "wh_sec_1111222233"
        assert raw["website_hmac_secret"] == "hmac_sec_4444555566"

    # Explicit clear flags wipe secrets even when env fallback exists
    clear_resp = client.patch(
        "/api/config/chatwoot",
        json={
            "clear_api_token": True,
            "clear_webhook_secret": True,
            "clear_website_hmac_secret": True,
        },
    )
    assert clear_resp.status_code == 200
    cleared = clear_resp.get_json()
    assert cleared["has_api_token"] is False
    assert cleared["masked_api_token"] == ""
    assert cleared["has_webhook_secret"] is False
    assert cleared["has_website_hmac_secret"] is False

    # Re-saving a new token clears the _cleared flag
    resave = client.patch("/api/config/chatwoot", json={"api_access_token": "brand_new_token_7777"})
    assert resave.status_code == 200
    assert resave.get_json()["has_api_token"] is True
    assert resave.get_json()["masked_api_token"] == "••••••••7777"


def test_existing_config_and_smtp_endpoints_unaffected(client):
    cw_api_secret = "cw_tok_secret_9876543210"
    cw_wh_secret = "cw_wh_secret_11223344"
    cw_hmac_secret = "cw_hmac_secret_55667788"
    wa_token = "meta_wa_secret_token_44332211"
    wa_verify = "wa_verify_secret_990011"

    client.patch(
        "/api/config/chatwoot",
        json={
            "enabled": True,
            "website_token": "tok_check",
            "api_access_token": cw_api_secret,
            "webhook_secret": cw_wh_secret,
            "website_hmac_secret": cw_hmac_secret,
        },
    )
    client.patch(
        "/api/config/whatsapp",
        json={
            "phone_number_id": "111222333",
            "access_token": wa_token,
            "webhook_verify_token": wa_verify,
        },
    )

    cfg_resp = client.get("/api/config")
    assert cfg_resp.status_code == 200
    cfg_text = cfg_resp.get_data(as_text=True)
    for raw_secret in (cw_api_secret, cw_wh_secret, cw_hmac_secret, wa_token, wa_verify):
        assert raw_secret not in cfg_text
    cfg_json = cfg_resp.get_json()["config"]
    assert cfg_json["chatwoot"]["has_api_token"] is True
    assert cfg_json["chatwoot"]["masked_api_token"] == "••••••••3210"
    assert "api_access_token" not in cfg_json["chatwoot"]
    assert "webhook_secret" not in cfg_json["chatwoot"]
    assert "website_hmac_secret" not in cfg_json["chatwoot"]
    assert cfg_json["whatsapp"]["has_access_token"] is True
    assert cfg_json["whatsapp"]["masked_access_token"] == "••••••••2211"
    assert "access_token" not in cfg_json["whatsapp"]
    assert "webhook_verify_token" not in cfg_json["whatsapp"]

    patch_resp = client.patch("/api/config", json={"timeout_seconds": 25})
    assert patch_resp.status_code == 200
    patch_text = patch_resp.get_data(as_text=True)
    for raw_secret in (cw_api_secret, cw_wh_secret, cw_hmac_secret, wa_token, wa_verify):
        assert raw_secret not in patch_text
    patch_cfg = patch_resp.get_json()["config"]
    assert "api_access_token" not in patch_cfg["chatwoot"]
    assert "access_token" not in patch_cfg["whatsapp"]

    smtp_resp = client.get("/api/config/smtp")
    assert smtp_resp.status_code == 200
    assert "smtp" in smtp_resp.get_json()


# ============================================================================
# 2. Input Validation, Bounds, HTML/Non-JSON & Surrogate Rejection
# ============================================================================


def test_non_dict_and_malformed_json_rejected_with_400(client):
    endpoints = [
        ("patch", "/api/config/chatwoot"),
        ("post", "/api/config/chatwoot"),
        ("patch", "/api/config/whatsapp"),
        ("post", "/api/config/whatsapp"),
        ("post", "/api/config/chatwoot/test"),
    ]
    for method, path in endpoints:
        for bad_payload in ([1, 2], 42, "str", True):
            resp = getattr(client, method)(path, json=bad_payload)
            assert resp.status_code == 400, f"{method.upper()} {path} with {bad_payload!r} returned {resp.status_code}"
            data = resp.get_json()
            assert data is not None
            if path.endswith("/test"):
                assert data["success"] is False
                assert data["reachable"] is False

        for raw_bad in ("null", "{bad json"):
            bad_json_resp = getattr(client, method)(
                path, data=raw_bad, content_type="application/json"
            )
            assert bad_json_resp.status_code == 400

    # Empty body on /test still succeeds cleanly with 200 (falls back to default config)
    with patch("app.routes.config_routes.httpx.Client") as mock_client:
        mock_http = mock_client.return_value.__enter__.return_value
        mock_http.get.side_effect = httpx.ConnectError("refused")
        empty_resp = client.post("/api/config/chatwoot/test")
        assert empty_resp.status_code == 200
        assert empty_resp.get_json()["reachable"] is False


def test_chatwoot_connection_malformed_urls_return_200_unreachable(client):
    malformed_urls = [
        "http://[::1",
        "http://localhost:abc",
        "http://localhost:3001/\x00",
        "javascript:alert(1)",
        "ftp://chatwoot.local",
        "not-a-url",
        "https://exa mple.com",
    ]
    for bad_url in malformed_urls:
        resp = client.post("/api/config/chatwoot/test", json={"base_url": bad_url})
        assert resp.status_code == 200, f"Expected 200 for {bad_url!r}, got {resp.status_code}"
        data = resp.get_json()
        assert data["success"] is False
        assert data["reachable"] is False
        assert data["status_code"] is None
        assert data["inboxes"] == []

    # Also verify httpx.InvalidURL raised inside Client.get is caught cleanly
    mock_http = MagicMock()
    mock_http.__enter__.return_value = mock_http
    mock_http.get.side_effect = httpx.InvalidURL("Invalid URL from httpx")
    with patch("app.routes.config_routes.httpx.Client", return_value=mock_http):
        resp = client.post("/api/config/chatwoot/test", json={"base_url": "http://localhost:3001"})
    assert resp.status_code == 200
    assert resp.get_json()["reachable"] is False


def test_chatwoot_connection_rejects_non_json_html_responses(client):
    class _HtmlStubHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<html><body>Not Chatwoot</body></html>")

        def log_message(self, format, *args):
            return

    server = HTTPServer(("127.0.0.1", 0), _HtmlStubHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        resp = client.post(
            "/api/config/chatwoot/test",
            json={"base_url": f"http://127.0.0.1:{port}"},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is False
        assert data["reachable"] is True
        assert data["status_code"] == 200
        assert data["inboxes"] == []
    finally:
        server.shutdown()
        server.server_close()

    # Also check /api returning JSON while /inboxes returns 200 text/html
    api_resp = MagicMock(status_code=200)
    api_resp.json.return_value = {"version": "3.16.0"}
    inboxes_html_resp = MagicMock(status_code=200)
    inboxes_html_resp.json.side_effect = ValueError("Expecting value")
    mock_http = MagicMock()
    mock_http.__enter__.return_value = mock_http
    mock_http.get.side_effect = [api_resp, inboxes_html_resp]

    with patch("app.routes.config_routes.httpx.Client", return_value=mock_http):
        resp2 = client.post(
            "/api/config/chatwoot/test",
            json={"base_url": "http://localhost:3001", "api_access_token": "tok_123456"},
        )
    assert resp2.status_code == 200
    data2 = resp2.get_json()
    assert data2["success"] is False
    assert data2["reachable"] is True
    assert data2["status_code"] == 200
    assert data2["inboxes"] == []


def test_chatwoot_url_scheme_validation_and_public_url_fallback(app, client, monkeypatch):
    for field in ("base_url", "public_url"):
        for bad_url in ("javascript:alert(1)", "ftp://example.com", "http://[::1", "not-a-url"):
            resp = client.patch("/api/config/chatwoot", json={field: bad_url})
            assert resp.status_code == 400, f"Expected 400 for {field}={bad_url!r}"

    # When DB base_url is set and neither DB public_url nor CHATWOOT_PUBLIC_URL env is set,
    # public_url falls back to DB base_url.
    save_resp = client.patch(
        "/api/config/chatwoot",
        json={
            "base_url": "https://chat.mycompany.com/",
            "website_token": "wt_123",
            "enabled": True,
        },
    )
    assert save_resp.status_code == 200
    assert save_resp.get_json()["public_url"] == "https://chat.mycompany.com"

    widget_resp = client.get("/api/config/chatwoot/widget")
    assert widget_resp.status_code == 200
    assert widget_resp.get_json()["base_url"] == "https://chat.mycompany.com"

    # When only env CHATWOOT_BASE_URL is set (e.g. Docker-internal) and DB/env public_url are unset,
    # public_url defaults to http://localhost:3001 rather than leaking internal hostname.
    from app.db import get_db
    from app.config import get_chatwoot_config

    with app.app_context():
        get_db().system_config.update_one(
            {"_id": "singleton_config"}, {"$unset": {"chatwoot": ""}}
        )
        monkeypatch.setenv("CHATWOOT_BASE_URL", "http://chatwoot-web:3000")
        cfg = get_chatwoot_config(include_secrets=False)
        assert cfg["base_url"] == "http://chatwoot-web:3000"
        assert cfg["public_url"] == "http://localhost:3001"


def test_whatsapp_personal_daily_cap_bounds_validation(client):
    for bad_cap in (10**25, -5, 10001, False, True, "abc", "", 12.5, [10]):
        resp = client.patch("/api/config/whatsapp", json={"personal_daily_cap": bad_cap})
        assert resp.status_code == 400, f"Expected 400 for personal_daily_cap={bad_cap!r}, got {resp.status_code}"
        assert "personal_daily_cap" in resp.get_json()["error"]

    for valid_cap in (0, 50, 10000, "250"):
        resp = client.patch("/api/config/whatsapp", json={"personal_daily_cap": valid_cap})
        assert resp.status_code == 200
        assert resp.get_json()["personal_daily_cap"] == int(valid_cap)


def test_has_lone_surrogates_and_validate_http_url_rejection():
    from app.channel_config_helpers import has_lone_surrogates, validate_http_url

    assert has_lone_surrogates("") is False
    assert has_lone_surrogates("https://chat.tradepulse.local:3001") is False
    assert has_lone_surrogates("TradePulse \U0001F680 EXIM") is False  # valid astral codepoint
    assert has_lone_surrogates("\ud800") is True
    assert has_lone_surrogates("\udfff") is True
    assert has_lone_surrogates("prefix-\ud83d-suffix") is True

    ok, err = validate_http_url("http://localhost:3001/\ud800")
    assert ok is False
    assert "surrogate" in err.lower()


def test_chatwoot_and_whatsapp_routes_reject_lone_surrogates(app, client):
    from app.config import get_chatwoot_config, get_whatsapp_config

    cw_cases = [
        ("base_url", "http://localhost:3001/\ud800"),
        ("public_url", "https://chat.example.com/\udfff"),
        ("account_id", "1\ud800"),
        ("website_token", "tok_\ud83d"),
        ("api_access_token", "secret_\ud800_tok"),
        ("webhook_secret", "wh_\udfff_sec"),
        ("website_hmac_secret", "hmac_\ud800_sec"),
    ]
    for field, bad_val in cw_cases:
        resp = client.patch("/api/config/chatwoot", json={field: bad_val})
        assert resp.status_code == 400, f"PATCH /api/config/chatwoot {field} returned {resp.status_code}"
        err = resp.get_json().get("error", "")
        assert field in err and "surrogate" in err.lower()

    wa_cases = [
        ("phone_number_id", "12345\ud800"),
        ("webhook_url", "https://example.com/\udfff"),
        ("access_token", "wa_tok_\ud800"),
        ("api_token", "wa_alias_\udfff"),
        ("webhook_verify_token", "wa_verify_\ud800"),
    ]
    for field, bad_val in wa_cases:
        resp = client.patch("/api/config/whatsapp", json={field: bad_val})
        assert resp.status_code == 400, f"PATCH /api/config/whatsapp {field} returned {resp.status_code}"
        assert "surrogate" in resp.get_json().get("error", "").lower()

    # /api/config/chatwoot/test rejects lone surrogates cleanly without HTTP 500
    for payload in (
        {"base_url": "http://localhost:3001/\ud800"},
        {"base_url": "http://localhost:3001", "account_id": "2\ud800"},
        {"base_url": "http://localhost:3001", "api_access_token": "tok_\udfff"},
    ):
        test_resp = client.post("/api/config/chatwoot/test", json=payload)
        assert test_resp.status_code == 200
        body = test_resp.get_json()
        assert body["success"] is False
        assert body["reachable"] is False
        assert body["status_code"] is None
        assert body["inboxes"] == []
        assert "surrogate" in body["message"].lower()

    with app.app_context():
        assert get_chatwoot_config()["configured"] is False
        assert get_whatsapp_config()["configured"] is False
