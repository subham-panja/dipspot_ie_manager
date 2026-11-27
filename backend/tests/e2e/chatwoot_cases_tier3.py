"""E2E Tests — Tier 3: Cross-Feature Pairwise Interactions (10 tests)."""

import hashlib
import hmac
import json

import pytest

from tests.e2e.chatwoot_mock_server import (
    build_lifecycle_event_payload,
    build_message_created_payload,
    configure_chatwoot_via_api,
    sign_chatwoot_webhook,
)
from tests.e2e.helpers_e2e import (
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


def _post_wh(client, payload: dict, secret: str = "wh_test_secret_123"):
    raw = json.dumps(payload).encode("utf-8")
    return client.post("/api/omnichannel/chatwoot/webhook", data=raw, headers=sign_chatwoot_webhook(secret, raw))


@pytest.mark.tier3
def test_t3_01_outbound_reply_then_inbound_webhook_pauses_cadence_and_updates_timeline(
    app, client, create_lead, fake_chatwoot_server
):
    lead = create_lead(emails="t301@alfazal.ae", phones="+971501119900")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    from app.followup_engine import FollowUpEngine
    with app.app_context():
        FollowUpEngine.get_cadences()
        FollowUpEngine.enroll_lead(lead["id"], "CAD-COMMERCIAL-OUTREACH")

    r_out = post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "WhatsApp", "content": "Spot 1121 offer"})
    assert r_out.status_code == 200
    rec = r_out.get_json()["record"]
    conv_id = int(rec["chatwoot_conversation_id"])
    assert any(r["method"] == "POST" and f"/conversations/{conv_id}/messages" in r["path"] for r in fake_chatwoot_server.requests_log)

    wh = build_message_created_payload(
        message_id=7301, conversation_id=conv_id, inbox_id=11, channel_type="Channel::Whatsapp",
        message_type="incoming", content="Please send CIF quotation for 10 FCL",
        sender={"id": 350, "name": "Tariq", "phone_number": "+971501119900"},
    )
    assert _post_wh(client, wh).status_code in (200, 201)

    _, det = get_json(client, f"/api/omnichannel/threads/{lead['id']}")
    assert det["cadence_enrollment"]["status"] == "Paused (Client Replied)"
    assert det["cadence_enrollment"]["has_replied"] is True
    assert det["lead"]["deal_status"] == "negotiation"

    st_tl, tl = get_json(client, f"/api/leads/{lead['id']}/timeline")
    assert st_tl == 200
    types = {e.get("type") for e in tl["timeline"]}
    assert "message_outbound" in types and "message_inbound" in types


@pytest.mark.tier3
def test_t3_02_config_patch_drives_widget_config_hmac_and_test_probe(client, fake_chatwoot_server):
    configure_chatwoot_via_api(client, fake_chatwoot_server, website_token="tok_pair_02", website_hmac_secret="hmac_pair_02")
    st_w, w_cfg = get_json(client, "/api/config/chatwoot/widget")
    assert st_w == 200 and w_cfg["hmac_enabled"] is True and w_cfg["website_token"] == "tok_pair_02"
    st_wc, wc = get_json(client, "/api/omnichannel/chatwoot/widget-config?identifier=u_1")
    assert st_wc == 200 and wc["identifier_hash"] == hmac.new(b"hmac_pair_02", b"u_1", hashlib.sha256).hexdigest()
    r_test = post_json(client, "/api/config/chatwoot/test", {})
    assert r_test.status_code == 200 and r_test.get_json()["reachable"] is True and len(r_test.get_json()["inboxes"]) == 3


@pytest.mark.tier3
def test_t3_03_lead_sync_then_inbound_webhook_resolves_same_lead_no_duplicate(
    app, client, create_lead, fake_chatwoot_server
):
    lead = create_lead(emails="t303@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/sync", {}).status_code == 200
    _, det = get_json(client, f"/api/omnichannel/threads/{lead['id']}")
    conv_id = int(det["chatwoot"]["conversation_id"])
    contact_id = int(det["chatwoot"]["contact_id"])

    wh = build_message_created_payload(
        message_id=7303, conversation_id=conv_id, inbox_id=12, channel_type="Channel::WebWidget",
        message_type="incoming", content="Replying via synced conv only",
        sender={"id": contact_id, "name": "Synced Buyer"},
    )
    assert _post_wh(client, wh).status_code in (200, 201)
    _, thr = get_json(client, "/api/omnichannel/threads")
    assert all(not t.get("is_visitor_thread") for t in thr["threads"])
    _, det2 = get_json(client, f"/api/omnichannel/threads/{lead['id']}")
    assert len(det2["messages"]) == 1
    from app.db import get_db
    with app.app_context():
        assert get_db().leads.count_documents({}) == 1


