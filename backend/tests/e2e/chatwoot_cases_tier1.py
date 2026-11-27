"""E2E Tests — Tier 1: Core Feature Coverage across Areas A–E (28 tests)."""

import hashlib
import hmac
import json
import re
import shutil
import subprocess

import pytest
import yaml

from tests.e2e.chatwoot_mock_server import (
    build_lifecycle_event_payload,
    build_message_created_payload,
    configure_chatwoot_via_api,
    sign_chatwoot_webhook,
)
from tests.e2e.helpers_e2e import (
    FRONTEND_SRC_DIR,
    REPO_ROOT,
    _resolve_local_tsx_imports,
    fetch_ssr_html,
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


def _env_dict(svc_cfg: dict) -> dict:
    env = svc_cfg.get("environment") or {}
    if isinstance(env, dict):
        return {str(k): "" if v is None else str(v) for k, v in env.items()}
    return {str(x).partition("=")[0].strip(): str(x).partition("=")[2].strip() for x in env}


def _parse_env_example() -> dict:
    parsed = {}
    for line in (REPO_ROOT / ".env.example").read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if s and not s.startswith("#") and "=" in s:
            k, _, v = s.partition("=")
            parsed[k.strip()] = v.strip().strip('"').strip("'")
    return parsed


def _post_wh(client, payload: dict, secret: str = "wh_test_secret_123"):
    raw = json.dumps(payload).encode("utf-8")
    return client.post("/api/omnichannel/chatwoot/webhook", data=raw, headers=sign_chatwoot_webhook(secret, raw))


# --- Area A: Self-Hosted Chatwoot Compose & .env.example ---


@pytest.mark.tier1
def test_t1_a1_compose_chatwoot_services_and_network():
    svcs = yaml.safe_load((REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8")).get("services") or {}
    for name in ("mongodb", "backend", "frontend", "chatwoot-postgres", "chatwoot-redis", "chatwoot-web", "chatwoot-worker"):
        assert name in svcs and "tradepulse_network" in (svcs[name].get("networks") or [])
    assert "pgvector/pgvector:pg16" in str(svcs["chatwoot-postgres"].get("image"))
    assert "redis:7-alpine" in str(svcs["chatwoot-redis"].get("image"))
    ports = [str(p) for p in (svcs["chatwoot-web"].get("ports") or [])]
    assert any("3001" in p and p.endswith(":3000") for p in ports) and all(p != "3000:3000" for p in ports)
    assert "sidekiq" in " ".join(str(x) for x in (svcs["chatwoot-worker"].get("command") or []))


@pytest.mark.tier1
def test_t1_a2_compose_healthchecks_depends_on_and_volumes():
    compose = yaml.safe_load((REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8"))
    svcs, vols = compose.get("services") or {}, compose.get("volumes") or {}
    assert "pg_isready" in str(svcs["chatwoot-postgres"].get("healthcheck"))
    redis_hc = str(svcs["chatwoot-redis"].get("healthcheck"))
    assert "redis-cli" in redis_hc and "ping" in redis_hc
    for s_name in ("chatwoot-web", "chatwoot-worker"):
        deps = svcs[s_name].get("depends_on") or {}
        assert "chatwoot-postgres" in deps and "chatwoot-redis" in deps
    for vname in ("chatwoot_postgres_data", "chatwoot_redis_data", "chatwoot_storage"):
        assert vname in vols


@pytest.mark.tier1
def test_t1_a3_compose_backend_frontend_env_passthrough():
    svcs = yaml.safe_load((REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8")).get("services") or {}
    b_env, f_env = _env_dict(svcs["backend"]), _env_dict(svcs["frontend"])
    assert "http://chatwoot-web:3000" in b_env.get("CHATWOOT_BASE_URL", "")
    for key in (
        "CHATWOOT_PUBLIC_URL", "CHATWOOT_ACCOUNT_ID", "CHATWOOT_API_ACCESS_TOKEN",
        "CHATWOOT_WEBHOOK_SECRET", "CHATWOOT_EMAIL_INBOX_ID", "CHATWOOT_WHATSAPP_INBOX_ID",
        "CHATWOOT_WEBSITE_INBOX_ID", "CHATWOOT_WEBSITE_TOKEN", "CHATWOOT_WEBSITE_HMAC_SECRET",
    ):
        assert key in b_env
    assert "NEXT_PUBLIC_CHATWOOT_URL" in f_env and "NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN" in f_env


@pytest.mark.tier1
def test_t1_a4_env_example_complete_channel_templates():
    env_map = _parse_env_example()
    for k in (
        "CHATWOOT_PORT", "CHATWOOT_FRONTEND_URL", "CHATWOOT_SECRET_KEY_BASE",
        "CHATWOOT_POSTGRES_DB", "CHATWOOT_POSTGRES_USER", "CHATWOOT_POSTGRES_PASSWORD",
        "CHATWOOT_REDIS_PASSWORD", "CHATWOOT_ENABLE_ACCOUNT_SIGNUP",
        "CHATWOOT_MAILER_SENDER_EMAIL", "CHATWOOT_SMTP_ADDRESS", "CHATWOOT_SMTP_PORT",
        "WHATSAPP_CLOUD_API_WEBHOOK_VERIFY_TOKEN", "WHATSAPP_PHONE_NUMBER_ID",
        "WHATSAPP_BUSINESS_ACCOUNT_ID", "WHATSAPP_API_ACCESS_TOKEN",
        "CHATWOOT_WEBSITE_TOKEN", "CHATWOOT_WEBSITE_HMAC_SECRET",
        "NEXT_PUBLIC_CHATWOOT_URL", "NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN",
        "CHATWOOT_BASE_URL", "CHATWOOT_API_ACCESS_TOKEN", "CHATWOOT_WEBHOOK_SECRET",
    ):
        assert k in env_map, f"Missing {k} in .env.example"


@pytest.mark.tier1
def test_t1_a5_zero_hardcoded_secrets_and_optional_compose_cli():
    compose_raw = (REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    env_raw = (REPO_ROOT / ".env.example").read_text(encoding="utf-8")
    assert "EAABwz" not in compose_raw and "EAABwz" not in env_raw
    assert not re.search(r"SECRET_KEY_BASE=[A-Za-z0-9]{16,}", compose_raw + "\n" + env_raw)
    if shutil.which("docker"):
        proc = subprocess.run(["docker", "compose", "config", "--quiet"], cwd=str(REPO_ROOT), capture_output=True, text=True)
        assert proc.returncode == 0, proc.stderr


# --- Area B: Config API (/api/config/chatwoot*, /api/config/whatsapp) ---


@pytest.mark.tier1
def test_t1_b1_get_chatwoot_config_baseline_shape(client):
    st, data = get_json(client, "/api/config/chatwoot")
    assert st == 200
    for k in (
        "configured", "enabled", "base_url", "public_url", "account_id",
        "email_inbox_id", "whatsapp_inbox_id", "website_inbox_id", "website_token",
        "has_api_token", "masked_api_token", "has_webhook_secret", "has_website_hmac_secret", "channels",
    ):
        assert k in data, f"Missing {k}"
    assert set(data["channels"].keys()) == {"email", "whatsapp", "website"}


@pytest.mark.tier1
def test_t1_b2_patch_and_post_chatwoot_config_persists_with_masking(client):
    payload = {
        "enabled": True, "base_url": "http://127.0.0.1:3001", "public_url": "http://localhost:3001",
        "account_id": 1, "api_access_token": "cw_tok_secret_1234", "webhook_secret": "wh_sec_999",
        "website_token": "web_tok_abc", "website_hmac_secret": "hmac_sec_777",
        "email_inbox_id": 10, "whatsapp_inbox_id": 11, "website_inbox_id": 12,
    }
    assert patch_json(client, "/api/config/chatwoot", payload).status_code == 200
    st, d1 = get_json(client, "/api/config/chatwoot")
    assert st == 200 and d1["configured"] is True and d1["has_api_token"] is True
    assert d1["has_webhook_secret"] is True and d1["has_website_hmac_secret"] is True
    assert d1["channels"] == {"email": True, "whatsapp": True, "website": True}
    raw_dump = json.dumps(d1)
    assert all(sec not in raw_dump for sec in ("cw_tok_secret_1234", "wh_sec_999", "hmac_sec_777"))
    assert "•" in d1["masked_api_token"] or "*" in d1["masked_api_token"]
    r2 = post_json(client, "/api/config/chatwoot", {"account_id": 2})
    assert r2.status_code == 200 and str(r2.get_json()["account_id"]) == "2"


@pytest.mark.tier1
def test_t1_b3_post_chatwoot_config_test_reachable_returns_inboxes(client, fake_chatwoot_server):
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    resp = post_json(client, "/api/config/chatwoot/test", {})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True and data["reachable"] is True and data["status_code"] == 200
    assert len(data["inboxes"]) == 3 and data.get("message")
    inbox_reqs = [r for r in fake_chatwoot_server.requests_log if "/inboxes" in r["path"]]
    assert inbox_reqs and inbox_reqs[-1]["headers"].get("api_access_token") == fake_chatwoot_server.expected_token


@pytest.mark.tier1
def test_t1_b4_get_chatwoot_widget_config_public_only(client, fake_chatwoot_server):
    configure_chatwoot_via_api(client, fake_chatwoot_server, public_url="http://localhost:3001", website_token="web_tok_abc")
    st, data = get_json(client, "/api/config/chatwoot/widget")
    assert st == 200 and data == {"enabled": True, "base_url": "http://localhost:3001", "website_token": "web_tok_abc", "hmac_enabled": True}
    assert all(k not in data for k in ("api_access_token", "webhook_secret", "website_hmac_secret"))


@pytest.mark.tier1
def test_t1_b5_get_and_patch_whatsapp_config_persists_with_masking(client):
    st0, d0 = get_json(client, "/api/config/whatsapp")
    assert st0 == 200 and "EAABwzLIX4ZAIBA" not in json.dumps(d0)
    assert patch_json(client, "/api/config/whatsapp", {
        "provider": "meta_cloud_api", "phone_number_id": "109849201948291",
        "business_account_id": "99887766", "access_token": "meta_live_secret_token_xyz", "webhook_verify_token": "wa_verify_abc",
    }).status_code == 200
    st1, d1 = get_json(client, "/api/config/whatsapp")
    assert st1 == 200 and d1["has_access_token"] is True and d1["phone_number_id"] == "109849201948291"
    assert "meta_live_secret_token_xyz" not in json.dumps(d1)
    assert "•" in d1["masked_access_token"] or "*" in d1["masked_access_token"]


# --- Area C: Chatwoot Webhook Ingestion & Channel Status ---


@pytest.mark.tier1
def test_t1_c1_webhook_email_channel_ingests_and_links_lead(client, create_lead, fake_chatwoot_server):
    lead = create_lead(emails="buyer@gulfrice.ae", phones="+971502223344")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    resp = _post_wh(client, build_message_created_payload(
        message_id=6101, conversation_id=7101, inbox_id=10, channel_type="Channel::Email",
        content="Please send CIF Jebel Ali quote for 5 FCL",
        sender={"id": 310, "name": "Gulf Buyer", "email": "buyer@gulfrice.ae"},
        content_attributes={"email": {"subject": "RFQ Basmati"}},
    ))
    assert resp.status_code in (200, 201)
    st, detail = get_json(client, f"/api/omnichannel/threads/{lead['id']}")
    assert st == 200
    msgs = [m for m in detail["messages"] if m.get("channel") == "Email" and m.get("direction") == "inbound"]
    assert msgs and msgs[-1].get("intent") and msgs[-1].get("chatwoot_conversation_id") == 7101 and msgs[-1].get("chatwoot_message_id") == 6101


@pytest.mark.tier1
def test_t1_c2_webhook_whatsapp_channel_ingests_and_links_lead_by_phone(client, create_lead, fake_chatwoot_server):
    lead = create_lead(phones="+971501234567", emails="")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    assert _post_wh(client, build_message_created_payload(
        message_id=6102, conversation_id=7102, inbox_id=11, channel_type="Channel::Whatsapp",
        content="Send 1121 price per MT on WhatsApp", sender={"id": 311, "name": "Tariq", "phone_number": "+971501234567"},
    )).status_code in (200, 201)
    _, detail = get_json(client, f"/api/omnichannel/threads/{lead['id']}")
    assert any(m.get("channel") == "WhatsApp" and m.get("direction") == "inbound" for m in detail["messages"])
    assert (detail["lead"].get("emails") or "") == ""


@pytest.mark.tier1
def test_t1_c3_webhook_website_channel_and_webwidget_triggered_visitor_thread(client, fake_chatwoot_server):
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    assert _post_wh(client, build_lifecycle_event_payload("webwidget_triggered", conversation_id=701, sender={"id": 801, "name": "Port Visitor"})).status_code in (200, 201)
    assert _post_wh(client, build_message_created_payload(
        message_id=6103, conversation_id=701, inbox_id=12, channel_type="Channel::WebWidget",
        content="Do you export IR-64 parboiled to Lome?", sender={"id": 801, "name": "Port Visitor"},
    )).status_code in (200, 201)
    st, thr = get_json(client, "/api/omnichannel/threads")
    assert st == 200
    v_threads = [t for t in thr["threads"] if t.get("thread_id") == "cw_conv_701"]
    assert v_threads and v_threads[0].get("latest_channel") == "Website" and v_threads[0].get("is_visitor_thread") is True
    st_det, det = get_json(client, "/api/omnichannel/threads/cw_conv_701")
    assert st_det == 200 and any(m.get("channel") == "Website" for m in det["messages"])
    assert len(get_json(client, "/api/leads")[1].get("leads", [])) == 0


@pytest.mark.tier1
def test_t1_c4_webhook_conversation_lifecycle_and_message_updated_events(client, create_lead, fake_chatwoot_server):
    lead = create_lead(emails="life@gulfrice.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    sender = {"id": 312, "name": "Buyer", "email": "life@gulfrice.ae"}
    assert _post_wh(client, build_lifecycle_event_payload("conversation_created", conversation_id=704, sender=sender)).status_code == 200
    assert _post_wh(client, build_message_created_payload(message_id=6104, conversation_id=704, inbox_id=12, channel_type="Channel::WebWidget", content="Initial quote req", sender=sender)).status_code in (200, 201)
    assert _post_wh(client, build_lifecycle_event_payload("message_updated", conversation_id=704, message_id=6104, content="Updated quote req 5 FCL", sender=sender)).status_code == 200
    assert _post_wh(client, build_lifecycle_event_payload("conversation_updated", conversation_id=704, status="open", sender=sender)).status_code == 200
    assert _post_wh(client, build_lifecycle_event_payload("conversation_status_changed", conversation_id=704, status="resolved", sender=sender)).status_code == 200
    st, det = get_json(client, f"/api/omnichannel/threads/{lead['id']}")
    assert st == 200 and len(det["messages"]) == 1


@pytest.mark.tier1
def test_t1_c5_chatwoot_status_endpoint_reports_channels_and_sync_counts(client, create_lead, fake_chatwoot_server):
    lead = create_lead()
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/sync", {}).status_code == 200
    st, data = get_json(client, "/api/omnichannel/chatwoot/status")
    assert st == 200 and data["configured"] is True and data["reachable"] is True
    assert data.get("public_url") == fake_chatwoot_server.base_url
    ch_str = json.dumps(data.get("channels") or {}).lower()
    assert "email" in ch_str and "whatsapp" in ch_str and "website" in ch_str
    assert int(data.get("synced_threads", 0)) >= 1


@pytest.mark.tier1
def test_t1_c6_widget_config_hmac_and_conversations_proxy(client, fake_chatwoot_server):
    configure_chatwoot_via_api(client, fake_chatwoot_server, website_token="web_tok_test_123", website_hmac_secret="hmac_test_secret")
    fake_chatwoot_server.seed_conversation(conv_id=901, contact_id=401)
    fake_chatwoot_server.seed_conversation(conv_id=902, contact_id=402)
    st_w, w_data = get_json(client, "/api/omnichannel/chatwoot/widget-config?identifier=lead_42")
    assert st_w == 200 and w_data["enabled"] is True and w_data["identifier"] == "lead_42"
    assert w_data["identifier_hash"] == hmac.new(b"hmac_test_secret", b"lead_42", hashlib.sha256).hexdigest()
    assert "hmac_test_secret" not in json.dumps(w_data)
    st_c, c_data = get_json(client, "/api/omnichannel/chatwoot/conversations")
    assert st_c == 200 and len(c_data.get("conversations", [])) >= 2


# --- Area D: Lead & Omnichannel Synchronization ---


@pytest.mark.tier1
def test_t1_d1_threads_list_harmonized_legacy_and_ui_schema(client, create_lead, fake_chatwoot_server):
    lead = create_lead(emails="harm@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    _post_wh(client, build_message_created_payload(
        message_id=6201, conversation_id=7201, inbox_id=12, channel_type="Channel::WebWidget",
        content="Need CIF Dubai 1121 price", sender={"id": 320, "name": "Tariq", "email": "harm@alfazal.ae"},
    ))
    st, data = get_json(client, "/api/omnichannel/threads")
    assert st == 200 and "threads" in data and "total" in data
    item = next(t for t in data["threads"] if str(t.get("lead_id")) == str(lead["id"]))
    for k in ("lead_id", "latest_message", "intent", "latest_timestamp", "thread_id", "last_message", "latest_intent", "last_activity_at", "cadence_paused", "chatwoot_conversation_id", "chatwoot_synced", "is_visitor_thread"):
        assert k in item, f"Missing harmonized key {k}"
    assert item["latest_message"] == item["last_message"] and item["intent"] == item["latest_intent"]


@pytest.mark.tier1
def test_t1_d2_thread_detail_resolves_int_objectid_and_visitor_id(client, create_lead, fake_chatwoot_server):
    lead = create_lead(emails="multi@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/sync", {}).status_code == 200
    _post_wh(client, build_message_created_payload(
        message_id=6202, conversation_id=88, inbox_id=12, channel_type="Channel::WebWidget",
        content="Visitor message", sender={"id": 880, "name": "Web Guest"},
    ))
    for tid in (str(lead["id"]), str(lead["_id"]), "cw_conv_88"):
        st, d = get_json(client, f"/api/omnichannel/threads/{tid}")
        assert st == 200 and all(k in d for k in ("lead", "messages", "cadence_enrollment", "chatwoot"))
        assert "conversation_id" in d["chatwoot"] and "synced" in d["chatwoot"]


@pytest.mark.tier1
def test_t1_d3_reply_and_dispatch_mirror_to_chatwoot_across_3_channels(client, create_lead, fake_chatwoot_server):
    lead = create_lead(emails="reply3@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    r1 = post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Email", "subject": "SCO Offer", "content": "Attached SCO"})
    r2 = post_json(client, f"/api/omnichannel/threads/{lead['id']}/dispatch", {"channel": "WhatsApp", "content": "WhatsApp rate $780/MT"})
    r3 = post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Website", "content": "Live chat support ready"})
    for resp in (r1, r2, r3):
        body = resp.get_json()
        assert resp.status_code == 200 and body["success"] is True and body["record"]["chatwoot_synced"] is True and body["record"].get("chatwoot_message_id")
    msg_posts = [r for r in fake_chatwoot_server.requests_log if r["method"] == "POST" and r["path"].endswith("/messages")]
    assert len(msg_posts) == 3 and all(p["json"].get("message_type") == "outgoing" for p in msg_posts)
    msg_json = msg_posts[0]["json"]
    email_subj = ((msg_json.get("content_attributes") or {}).get("email") or {}).get("subject") or ""
    assert "SCO Offer" in email_subj or "SCO Offer" in (msg_json.get("content") or "")


@pytest.mark.tier1
def test_t1_d4_ai_draft_supports_email_whatsapp_website_channels(client, create_lead, fake_chatwoot_server):
    lead = create_lead(emails="draft@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    _post_wh(client, build_message_created_payload(
        message_id=6204, conversation_id=7204, inbox_id=12, channel_type="Channel::WebWidget",
        content="Send CIF quote for 1121 Basmati", sender={"id": 324, "name": "Buyer", "email": "draft@alfazal.ae"},
    ))
    drafts = {}
    for ch in ("Email", "WhatsApp", "Website"):
        r = post_json(client, f"/api/omnichannel/threads/{lead['id']}/ai-draft", {"channel": ch})
        assert r.status_code == 200
        d = r.get_json()
        assert d.get("draft_content") and d.get("draft_subject")
        drafts[ch] = d["draft_content"]
    assert "Dear" in drafts["Email"] and len(drafts["WhatsApp"]) < len(drafts["Email"]) and len(drafts["Website"]) < len(drafts["Email"])


@pytest.mark.tier1
def test_t1_d5_manual_lead_sync_and_global_chatwoot_sync(client, create_lead, fake_chatwoot_server):
    lead = create_lead(emails="syncme@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/sync", {}).status_code == 200
    assert any(c.get("identifier") == f"tradepulse_lead_{lead['id']}" for c in fake_chatwoot_server.contacts.values())
    fake_chatwoot_server.seed_conversation(conv_id=955, contact_id=455, name="External Guest", message_text="Need IR64 price")
    assert post_json(client, "/api/omnichannel/chatwoot/sync", {}).status_code == 200
    _, thr = get_json(client, "/api/omnichannel/threads")
    assert any(t.get("chatwoot_conversation_id") == 955 or t.get("thread_id") == "cw_conv_955" for t in thr["threads"])


@pytest.mark.tier1
def test_t1_d6_lead_timeline_and_outreach_history_reflect_chatwoot_channels(client, create_lead, fake_chatwoot_server):
    lead = create_lead(emails="tl@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    _post_wh(client, build_message_created_payload(
        message_id=6206, conversation_id=7206, inbox_id=12, channel_type="Channel::WebWidget",
        content="Website inquiry", sender={"id": 326, "name": "Buyer", "email": "tl@alfazal.ae"},
    ))
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "WhatsApp", "content": "WA reply"}).status_code == 200
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Email", "content": "Email reply"}).status_code == 200
    st_tl, tl = get_json(client, f"/api/leads/{lead['_id']}/timeline")
    st_oh, oh = get_json(client, f"/api/leads/{lead['_id']}/outreach-history")
    assert st_tl == 200 and st_oh == 200
    assert {"Website", "WhatsApp", "Email"}.issubset({m.get("channel") for m in oh.get("messages", [])})
    assert {"Website", "WhatsApp", "Email"}.issubset({e.get("channel") for e in tl.get("timeline", []) if e.get("channel")})


# --- Area E: Frontend Integration Contracts ---


@pytest.mark.tier1
def test_t1_e1_chatwoot_widget_ssr_safe_and_mounted_in_layout():
    layout_src = strip_ts_comments(read_frontend_file("app/layout.tsx"))
    widget_src = strip_ts_comments(read_frontend_file("components/ChatwootWidget.tsx"))
    widget_bundle = _read_ts_bundle("components/ChatwootWidget.tsx")
    assert "ChatwootWidget" in layout_src and ("'use client'" in widget_src or '"use client"' in widget_src)
    assert "window.chatwootSettings" in widget_bundle and "/packs/js/sdk.js" in widget_bundle
    assert "chatwootSDK" in widget_bundle and "useEffect" in widget_src and "chatwoot:ready" in widget_bundle
    assert "/omnichannel/chatwoot/widget-config" in widget_bundle and "return null" in widget_src


@pytest.mark.tier1
def test_t1_e2_inbox_ui_supports_website_harmonized_keys_and_zero_synthetic_email():
    inbox_files = sorted((FRONTEND_SRC_DIR / "components" / "campaigns" / "inbox").glob("*.ts*"))
    assert inbox_files, "Missing components/campaigns/inbox/*.ts* files"
    parts = [strip_ts_comments(read_frontend_file("components/campaigns/OmnichannelInboxView.tsx"))]
    parts.extend(strip_ts_comments(p.read_text(encoding="utf-8")) for p in inbox_files)
    combined = "\n".join(parts)
    assert ("'Website'" in combined or '"Website"' in combined) and "procurement@" not in combined
    assert "thread_id" in combined and "lead_id" in combined
    assert "last_message" in combined and "latest_message" in combined and "chatwoot" in combined.lower()


@pytest.mark.tier1
def test_t1_e3_sidebar_exposes_omnichannel_inbox_and_settings():
    sidebar_bundle = _read_ts_bundle("components/Sidebar.tsx")
    assert "/campaigns/inbox" in sidebar_bundle and "/settings" in sidebar_bundle
    assert "live chat" in sidebar_bundle.lower() or "omnichannel" in sidebar_bundle.lower()


@pytest.mark.tier1
def test_t1_e4_dossier_outreach_tab_supports_website_channel():
    src = strip_ts_comments(read_frontend_file("components/dossier/DossierOutreachTab.tsx"))
    assert "'Website'" in src or '"Website"' in src
    assert "replyChannel" in src or "channel" in src
    assert "/omnichannel/threads/" in src and "/reply" in src


@pytest.mark.tier1
def test_t1_e5_settings_chatwoot_and_whatsapp_tabs_persisted_zero_placeholders():
    settings_page = strip_ts_comments(read_frontend_file("app/settings/page.tsx"))
    use_settings = strip_ts_comments(read_frontend_file("components/settings/useSettingsData.ts"))
    assert "ChatwootGatewayTab" in settings_page and "WhatsAppGatewayTab" in settings_page
    assert "/config/chatwoot" in use_settings and "/config/whatsapp" in use_settings
    for f in sorted((FRONTEND_SRC_DIR / "components" / "settings").glob("*.ts*")):
        assert "EAABwzLIX4ZAIBA" not in strip_ts_comments(f.read_text(encoding="utf-8"))


@pytest.mark.tier1
def test_t1_e6_frontend_tsc_clean_and_optional_ssr_routes(frontend_tsc_result, frontend_base_url):
    rc, output = frontend_tsc_result
    assert rc == 0, f"tsc failed:\n{output}"
    if frontend_base_url:
        for route in ("/campaigns/inbox", "/settings", "/leads/importers"):
            st, html = fetch_ssr_html(frontend_base_url, route)
            assert st == 200 and ("<!DOCTYPE html>" in html or "<html" in html) and "Application error" not in html


__all__ = [name for name in globals() if name.startswith("test_t1_")]
