"""E2E Tests — Tier 4: Real-World EXIM Omnichannel Scenarios (5 tests)."""

import json
import re
import shutil
import subprocess

import pytest
import requests

from tests.e2e.chatwoot_mock_server import (
    build_message_created_payload,
    configure_chatwoot_via_api,
    install_httpx_chatwoot_router,
    sign_chatwoot_webhook,
)
from tests.e2e.helpers_e2e import (
    REPO_ROOT,
    fetch_ssr_html,
    find_repo_files_over_limit,
    get_json,
    post_json,
)


def _post_wh(client, payload: dict, secret: str = "wh_test_secret_123"):
    raw = json.dumps(payload).encode("utf-8")
    return client.post("/api/omnichannel/chatwoot/webhook", data=raw, headers=sign_chatwoot_webhook(secret, raw))


@pytest.mark.tier4
def test_t4_s1_exim_buyer_negotiation_lifecycle_website_whatsapp_email(
    app, client, create_lead, fake_chatwoot_server
):
    lead = create_lead(
        company_name="Al Noor Basmati Trading LLC",
        country="United Arab Emirates",
        phones="+971501112233",
        emails="buyer@alnoor.ae",
        lead_type="importer",
    )
    lid = lead["id"]
    configure_chatwoot_via_api(client, fake_chatwoot_server)

    from app.followup_engine import FollowUpEngine
    with app.app_context():
        FollowUpEngine.get_cadences()
        FollowUpEngine.enroll_lead(lid, "CAD-COMMERCIAL-OUTREACH")

    assert post_json(client, f"/api/omnichannel/threads/{lid}/sync", {}).status_code == 200
    assert _post_wh(
        client,
        build_message_created_payload(
            message_id=8101, conversation_id=8101, inbox_id=12, channel_type="Channel::WebWidget",
            content="Looking for 1121 Basmati specs and moisture certificate",
            sender={"id": 501, "name": "Buyer", "identifier": f"tradepulse_lead_{lid}"},
        ),
    ).status_code in (200, 201)

    draft_resp = post_json(client, f"/api/omnichannel/threads/{lid}/ai-draft", {"channel": "Website"})
    assert draft_resp.status_code == 200 and draft_resp.get_json().get("draft_content")

    assert post_json(client, f"/api/omnichannel/threads/{lid}/reply", {"channel": "WhatsApp", "content": "Sent 1121 specs on WA"}).status_code == 200
    assert post_json(client, f"/api/omnichannel/threads/{lid}/reply", {"channel": "Email", "subject": "Proforma 1121", "content": "Attached Proforma"}).status_code == 200

    assert _post_wh(
        client,
        build_message_created_payload(
            message_id=8102, conversation_id=8102, inbox_id=10, channel_type="Channel::Email",
            content="Send final CIF quotation for 5 FCL",
            sender={"id": 502, "name": "Buyer", "email": "buyer@alnoor.ae"},
        ),
    ).status_code in (200, 201)

    _, det = get_json(client, f"/api/omnichannel/threads/{lid}")
    assert det["cadence_enrollment"]["status"] == "Paused (Client Replied)"
    assert det["lead"]["deal_status"] == "negotiation"

    _, tl = get_json(client, f"/api/leads/{lid}/timeline")
    _, oh = get_json(client, f"/api/leads/{lid}/outreach-history")
    channels = {m["channel"] for m in oh["messages"]}
    assert {"Website", "WhatsApp", "Email"}.issubset(channels)
    assert len(tl["timeline"]) >= 4
    out_posts = [r for r in fake_chatwoot_server.requests_log if r["method"] == "POST" and r["path"].endswith("/messages")]
    assert len(out_posts) >= 2