@pytest.mark.tier3
def test_t3_04_multichannel_interleaving_email_whatsapp_website_history_and_ai_draft(
    client, create_lead, fake_chatwoot_server
):
    lead = create_lead(emails="t304@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    wh = build_message_created_payload(
        message_id=7304, conversation_id=7304, inbox_id=12, channel_type="Channel::WebWidget",
        content="Website quote ask", sender={"id": 360, "name": "Buyer", "identifier": f"tradepulse_lead_{lead['id']}"},
    )
    assert _post_wh(client, wh).status_code in (200, 201)
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "WhatsApp", "content": "WA follow"}).status_code == 200
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Email", "content": "Email SCO"}).status_code == 200

    _, thr = get_json(client, "/api/omnichannel/threads")
    t_row = next(t for t in thr["threads"] if str(t["lead_id"]) == str(lead["id"]))
    assert t_row["total_messages"] >= 3
    _, oh = get_json(client, f"/api/leads/{lead['id']}/outreach-history")
    assert [m["channel"] for m in oh["messages"]][-3:] == ["Website", "WhatsApp", "Email"]
    drafts = {ch: post_json(client, f"/api/omnichannel/threads/{lead['id']}/ai-draft", {"channel": ch}).get_json()["draft_content"] for ch in ("Email", "WhatsApp", "Website")}
    assert len(set(drafts.values())) >= 2


@pytest.mark.tier3
def test_t3_05_objectid_vs_int_lead_id_parity_across_chatwoot_sync_and_routes(
    client, create_lead, fake_chatwoot_server
):
    lead = create_lead(emails="t305@alfazal.ae")
    oid, iid = str(lead["_id"]), str(lead["id"])
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    assert post_json(client, f"/api/omnichannel/threads/{oid}/sync", {}).status_code == 200
    assert post_json(client, f"/api/omnichannel/threads/{iid}/reply", {"channel": "Website", "content": "Msg 1"}).status_code == 200
    _post_wh(client, build_message_created_payload(
        message_id=7305, conversation_id=7305, inbox_id=12, channel_type="Channel::WebWidget",
        content="Msg 2", sender={"id": 365, "name": "Buyer", "identifier": f"tradepulse_lead_{iid}"},
    ))
    _, d_oid = get_json(client, f"/api/omnichannel/threads/{oid}")
    _, d_iid = get_json(client, f"/api/omnichannel/threads/{iid}")
    assert len(d_oid["messages"]) == len(d_iid["messages"]) == 2
    assert d_oid["chatwoot"]["conversation_id"] == d_iid["chatwoot"]["conversation_id"]
    _, tl = get_json(client, f"/api/leads/{oid}/timeline")
    _, oh = get_json(client, f"/api/leads/{iid}/outreach-history")
    assert len(oh["messages"]) == 2 and any(e.get("channel") == "Website" for e in tl["timeline"])


@pytest.mark.tier3
def test_t3_06_whatsapp_and_chatwoot_config_coherence_with_status_endpoints(
    client, create_lead, fake_chatwoot_server
):
    lead = create_lead(phones="+971509998877")
    assert patch_json(client, "/api/config/whatsapp", {"phone_number_id": "109849201948291", "access_token": "wa_sec_306"}).status_code == 200
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "WhatsApp", "content": "WA status test"}).status_code == 200
    _, cw_s = get_json(client, "/api/omnichannel/chatwoot/status")
    _, wa_s = get_json(client, "/api/omnichannel/whatsapp/status")
    assert cw_s["reachable"] is True and wa_s["daily_messages_sent"] >= 1
    assert "wa_sec_306" not in json.dumps(cw_s) + json.dumps(wa_s)


