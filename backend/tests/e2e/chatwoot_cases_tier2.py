"""E2E Tests — Tier 2: Boundary & Corner Cases across Areas A–E (26 tests)."""

import json
import os
import re
import time

import pytest
import yaml

from tests.e2e.chatwoot_mock_server import (
    build_message_created_payload,
    configure_chatwoot_via_api,
    get_unused_local_port,
    install_httpx_chatwoot_router,
    sign_chatwoot_webhook,
)
from tests.e2e.helpers_e2e import (
    FORBIDDEN_FAKE_PERSONA_PATTERNS,
    FRONTEND_SRC_DIR,
    REPO_ROOT,
    _resolve_local_tsx_imports,
    get_json,
    patch_json,
    post_json,
    read_frontend_file,
    strip_ts_comments,
)


def _read_ts_bundle(entry_rel: str) -> str:
    seen, queue, parts = set(), [entry_rel], []
    while queue:
        rel = queue.pop(0)
        if rel in seen:
            continue
        seen.add(rel)
        src = strip_ts_comments(read_frontend_file(rel))
        parts.append(src)
        queue.extend(sub for sub in _resolve_local_tsx_imports(src, rel) if sub not in seen)
    return "\n".join(parts)


def _strip_use_effect_blocks(src: str) -> str:
    """Remove useEffect(...) call bodies to verify window. is not accessed outside useEffect."""
    out, i, n = [], 0, len(src)
    for m in re.finditer(r"\buseEffect\s*\(", src):
        if m.start() < i:
            continue
        out.append(src[i : m.start()])
        j, depth, quote = m.end() - 1, 0, ""
        while j < n:
            ch = src[j]
            if quote:
                if ch == "\\" and j + 1 < n:
                    j += 2
                    continue
                if ch == quote:
                    quote = ""
            elif ch in ("'", '"', "`"):
                quote = ch
            elif ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
                if depth == 0:
                    j += 1
                    break
            j += 1
        i = j
    out.append(src[i:])
    return "".join(out)


def _env_dict(svc_cfg: dict) -> dict:
    env = svc_cfg.get("environment") or {}
    if isinstance(env, dict):
        return {str(k): "" if v is None else str(v) for k, v in env.items()}
    return {str(x).partition("=")[0].strip(): str(x).partition("=")[2].strip() for x in env}


# --- Area A Boundaries ---