@pytest.mark.tier4
def test_t4_s2_multi_country_strict_geo_isolation_and_zero_mock_email(
    client, create_lead, fake_chatwoot_server
):
    togo = create_lead(company_name="Lome Grain SARL", country="Togo", city_or_hub="Lome", phones="+22890112233", emails="", lead_type="importer")
    uae = create_lead(company_name="Dubai Pearl Foods", country="United Arab Emirates", city_or_hub="Dubai", phones="+971504445566", emails="uae@dubaipearl.ae", lead_type="importer")
    india = create_lead(company_name="Bardhaman Mill Pvt Ltd", country="India", city_or_hub="Burdwan", phones="+919830011223", emails="", lead_type="wb_mill")
    configure_chatwoot_via_api(client, fake_chatwoot_server)

    for ld in (togo, uae, india):
        assert post_json(client, f"/api/omnichannel/threads/{ld['id']}/sync", {}).status_code == 200

    assert _post_wh(client, build_message_created_payload(
        message_id=8201, conversation_id=8201, inbox_id=11, channel_type="Channel::Whatsapp",
        content="Lome CIF price?", sender={"id": 601, "name": "Lome", "phone_number": "+22890112233"},
    )).status_code in (200, 201)
    assert _post_wh(client, build_message_created_payload(
        message_id=8202, conversation_id=8202, inbox_id=10, channel_type="Channel::Email",
        content="Dubai quote?", sender={"id": 602, "name": "Dubai", "email": "uae@dubaipearl.ae"},
    )).status_code in (200, 201)
    assert _post_wh(client, build_message_created_payload(
        message_id=8203, conversation_id=8203, inbox_id=12, channel_type="Channel::WebWidget",
        content="Milling slot ready", sender={"id": 603, "name": "Mill", "identifier": f"tradepulse_lead_{india['id']}"},
    )).status_code in (200, 201)

    for contact in fake_chatwoot_server.contacts.values():
        em = contact.get("email") or ""
        assert "@example.com" not in em and "trade@" not in em

    st_tg, tg_list = get_json(client, "/api/leads/importers?country=Togo")
    assert st_tg == 200
    tg_names = {x["company_name"] for x in tg_list.get("importers", tg_list.get("leads", []))}
    assert "Lome Grain SARL" in tg_names
    assert "Dubai Pearl Foods" not in tg_names and "Bardhaman Mill Pvt Ltd" not in tg_names
    assert (get_json(client, f"/api/leads/{togo['id']}")[1]["lead"].get("emails") or "") == ""
    assert (get_json(client, f"/api/leads/{india['id']}")[1]["lead"].get("emails") or "") == ""