@pytest.mark.tier3
def test_t3_07_whatsapp_opt_out_stop_webhook_pauses_cadence_without_negotiation_promotion(
    app, client, create_lead, fake_chatwoot_server
):
    lead = create_lead(phones="+971507776655", emails="", deal_status="new")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    from app.followup_engine import FollowUpEngine
    with app.app_context():
        FollowUpEngine.get_cadences()
        FollowUpEngine.enroll_lead(lead["id"], "CAD-COMMERCIAL-OUTREACH")

    wh = build_message_created_payload(
        message_id=7307, conversation_id=7307, inbox_id=11, channel_type="Channel::Whatsapp",
        content="STOP sending messages, unsubscribe",
        sender={"id": 370, "name": "Buyer", "phone_number": "+971507776655"},
    )
    assert _post_wh(client, wh).status_code in (200, 201)
    _, det = get_json(client, f"/api/omnichannel/threads/{lead['id']}")
    assert "Unsubscribe" in det["messages"][-1]["intent"]
    assert det["cadence_enrollment"]["status"] == "Paused (Client Replied)"
    assert det["lead"]["deal_status"] != "negotiation"


@pytest.mark.tier3
def test_t3_08_global_chatwoot_sync_pulls_mapped_and_visitor_conversations(
    app, client, create_lead, fake_chatwoot_server
):
    lead = create_lead(emails="t308@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    fake_chatwoot_server.seed_conversation(
        conv_id=981, contact_id=481, inbox_id=10, channel_type="Channel::Email",
        name="Mapped Buyer", email="t308@alfazal.ae", identifier=f"tradepulse_lead_{lead['id']}", message_text="Mapped ask",
    )
    fake_chatwoot_server.seed_conversation(
        conv_id=982, contact_id=482, inbox_id=12, channel_type="Channel::WebWidget",
        name="Anon Visitor", message_text="Unmapped ask",
    )
    assert post_json(client, "/api/omnichannel/chatwoot/sync", {}).status_code == 200
    _, thr = get_json(client, "/api/omnichannel/threads")
    _, cw_convs = get_json(client, "/api/omnichannel/chatwoot/conversations")
    assert len(cw_convs["conversations"]) >= 2
    assert any(str(t.get("lead_id")) == str(lead["id"]) for t in thr["threads"])
    assert any(t.get("thread_id") == "cw_conv_982" for t in thr["threads"])
    from app.db import get_db
    with app.app_context():
        assert get_db().leads.count_documents({}) == 1


@pytest.mark.tier3
def test_t3_09_backend_api_payload_keys_match_frontend_typescript_contracts(
    client, create_lead, fake_chatwoot_server
):
    lead = create_lead(emails="t309@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/reply", {"channel": "Website", "content": "Parity msg"}).status_code == 200
    _, thr = get_json(client, "/api/omnichannel/threads")
    _, w_cfg = get_json(client, "/api/omnichannel/chatwoot/widget-config")
    _, cw_cfg = get_json(client, "/api/config/chatwoot")

    inbox_types = _read_ts_bundle("components/campaigns/inbox/inboxTypes.ts")
    widget_bundle = _read_ts_bundle("components/ChatwootWidget.tsx")
    gw_bundle = _read_ts_bundle("components/settings/ChatwootGatewayTab.tsx")

    row = thr["threads"][0]
    for k in ("thread_id", "lead_id", "last_message", "latest_intent", "last_activity_at"):
        assert k in row and k in inbox_types
    for k in ("enabled", "base_url", "website_token"):
        assert k in w_cfg and k in widget_bundle
    for k in ("base_url", "public_url", "account_id", "has_api_token"):
        assert k in cw_cfg and k in gw_bundle


@pytest.mark.tier3
def test_t3_10_conversation_status_changed_syncs_with_thread_detail_metadata(
    client, create_lead, fake_chatwoot_server
):
    lead = create_lead(emails="t310@alfazal.ae")
    configure_chatwoot_via_api(client, fake_chatwoot_server)
    assert post_json(client, f"/api/omnichannel/threads/{lead['id']}/sync", {}).status_code == 200
    _, det = get_json(client, f"/api/omnichannel/threads/{lead['id']}")
    conv_id = int(det["chatwoot"]["conversation_id"])

    assert _post_wh(client, build_lifecycle_event_payload("conversation_status_changed", conversation_id=conv_id, status="resolved")).status_code == 200
    _, det_res = get_json(client, f"/api/omnichannel/threads/{lead['id']}")
    assert det_res["chatwoot"].get("status") == "resolved"

    assert _post_wh(client, build_lifecycle_event_payload("conversation_status_changed", conversation_id=conv_id, status="open")).status_code == 200
    _, det_open = get_json(client, f"/api/omnichannel/threads/{lead['id']}")
    assert det_open["chatwoot"].get("status") == "open"


__all__ = [name for name in globals() if name.startswith("test_t3_")]