@pytest.mark.tier2
def test_t2_a1_compose_port_collision_prevention():
    compose = yaml.safe_load((REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8"))
    svcs = compose["services"]
    assert "3000:3000" in [str(p) for p in (svcs["frontend"].get("ports") or [])]
    cw_ports = [str(p) for p in (svcs["chatwoot-web"].get("ports") or [])]
    assert cw_ports and all(p != "3000:3000" for p in cw_ports)
    assert any("${CHATWOOT_PORT:-3001}:3000" in p for p in cw_ports)
    assert "3001" in _env_dict(svcs["chatwoot-web"]).get("FRONTEND_URL", "")


@pytest.mark.tier2
def test_t2_a2_compose_env_placeholders_absent_env_safe():
    compose = yaml.safe_load((REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8"))
    svcs = compose["services"]
    pg_env = _env_dict(svcs["chatwoot-postgres"])
    rd_env = _env_dict(svcs["chatwoot-redis"])
    cw_env = _env_dict(svcs["chatwoot-web"])
    assert pg_env.get("POSTGRES_PASSWORD", "").startswith("${CHATWOOT_POSTGRES_PASSWORD")
    assert rd_env.get("REDIS_PASSWORD", "").startswith("${CHATWOOT_REDIS_PASSWORD")
    assert cw_env.get("SECRET_KEY_BASE", "").startswith("${CHATWOOT_SECRET_KEY_BASE")
    for literal in ("password123", "secret123", "changeme"):
        assert literal not in json.dumps(svcs).lower()


@pytest.mark.tier2
def test_t2_a3_env_example_no_live_credentials():
    raw = (REPO_ROOT / ".env.example").read_text(encoding="utf-8")
    kv = {}
    for line in raw.splitlines():
        s = line.strip()
        if s and not s.startswith("#") and "=" in s:
            k, _, v = s.partition("=")
            kv[k.strip()] = v.strip().strip('"').strip("'")
    for sec_key in ("CHATWOOT_API_ACCESS_TOKEN", "CHATWOOT_SECRET_KEY_BASE", "CHATWOOT_WEBHOOK_SECRET", "WHATSAPP_API_ACCESS_TOKEN"):
        assert kv.get(sec_key) == "", f"{sec_key} must be empty placeholder in .env.example"


@pytest.mark.tier2
def test_t2_a4_compose_worker_and_web_share_storage_and_db_vars():
    compose = yaml.safe_load((REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8"))
    web, wrk = compose["services"]["chatwoot-web"], compose["services"]["chatwoot-worker"]
    assert web.get("image") == wrk.get("image")
    assert web.get("volumes") == wrk.get("volumes")
    w_env, k_env = _env_dict(web), _env_dict(wrk)
    for k in ("POSTGRES_HOST", "POSTGRES_DATABASE", "REDIS_URL", "SECRET_KEY_BASE"):
        assert w_env.get(k) == k_env.get(k)


@pytest.mark.tier2
def test_t2_a5_compose_missing_optional_env_backend_startup_safe(monkeypatch):
    for key in list(os.environ.keys()):
        if key.startswith("CHATWOOT_") or key.startswith("WHATSAPP_"):
            monkeypatch.delenv(key, raising=False)
    from app.factory import create_app

    app = create_app(testing=True)
    with app.test_client() as tc:
        st, data = get_json(tc, "/api/omnichannel/chatwoot/status")
        assert st == 200 and data.get("configured") is False


# --- Area B Boundaries ---


@pytest.mark.tier2
def test_t2_b1_patch_chatwoot_with_masked_sentinel_preserves_secret(client, fake_chatwoot_server):
    fake_chatwoot_server.expected_token = "real_tok_123"
    configure_chatwoot_via_api(client, fake_chatwoot_server, api_access_token="real_tok_123")
    r2 = patch_json(client, "/api/config/chatwoot", {"api_access_token": "••••••••••••••••", "webhook_secret": ""})
    assert r2.status_code == 200
    t_resp = post_json(client, "/api/config/chatwoot/test", {})
    assert t_resp.status_code == 200 and t_resp.get_json()["success"] is True
    inbox_reqs = [r for r in fake_chatwoot_server.requests_log if "/inboxes" in r["path"]]
    assert inbox_reqs and inbox_reqs[-1]["headers"].get("api_access_token") == "real_tok_123"


@pytest.mark.tier2
def test_t2_b2_config_test_offline_closed_port_graceful(client):
    dead_port = get_unused_local_port()
    assert patch_json(client, "/api/config/chatwoot", {"base_url": f"http://127.0.0.1:{dead_port}", "enabled": True}).status_code == 200
    resp = post_json(client, "/api/config/chatwoot/test", {})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is False and data["reachable"] is False and data.get("message")


@pytest.mark.tier2
def test_t2_b3_config_test_401_unauthorized_and_timeout(client, fake_chatwoot_server, monkeypatch):
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    fake_chatwoot_server.fault_paths = {"/inboxes": "unauthorized_401"}
    r_401 = post_json(client, "/api/config/chatwoot/test", {})
    assert r_401.status_code == 200
    d_401 = r_401.get_json()
    assert d_401["success"] is False and d_401["status_code"] in (401, 403)

    fake_chatwoot_server.fault_paths = {}
    install_httpx_chatwoot_router(monkeypatch, fake_chatwoot_server, timeout_paths=["/api"])
    r_to = post_json(client, "/api/config/chatwoot/test", {})
    assert r_to.status_code == 200
    d_to = r_to.get_json()
    assert d_to["success"] is False and d_to["status_code"] is None


@pytest.mark.tier2
def test_t2_b4_widget_endpoints_never_leak_secrets(client, fake_chatwoot_server):
    configure_chatwoot_via_api(
        client, fake_chatwoot_server,
        api_access_token="sec_api_9911", webhook_secret="sec_wh_9922", website_hmac_secret="sec_hmac_9933",
    )
    for path in ("/api/config/chatwoot/widget", "/api/omnichannel/chatwoot/widget-config?identifier=buyer_1"):
        st, data = get_json(client, path)
        assert st == 200
        dumped = json.dumps(data)
        for sec in ("api_access_token", "webhook_secret", "website_hmac_secret", "sec_api_9911", "sec_wh_9922", "sec_hmac_9933"):
            assert sec not in dumped


@pytest.mark.tier2
def test_t2_b5_whatsapp_patch_masked_token_preserves_secret_and_handles_empty_json(client):
    assert patch_json(client, "/api/config/whatsapp", {"access_token": "wa_live_secret_999"}).status_code == 200
    assert patch_json(client, "/api/config/whatsapp", {}).status_code == 200
    r_mask = patch_json(client, "/api/config/whatsapp", {"access_token": "••••••••••••••••"})
    assert r_mask.status_code == 200
    st, d = get_json(client, "/api/config/whatsapp")
    assert st == 200 and d["has_access_token"] is True and "wa_live_secret_999" not in json.dumps(d)


# --- Area C Boundaries ---


@pytest.mark.tier2
def test_t2_c1_webhook_hmac_missing_invalid_tampered_expired_rejected_401(app, client, fake_chatwoot_server):
    configure_chatwoot_via_api(client, fake_chatwoot_server, webhook_secret="strict_wh_secret")
    payload = build_message_created_payload(message_id=9100, conversation_id=9100)
    raw = b'{  "event":  "message_created",  "id": 9100, "message_type": "incoming", "content": "hi" }'
    canonical = json.dumps(payload).encode("utf-8")

    # (a) missing signature
    assert client.post("/api/omnichannel/chatwoot/webhook", data=canonical, content_type="application/json").status_code == 401
    # (b) wrong signature
    bad_hdrs = sign_chatwoot_webhook("wrong_secret", canonical)
    assert client.post("/api/omnichannel/chatwoot/webhook", data=canonical, headers=bad_hdrs).status_code == 401
    # (c) signed over re-dumped JSON instead of exact raw whitespace bytes
    redumped = json.dumps(json.loads(raw.decode("utf-8"))).encode("utf-8")
    tamper_hdrs = sign_chatwoot_webhook("strict_wh_secret", redumped)
    assert client.post("/api/omnichannel/chatwoot/webhook", data=raw, headers=tamper_hdrs).status_code == 401
    # (d) expired timestamp (1 hour old)
    exp_hdrs = sign_chatwoot_webhook("strict_wh_secret", canonical, timestamp=int(time.time()) - 3600)
    assert client.post("/api/omnichannel/chatwoot/webhook", data=canonical, headers=exp_hdrs).status_code == 401

    from app.db import get_db
    with app.app_context():
        assert get_db().omnichannel_messages.count_documents({}) == 0


@pytest.mark.tier2
def test_t2_c2_webhook_malformed_json_400_and_unknown_event_200(client, fake_chatwoot_server):
    configure_chatwoot_via_api(client, fake_chatwoot_server, webhook_secret="sec_json_test")
    bad_raw = b"{bad_json"
    r_bad = client.post("/api/omnichannel/chatwoot/webhook", data=bad_raw, headers=sign_chatwoot_webhook("sec_json_test", bad_raw))
    assert r_bad.status_code == 400
    unk_raw = json.dumps({"event": "unknown_future_event", "data": {}}).encode("utf-8")
    r_unk = client.post("/api/omnichannel/chatwoot/webhook", data=unk_raw, headers=sign_chatwoot_webhook("sec_json_test", unk_raw))
    assert r_unk.status_code == 200


@pytest.mark.tier2
def test_t2_c3_webhook_duplicate_delivery_and_message_id_idempotency(app, client, create_lead, fake_chatwoot_server):
    create_lead(emails="dup@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server, webhook_secret="dup_sec")
    payload = build_message_created_payload(
        message_id=9300, conversation_id=9300, inbox_id=10, channel_type="Channel::Email",
        content="Send spec", sender={"id": 410, "name": "Buyer", "email": "dup@alfazal.ae"},
    )
    raw = json.dumps(payload).encode("utf-8")
    h1 = sign_chatwoot_webhook("dup_sec", raw, delivery_id="del-fixed-001")
    h2 = sign_chatwoot_webhook("dup_sec", raw, delivery_id="del-fixed-002")
    assert client.post("/api/omnichannel/chatwoot/webhook", data=raw, headers=h1).status_code in (200, 201)
    assert client.post("/api/omnichannel/chatwoot/webhook", data=raw, headers=h1).status_code == 200
    assert client.post("/api/omnichannel/chatwoot/webhook", data=raw, headers=h2).status_code == 200
    from app.db import get_db
    with app.app_context():
        assert get_db().omnichannel_messages.count_documents({}) == 1


@pytest.mark.tier2
def test_t2_c4_webhook_outgoing_echo_loop_suppressed(app, client, create_lead, fake_chatwoot_server):
    lead = create_lead(emails="echo@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server, webhook_secret="echo_sec")
    from app.followup_engine import FollowUpEngine
    with app.app_context():
        FollowUpEngine.get_cadences()
        FollowUpEngine.enroll_lead(lead["id"], "CAD-COMMERCIAL-OUTREACH")

    r_out = post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "WhatsApp", "content": "Echo test"})
    assert r_out.status_code == 200
    rec = r_out.get_json()["record"]
    echo_payload = build_message_created_payload(
        message_id=int(rec["chatwoot_message_id"]),
        conversation_id=int(rec["chatwoot_conversation_id"]),
        inbox_id=11, channel_type="Channel::Whatsapp", message_type="outgoing", content="Echo test",
        sender={"id": 1, "name": "Agent"},
        content_attributes={"tradepulse_message_id": rec["message_id"]},
    )
    raw = json.dumps(echo_payload).encode("utf-8")
    assert client.post("/api/omnichannel/chatwoot/webhook", data=raw, headers=sign_chatwoot_webhook("echo_sec", raw)).status_code == 200
    from app.db import get_db
    with app.app_context():
        db = get_db()
        assert db.omnichannel_messages.count_documents({}) == 1
        enr = db.cadence_enrollments.find_one({"lead_id": lead["id"]})
        assert enr["status"] == "Active" and enr["has_replied"] is False


@pytest.mark.tier2
def test_t2_c5_anonymous_website_visitor_never_pollutes_leads_pool(app, client, fake_chatwoot_server):
    configure_chatwoot_via_api(client, fake_chatwoot_server, webhook_secret="anon_sec")
    payload = build_message_created_payload(
        message_id=9500, conversation_id=950, inbox_id=12, channel_type="Channel::WebWidget",
        content="Anonymous website chat", sender={"id": 991, "name": "Visitor 991", "email": "", "phone_number": ""},
    )
    raw = json.dumps(payload).encode("utf-8")
    assert client.post("/api/omnichannel/chatwoot/webhook", data=raw, headers=sign_chatwoot_webhook("anon_sec", raw)).status_code in (200, 201)
    st, thr = get_json(client, "/api/omnichannel/threads")
    assert st == 200 and any(t.get("thread_id") == "cw_conv_950" and t.get("is_visitor_thread") is True for t in thr["threads"])
    from app.db import get_db
    with app.app_context():
        assert get_db().leads.count_documents({}) == 0


@pytest.mark.tier2
def test_t2_c6_channel_name_normalization_variants(client, create_lead, fake_chatwoot_server):
    lead = create_lead(emails="norm@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server, webhook_secret="norm_sec")
    variants = [
        ("Channel::WebWidget", "Website"), ("web_widget", "Website"),
        ("Website Live Chat", "Website"), ("Web", "Website"),
        ("Channel::Email", "Email"), ("Channel::Whatsapp", "WhatsApp"),
    ]
    for idx, (raw_ch, expected) in enumerate(variants, start=1):
        r = post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": raw_ch, "content": f"Norm {idx}"})
        assert r.status_code == 200 and r.get_json()["record"]["channel"] == expected


# --- Area D Boundaries ---


@pytest.mark.tier2
def test_t2_d1_zero_mock_email_on_lead_sync_empty_email(app, client, create_lead, fake_chatwoot_server):
    lead = create_lead(company_name="Lome Rice Import SARL", country="Togo", city_or_hub="Lome", phones="+22890112233", emails="")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/sync", {}).status_code == 200
    contact_posts = [r["json"] for r in fake_chatwoot_server.requests_log if r["method"] == "POST" and r["path"].endswith("/contacts")]
    assert contact_posts
    sent = contact_posts[-1]
    assert sent.get("identifier") == f"tradepulse_lead_{lead['id']}"
    assert (sent.get("email") or "") == ""
    assert "@example.com" not in json.dumps(sent) and "trade@" not in json.dumps(sent)
    _, det = get_json(client, f"/api/leads/{lead['id']}")
    assert (det["lead"].get("emails") or "") == ""


@pytest.mark.tier2
def test_t2_d2_smtp_hard_stop_429_blocks_email_but_allows_whatsapp_website(app, client, create_lead, fake_chatwoot_server):
    lead = create_lead(emails="quota@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    from app.smtp_stopper import SmtpQuotaManager
    with app.app_context():
        SmtpQuotaManager.configure_quota(daily_limit=1)

    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Email", "content": "Email 1"}).status_code == 200
    before_posts = len([r for r in fake_chatwoot_server.requests_log if r["method"] == "POST" and r["path"].endswith("/messages")])
    r_blocked = post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Email", "content": "Email 2"})
    assert r_blocked.status_code == 429 and r_blocked.get_json()["error"] == "GMAIL_SMTP_HARD_STOPPED"
    after_blocked_posts = len([r for r in fake_chatwoot_server.requests_log if r["method"] == "POST" and r["path"].endswith("/messages")])
    assert after_blocked_posts == before_posts

    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "WhatsApp", "content": "WA ok"}).status_code == 200
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Website", "content": "Web ok"}).status_code == 200
    final_posts = len([r for r in fake_chatwoot_server.requests_log if r["method"] == "POST" and r["path"].endswith("/messages")])
    assert final_posts == before_posts + 2


@pytest.mark.tier2
def test_t2_d3_reply_and_sync_graceful_degradation_when_chatwoot_offline(client, create_lead):
    lead = create_lead(emails="offline@alfazal.ae")
    dead_port = get_unused_local_port()
    assert patch_json(client, "/api/config/chatwoot", {"enabled": True, "base_url": f"http://127.0.0.1:{dead_port}", "api_access_token": "tok_off"}).status_code == 200
    r_rep = post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "WhatsApp", "content": "Saved locally"})
    assert r_rep.status_code == 200 and r_rep.get_json()["record"]["chatwoot_synced"] is False
    st, s_data = get_json(client, "/api/omnichannel/chatwoot/status")
    assert st == 200 and s_data["reachable"] is False
    r_sync = post_json(client, f"/api/omnichannel/threads/{lead['id']}/sync", {})
    assert r_sync.status_code in (200, 502, 503)
    if r_sync.status_code == 200:
        assert r_sync.get_json().get("success") is False


@pytest.mark.tier2
def test_t2_d4_unknown_thread_or_lead_404_and_empty_reply_400(client, create_lead):
    lead = create_lead()
    assert get_json(client, "/api/omnichannel/threads/999999")[0] == 404
    assert get_json(client, "/api/omnichannel/threads/cw_conv_999999")[0] == 404
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Email", "content": "   "}).status_code == 400
    assert post_json(client, "/api/omnichannel/threads/999999/sync", {}).status_code == 404


@pytest.mark.tier2
def test_t2_d5_backward_compat_legacy_inbound_still_works(client, create_lead):
    lead = create_lead()
    r = post_json(client, "/api/omnichannel/inbound", {"lead_id": lead["id"], "channel": "WhatsApp", "message_text": "Send CIF price"})
    assert r.status_code == 201
    body = r.get_json()
    assert body["success"] is True and body["cadence_status"] == "Paused (Client Replied)" and body.get("intent")


# --- Area E Boundaries ---


@pytest.mark.tier2
def test_t2_e1_widget_unconfigured_noop_no_crash():
    widget_src = strip_ts_comments(read_frontend_file("components/ChatwootWidget.tsx"))
    widget_bundle = _read_ts_bundle("components/ChatwootWidget.tsx")
    outside = _strip_use_effect_blocks(widget_src)
    for rel in _resolve_local_tsx_imports(widget_src, "components/ChatwootWidget.tsx"):
        outside += "\n" + strip_ts_comments(read_frontend_file(rel))
    assert "typeof window" in widget_bundle or "useEffect" in widget_src
    if "typeof window" not in outside:
        assert "window." not in outside
    assert "return null" in widget_src
    assert "enabled" in widget_bundle and "website_token" in widget_bundle


@pytest.mark.tier2
def test_t2_e2_widget_never_computes_hmac_client_side():
    for f in sorted(FRONTEND_SRC_DIR.rglob("*.ts*")):
        txt = strip_ts_comments(f.read_text(encoding="utf-8"))
        assert "CHATWOOT_WEBSITE_HMAC_SECRET" not in txt
        assert "createHmac" not in txt


@pytest.mark.tier2
def test_t2_e3_inbox_thread_list_null_safe_on_missing_fields():
    inbox_files = sorted((FRONTEND_SRC_DIR / "components" / "campaigns" / "inbox").glob("*.ts*"))
    assert inbox_files, "Missing components/campaigns/inbox/*.ts* files"
    inbox_bundle = "\n".join(strip_ts_comments(p.read_text(encoding="utf-8")) for p in inbox_files)
    assert not re.search(r"\bt\.last_message\.toLowerCase", inbox_bundle)
    assert not re.search(r"\bt\.latest_intent\.includes", inbox_bundle)
    assert "latest_message" in inbox_bundle and "last_message" in inbox_bundle
    assert "thread_id" in inbox_bundle and "lead_id" in inbox_bundle


@pytest.mark.tier2
def test_t2_e4_chatwoot_console_not_iframe_only():
    inbox_view = strip_ts_comments(read_frontend_file("components/campaigns/OmnichannelInboxView.tsx"))
    cw_tab = strip_ts_comments(read_frontend_file("components/settings/ChatwootGatewayTab.tsx"))
    combined = inbox_view + "\n" + cw_tab
    assert 'target="_blank"' in combined or "target='_blank'" in combined or "window.open" in combined


@pytest.mark.tier2
def test_t2_e5_no_placeholder_tokens_or_fake_emails_in_new_frontend_files():
    targets = [FRONTEND_SRC_DIR / "components" / "ChatwootWidget.tsx", FRONTEND_SRC_DIR / "components" / "dossier" / "DossierOutreachTab.tsx"]
    for folder in (FRONTEND_SRC_DIR / "components" / "campaigns", FRONTEND_SRC_DIR / "components" / "settings"):
        targets.extend(sorted(folder.rglob("*.ts*")))
    for path in targets:
        if not path.exists():
            continue
        txt = strip_ts_comments(path.read_text(encoding="utf-8"))
        assert "EAABwzLIX4ZAIBA" not in txt, f"Hardcoded token in {path}"
        assert "procurement@" not in txt, f"Synthetic email template in {path}"
        for pat in FORBIDDEN_FAKE_PERSONA_PATTERNS:
            assert not re.search(pat, txt), f"Forbidden pattern {pat} in {path}"


__all__ = [name for name in globals() if name.startswith("test_t2_")]