@pytest.mark.tier4
def test_t4_s3_full_stack_compose_env_backend_frontend_coherence_audit(
    live_api_url, frontend_base_url, frontend_tsc_result
):
    compose_txt = (REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    env_txt = (REPO_ROOT / ".env.example").read_text(encoding="utf-8")
    env_keys = {line.split("=", 1)[0].strip() for line in env_txt.splitlines() if "=" in line and not line.strip().startswith("#")}
    used_vars = set(re.findall(r"\$\{((?:CHATWOOT|WHATSAPP|NEXT_PUBLIC_CHATWOOT)_[A-Z0-9_]+)", compose_txt))
    missing = sorted(v for v in used_vars if v not in env_keys)
    assert missing == [], f"Undocumented compose vars in .env.example: {missing}"
    assert "EAABwz" not in compose_txt and "EAABwz" not in env_txt
    if shutil.which("docker"):
        assert subprocess.run(["docker", "compose", "config", "--quiet"], cwd=str(REPO_ROOT), capture_output=True).returncode == 0

    rc, tsc_out = frontend_tsc_result
    assert rc == 0, f"TypeScript check failed:\n{tsc_out}"
    assert find_repo_files_over_limit(500) == []

    for path in ("/api/config/chatwoot", "/api/omnichannel/chatwoot/status", "/api/omnichannel/chatwoot/widget-config"):
        r = requests.get(f"{live_api_url}{path}", timeout=5.0)
        assert r.status_code == 200, f"{path} returned {r.status_code}"

    if frontend_base_url:
        for route in ("/campaigns/inbox", "/settings"):
            st, html = fetch_ssr_html(frontend_base_url, route)
            assert st == 200 and ("<!DOCTYPE html>" in html or "<html" in html)


@pytest.mark.tier4
def test_t4_s4_email_quota_exhaustion_mid_campaign_whatsapp_website_continue(
    app, client, create_lead, fake_chatwoot_server
):
    lead = create_lead(emails="t4s4@alfazal.ae", phones="+971505556677")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    from app.followup_engine import FollowUpEngine
    from app.smtp_stopper import SmtpQuotaManager
    with app.app_context():
        SmtpQuotaManager.configure_quota(daily_limit=2)
        FollowUpEngine.get_cadences()
        FollowUpEngine.enroll_lead(lead["id"], "CAD-COMMERCIAL-OUTREACH")

    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Email", "content": "E1"}).status_code == 200
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Email", "content": "E2"}).status_code == 200
    before_block = len([r for r in fake_chatwoot_server.requests_log if r["method"] == "POST" and r["path"].endswith("/messages")])

    r3 = post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Email", "content": "E3"})
    assert r3.status_code == 429 and r3.get_json()["error"] == "GMAIL_SMTP_HARD_STOPPED"
    assert len([r for r in fake_chatwoot_server.requests_log if r["method"] == "POST" and r["path"].endswith("/messages")]) == before_block

    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "WhatsApp", "content": "WA fallback"}).status_code == 200
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Website", "content": "Web fallback"}).status_code == 200
    assert len([r for r in fake_chatwoot_server.requests_log if r["method"] == "POST" and r["path"].endswith("/messages")]) == before_block + 2

    for idx, (ch_type, iid) in enumerate((("Channel::Email", 10), ("Channel::Whatsapp", 11), ("Channel::WebWidget", 12)), start=1):
        assert _post_wh(client, build_message_created_payload(
            message_id=8400 + idx, conversation_id=8400 + idx, inbox_id=iid, channel_type=ch_type,
            content=f"Client reply {idx}", sender={"id": 650, "name": "Buyer", "email": "t4s4@alfazal.ae"},
        )).status_code in (200, 201)
    _, det = get_json(client, f"/api/omnichannel/threads/{lead['id']}")
    assert det["cadence_enrollment"]["status"] == "Paused (Client Replied)"


@pytest.mark.tier4
def test_t4_s5_chatwoot_offline_disaster_resilience_and_recovery_sync(
    client, create_lead, fake_chatwoot_server, monkeypatch
):
    lead = create_lead(emails="resilient@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/sync", {}).status_code == 200

    # Simulate outage
    install_httpx_chatwoot_router(monkeypatch, fake_chatwoot_server, closed_port=True)
    assert get_json(client, "/api/omnichannel/chatwoot/status")[1]["reachable"] is False
    assert post_json(client, "/api/config/chatwoot/test", {}).get_json()["reachable"] is False

    r_wa = post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "WhatsApp", "content": "Offline WA msg"})
    r_web = post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Website", "content": "Offline Web msg"})
    assert r_wa.status_code == 200 and r_wa.get_json()["record"]["chatwoot_synced"] is False
    assert r_web.status_code == 200 and r_web.get_json()["record"]["chatwoot_synced"] is False

    # Restore online and reconcile
    install_httpx_chatwoot_router(monkeypatch, fake_chatwoot_server, closed_port=False)
    assert post_json(client, "/api/omnichannel/chatwoot/sync", {}).status_code == 200
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/sync", {}).status_code == 200
    _, det = get_json(client, f"/api/omnichannel/threads/{lead['id']}")
    assert len(det["messages"]) == 2
    assert all(m.get("chatwoot_synced") is True for m in det["messages"])


__all__ = [name for name in globals() if name.startswith("test_t4_")]
