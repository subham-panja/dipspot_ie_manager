"""E2E Tests — F3: Lead Notes, Timeline & Unified Outreach History API (Tier 1 & Tier 2)."""

from tests.e2e.helpers_e2e import delete_json, get_json, patch_json, post_json


# ---------------------------------------------------------------------------
# Tier 1 — Happy-Path Feature Coverage (5 tests)
# ---------------------------------------------------------------------------


def test_f3_t1_patch_lead_persists_extraction_notes(client, create_lead):
    lead = create_lead(company_name="Al Baraka Grain Trading")
    note_text = "Sent FOB Kolkata quote for 2 FCL 1121 Basmati"

    resp = patch_json(client, f"/api/leads/{lead['id']}", {"extraction_notes": note_text})
    assert resp.status_code == 200, resp.get_data(as_text=True)
    assert resp.get_json()["lead"]["extraction_notes"] == note_text

    status, fetched = get_json(client, f"/api/leads/{lead['id']}")
    assert status == 200
    assert fetched["lead"]["extraction_notes"] == note_text


def test_f3_t1_lead_notes_crud_lifecycle(client, create_lead):
    lead = create_lead(company_name="Sohar Rice Importers")
    lid = lead["id"]

    post_resp = post_json(
        client,
        f"/api/leads/{lid}/notes",
        {"note": "Buyer confirmed Jebel Ali discharge slot", "author": "Trade Ops"},
    )
    assert post_resp.status_code == 201, post_resp.get_data(as_text=True)
    created = post_resp.get_json().get("note") or post_resp.get_json()
    note_id = created.get("note_id") or created.get("id")
    assert note_id

    status, list_data = get_json(client, f"/api/leads/{lid}/notes")
    assert status == 200
    notes = list_data["notes"]
    assert len(notes) == 1
    assert "Jebel Ali" in (notes[0].get("note") or notes[0].get("text") or notes[0].get("content") or "")

    del_resp = delete_json(client, f"/api/leads/{lid}/notes/{note_id}")
    assert del_resp.status_code == 200

    _, after_del = get_json(client, f"/api/leads/{lid}/notes")
    assert after_del["notes"] == []


def test_f3_t1_lead_timeline_aggregates_chronological_events(
    client, create_lead, create_campaign
):
    lead = create_lead(company_name="Muscat Staples Co", contact_person="Salim Al Harthy")
    lid = lead["id"]

    n_resp = post_json(client, f"/api/leads/{lid}/notes", {"note": "Reviewed SGS spec sheet"})
    assert n_resp.status_code == 201

    c_resp = post_json(
        client,
        f"/api/leads/{lid}/contacts",
        {"full_name": "Salim Al Harthy", "email": "salim@muscatstaples.om"},
    )
    assert c_resp.status_code in (200, 201)

    campaign = create_campaign(name="Oman Export Q4")
    e_resp = post_json(
        client,
        f"/api/campaigns/{campaign['campaign_id']}/enroll",
        {"lead_id": lid, "enrollment_mode": "all_contacts"},
    )
    assert e_resp.status_code in (200, 201)

    status, timeline_data = get_json(client, f"/api/leads/{lid}/timeline")
    assert status == 200
    events = timeline_data["timeline"]
    assert isinstance(events, list) and len(events) >= 2
    timestamps = [ev.get("timestamp") or "" for ev in events if ev.get("timestamp")]
    assert len(timestamps) >= 2
    assert timestamps == sorted(timestamps, reverse=True) or timestamps == sorted(timestamps), (
        f"Expected timeline events in chronological order, got: {timestamps}"
    )
    serialized_text = " ".join(str(ev) for ev in events).lower()
    assert "sgs spec sheet" in serialized_text or "note" in serialized_text
    assert "oman export q4" in serialized_text or "enroll" in serialized_text


def test_f3_t1_unified_outreach_history_returns_messages_and_enrollments(
    client, create_lead, create_campaign
):
    lead = create_lead(
        company_name="Doha Grain Hub WLL",
        contact_person="Tariq Mahmood",
        emails="tariq@dohagrain.qa",
    )
    lid = lead["id"]

    c_resp = post_json(
        client,
        f"/api/leads/{lid}/contacts",
        {"full_name": "Tariq Mahmood", "email": "tariq@dohagrain.qa"},
    )
    assert c_resp.status_code in (200, 201)

    in_resp = post_json(
        client,
        "/api/omnichannel/inbound",
        {
            "lead_id": lid,
            "channel": "WhatsApp",
            "content": "Please share CIF Hamad Port quote for 3 FCL.",
        },
    )
    assert in_resp.status_code == 201

    reply_resp = post_json(
        client,
        f"/api/omnichannel/threads/{lid}/reply",
        {"channel": "WhatsApp", "content": "Quoted $690/MT CIF Hamad Port."},
    )
    assert reply_resp.status_code == 200

    campaign = create_campaign(name="Qatar Basmati Drive")
    enr_resp = post_json(
        client,
        f"/api/campaigns/{campaign['campaign_id']}/enroll",
        {"lead_id": lid, "enrollment_mode": "all_contacts"},
    )
    assert enr_resp.status_code in (200, 201)

    status, history = get_json(client, f"/api/leads/{lid}/outreach-history")
    assert status == 200
    assert str(history["lead_id"]) == str(lid)
    assert len(history["messages"]) >= 2
    assert len(history["enrollments"]) >= 1
    assert "cadence_enrollment" in history


def test_f3_t1_omnichannel_and_outreach_history_accept_objectid_and_int(client, create_lead):
    lead = create_lead(company_name="Sharjah Rice Co", emails="ops@sharjahrice.ae")
    int_id = lead["id"]
    oid = lead["_id"]
    assert oid and len(oid) == 24

    in_resp = post_json(
        client,
        "/api/omnichannel/inbound",
        {"lead_id": int_id, "channel": "WhatsApp", "content": "Send price list please"},
    )
    assert in_resp.status_code == 201

    s_int, h_int = get_json(client, f"/api/leads/{int_id}/outreach-history")
    s_oid, h_oid = get_json(client, f"/api/leads/{oid}/outreach-history")
    assert s_int == 200 and s_oid == 200
    assert len(h_int["messages"]) == len(h_oid["messages"]) >= 1

    s_thr_int, t_int = get_json(client, f"/api/omnichannel/threads/{int_id}")
    s_thr_oid, t_oid = get_json(client, f"/api/omnichannel/threads/{oid}")
    assert s_thr_int == 200 and s_thr_oid == 200
    assert len(t_int["messages"]) == len(t_oid["messages"]) >= 1


# ---------------------------------------------------------------------------
# Tier 2 — Boundary & Corner Cases (6 tests)
# ---------------------------------------------------------------------------


def test_f3_t2_extraction_notes_persistence_and_multiline_special_chars(client, create_lead):
    lead = create_lead(company_name="Special Char Traders")
    rich_note = 'Line 1: CIF Jebel Ali "$650/MT"\nLine 2: Qty 5x20ft FCL — 100% L/C\nLine 3: Café & Spices ✓'
    resp = patch_json(client, f"/api/leads/{lead['id']}", {"extraction_notes": rich_note})
    assert resp.status_code == 200

    status, fetched = get_json(client, f"/api/leads/{lead['id']}")
    assert status == 200
    assert fetched["lead"]["extraction_notes"] == rich_note


def test_f3_t2_post_note_empty_or_whitespace_rejected(client, create_lead):
    lead = create_lead(company_name="Blank Note Guard Co")
    r_empty = post_json(client, f"/api/leads/{lead['id']}/notes", {})
    r_spaces = post_json(client, f"/api/leads/{lead['id']}/notes", {"note": "   \n\t  "})
    assert r_empty.status_code == 400
    assert r_spaces.status_code == 400


def test_f3_t2_notes_and_timeline_unknown_lead_and_note_404(client, create_lead):
    lead = create_lead(company_name="Valid Note Lead")

    s_notes, _ = get_json(client, "/api/leads/999999/notes")
    s_tl, _ = get_json(client, "/api/leads/999999/timeline")
    s_oh, _ = get_json(client, "/api/leads/999999/outreach-history")
    del_bad_note = delete_json(client, f"/api/leads/{lead['id']}/notes/NOTE-NOPE-999")

    assert s_notes == 404
    assert s_tl == 404
    assert s_oh == 404
    assert del_bad_note.status_code == 404


def test_f3_t2_outreach_history_empty_for_fresh_lead(client, create_lead):
    lead = create_lead(company_name="Fresh Untouched Importer")
    status, data = get_json(client, f"/api/leads/{lead['id']}/outreach-history")
    assert status == 200
    assert data["messages"] == []
    assert data["enrollments"] == []
    assert data["cadence_enrollment"] is None


def test_f3_t2_outreach_history_with_objectid_string(client, create_lead):
    lead = create_lead(company_name="ObjectId Direct Lead")
    oid = lead["_id"]

    n_resp = post_json(client, f"/api/leads/{oid}/notes", {"note": "Created via ObjectId route"})
    assert n_resp.status_code == 201

    s_notes, d_notes = get_json(client, f"/api/leads/{oid}/notes")
    s_tl, d_tl = get_json(client, f"/api/leads/{oid}/timeline")
    s_oh, d_oh = get_json(client, f"/api/leads/{oid}/outreach-history")

    assert s_notes == 200 and len(d_notes["notes"]) == 1
    assert s_tl == 200 and isinstance(d_tl["timeline"], list)
    assert s_oh == 200 and d_oh["messages"] == []


def test_f3_t2_omnichannel_thread_handles_objectid_or_404(client, create_lead):
    lead = create_lead(company_name="Omnichannel OID Check")
    oid = lead["_id"]

    s_ok, d_ok = get_json(client, f"/api/omnichannel/threads/{oid}")
    assert s_ok == 200
    assert d_ok["lead"]["company_name"] == "Omnichannel OID Check"

    s_missing, _ = get_json(client, "/api/omnichannel/threads/000000000000000000000000")
    assert s_missing == 404
