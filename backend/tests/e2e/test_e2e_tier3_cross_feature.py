"""E2E Tests — Tier 3: Cross-Feature Pairwise Integrations (12 tests)."""

import re
import pytest

from tests.e2e.helpers_e2e import (
    assert_enrollment_wired_across_pages,
    assert_zero_mock_xray_response,
    delete_json,
    extract_jsx_after,
    fetch_ssr_html,
    get_dossier_header_source,
    get_enroll_modal_source,
    get_json,
    get_right_column_sources,
    get_tabs_bundle,
    patch_json,
    post_json,
    read_frontend_file,
    strip_ts_comments,
)


def test_t3_f5_plus_f1_xray_persist_creates_m2m_contacts_and_dedups(
    client, create_lead, serp_server, monkeypatch
):
    serp_server.mode = "bing_valid"
    serp_server.route_search_engines(monkeypatch)
    lead_a = create_lead(company_name="Al Fazal Rice Trading LLC", contact_person="")
    lead_b = create_lead(company_name="Al Fazal Logistics Group", contact_person="")

    r_a = post_json(
        client,
        "/api/xray/search",
        {
            "company_name": "Al Fazal Rice Trading LLC",
            "country": "United Arab Emirates",
            "lead_id": lead_a["id"],
            "persist": True,
        },
    )
    assert r_a.status_code == 200
    assert len(r_a.get_json()["persisted_contacts"]) == 2

    serp_server.profiles = [serp_server.profiles[0]]
    r_b = post_json(
        client,
        "/api/xray/search",
        {
            "company_name": "Al Fazal Logistics Group",
            "country": "United Arab Emirates",
            "lead_id": lead_b["id"],
            "persist": True,
        },
    )
    assert r_b.status_code == 200
    assert len(r_b.get_json()["persisted_contacts"]) == 1

    _, c_a = get_json(client, f"/api/leads/{lead_a['id']}/contacts")
    _, c_b = get_json(client, f"/api/leads/{lead_b['id']}/contacts")
    shared_id = c_b["contacts"][0]["contact_id"]
    assert shared_id in {c["contact_id"] for c in c_a["contacts"]}

    _, global_contacts = get_json(client, "/api/contacts")
    assert global_contacts["total"] == 2


def test_t3_f1_plus_f2_shared_contact_single_vs_all_enrollment(
    client, create_lead, create_campaign
):
    comp_a = create_lead(company_name="Gulf Alpha Foods", contact_person="")
    comp_b = create_lead(company_name="Gulf Beta Foods", contact_person="")

    r1 = post_json(
        client,
        f"/api/leads/{comp_a['id']}/contacts",
        {
            "full_name": "Shared Director",
            "email": "shared@gulfgroup.ae",
            "linkedin_profile_url": "https://www.linkedin.com/in/shared-director-ae",
        },
    )
    assert r1.status_code == 201
    c1_id = r1.get_json()["contact"]["contact_id"]

    r2 = post_json(
        client,
        f"/api/leads/{comp_a['id']}/contacts",
        {"full_name": "Alpha Only Buyer", "email": "alpha@gulfgroup.ae"},
    )
    assert r2.status_code == 201

    r_link = post_json(client, f"/api/leads/{comp_b['id']}/contacts", {"contact_id": c1_id})
    assert r_link.status_code in (200, 201)

    camp1 = create_campaign(name="Campaign One Single")
    camp2 = create_campaign(name="Campaign Two All")

    e1 = post_json(
        client,
        f"/api/campaigns/{camp1['campaign_id']}/enroll",
        {"lead_id": comp_a["id"], "enrollment_mode": "single_contact", "contact_id": c1_id},
    )
    e2 = post_json(
        client,
        f"/api/campaigns/{camp2['campaign_id']}/enroll",
        {"lead_id": comp_b["id"], "enrollment_mode": "all_contacts"},
    )
    assert e1.status_code in (200, 201) and e2.status_code in (200, 201)

    del_resp = delete_json(client, f"/api/leads/{comp_a['id']}/contacts/{c1_id}")
    assert del_resp.status_code == 200

    _, b_contacts = get_json(client, f"/api/leads/{comp_b['id']}/contacts")
    assert [c["contact_id"] for c in b_contacts["contacts"]] == [c1_id]
    _, camp2_enr = get_json(client, f"/api/campaigns/{camp2['campaign_id']}/enrollments")
    assert len(camp2_enr["enrollments"]) == 1 and camp2_enr["enrollments"][0]["contact_id"] == c1_id


def test_t3_f2_plus_f3_enroll_appears_in_outreach_history_and_timeline(
    client, create_lead, create_campaign
):
    lead = create_lead(company_name="Ajman Grain Trading", contact_person="Omar Farooq", emails="omar@ajman.ae")
    lid = lead["id"]
    post_json(client, f"/api/leads/{lid}/notes", {"note": "Confirmed 1121 Basmati sample dispatch"})
    get_json(client, f"/api/leads/{lid}/contacts")

    camp = create_campaign(name="Ajman Ramadan Offer")
    enr = post_json(
        client,
        f"/api/campaigns/{camp['campaign_id']}/enroll",
        {"lead_id": lid, "enrollment_mode": "all_contacts"},
    )
    assert enr.status_code in (200, 201)

    _, oh = get_json(client, f"/api/leads/{lid}/outreach-history")
    _, tl = get_json(client, f"/api/leads/{lid}/timeline")
    assert len(oh["enrollments"]) == 1
    assert any("ajman ramadan offer" in str(ev).lower() or "enroll" in str(ev).lower() for ev in tl["timeline"])


def test_t3_f4_plus_f9_r4_metadata_api_matches_right_column_contract(client, create_lead):
    lead = create_lead(
        company_name="Jebel Ali Rice Imports",
        origin_state="Punjab",
        b2b_directory="Dubai Chamber Directory",
        harvest_date="2026-10-18",
        source_name="ExportMandi",
        source_category="B2B Trade Portal",
        customs_manifest_data="BL-AEJEA-1091 | 100 MT",
        shipment_volume="4 FCL/mo",
        annual_volume_est="1,200 MT / Year",
    )
    _, data = get_json(client, f"/api/leads/{lead['id']}")
    api_lead = data["lead"]

    right_src, _ = get_right_column_sources()
    types_src = strip_ts_comments(read_frontend_file("components/dossier/dossierTypes.ts"))
    for key in (
        "origin_state",
        "b2b_directory",
        "harvest_date",
        "customs_manifest_data",
        "source_name",
        "source_category",
        "shipment_volume",
        "annual_volume_est",
        "nearest_port",
    ):
        assert key in api_lead
        assert key in right_src and key in types_src


def test_t3_f1_plus_f8_m2m_contacts_api_matches_contacts_tab_ui(client, create_lead):
    comp_a = create_lead(company_name="Company One Imports", contact_person="")
    comp_b = create_lead(company_name="Company Two Imports", contact_person="")
    r = post_json(
        client,
        "/api/contacts",
        {
            "full_name": "Sameer Verma",
            "job_title": "Sourcing Lead",
            "linkedin_profile_url": "https://www.linkedin.com/in/sameer-verma-trade",
            "lead_ids": [comp_a["id"], comp_b["id"]],
        },
    )
    assert r.status_code == 201
    _, data = get_json(client, f"/api/leads/{comp_a['id']}/contacts")
    c = data["contacts"][0]
    assert len(c["companies"]) == 2

    _, tabs_all_src, _ = get_tabs_bundle()
    for field in ("full_name", "job_title", "linkedin_profile_url", "companies"):
        assert field in c and field in tabs_all_src


def test_t3_f6_plus_f7_75vw_and_full_page_preserve_map_and_3_tabs():
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    header_src = get_dossier_header_source()
    tabs_src, _, _ = get_tabs_bundle()

    assert "75vw" in dossier_src
    assert re.search(r"full.?page", dossier_src + header_src, re.I)
    assert header_src.count("Back") >= 1
    jsx = extract_jsx_after(dossier_src, "return (")
    map_pos = jsx.find("<DossierMapSection")
    trade_pos = jsx.find("<DossierTradeStats")
    tabs_match = re.search(r"<Dossier\w*Tabs\b", jsx)
    tabs_pos = tabs_match.start() if tabs_match else (
        map_pos + jsx[map_pos:trade_pos].find("Contacts")
        if map_pos != -1 and trade_pos != -1 and "Contacts" in jsx[map_pos:trade_pos]
        else -1
    )
    assert map_pos != -1 and tabs_pos != -1 and trade_pos != -1
    assert map_pos < tabs_pos < trade_pos
    assert "Contacts" in tabs_src and "Notes" in tabs_src


def test_t3_f8_plus_f10_contacts_tab_to_dual_enrollment_modal_flow(
    client, create_lead, create_campaign
):
    lead = create_lead(company_name="Modal Flow Importer", contact_person="")
    c_resp = post_json(
        client,
        f"/api/leads/{lead['id']}/contacts",
        {"full_name": "Layla Mansour", "email": "layla@modalflow.ae"},
    )
    cid = c_resp.get_json()["contact"]["contact_id"]
    camp = create_campaign(name="Modal Flow Campaign")

    _, modal_src = get_enroll_modal_source()
    assert re.search(r"/leads/\$\{[^}]+\}/contacts|/contacts\?lead_id=\$\{[^}]+\}", modal_src)
    assert re.search(r"/campaigns/\$\{[^}]+\}/enroll", modal_src)
    assert "single_contact" in modal_src and "contact_id" in modal_src

    enr = post_json(
        client,
        f"/api/campaigns/{camp['campaign_id']}/enroll",
        {"lead_id": lead["id"], "enrollment_mode": "single_contact", "contact_id": cid},
    )
    assert enr.status_code in (200, 201) and enr.get_json()["enrolled_count"] == 1


def test_t3_f3_plus_f7_notes_and_outreach_apis_match_tabs_2_and_3(client, create_lead):
    lead = create_lead(company_name="Tab Parity Foods")
    lid = lead["id"]
    patch_json(client, f"/api/leads/{lid}", {"extraction_notes": "Initial CIF inquiry"})
    post_json(client, f"/api/leads/{lid}/notes", {"note": "Follow-up call scheduled"})
    _, tl = get_json(client, f"/api/leads/{lid}/timeline")
    _, oh = get_json(client, f"/api/leads/{lid}/outreach-history")
    assert "timeline" in tl
    assert {"messages", "enrollments", "cadence_enrollment"}.issubset(oh.keys())

    tabs_entry_src, tabs_all_src, panel_files = get_tabs_bundle()
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    outreach_src = next(
        (src for rel, src in panel_files.items() if "outreach" in rel.lower()),
        tabs_all_src,
    )
    notes_src = next(
        (src for rel, src in panel_files.items() if "notes" in rel.lower()),
        tabs_all_src,
    )
    assert "outreach-history" in outreach_src
    assert "messages" in outreach_src and "enrollments" in outreach_src
    notes_and_delegates = notes_src + "\n" + tabs_entry_src + "\n" + dossier_src
    assert re.search(r"/leads/\$\{[^}]+\}/(notes|timeline)", notes_and_delegates), (
        "Expected Notes/Timeline UI or onAddNote handler to wire /leads/<id>/notes or /leads/<id>/timeline"
    )
    assert "extraction_notes" in notes_and_delegates


def test_t3_f5_plus_f8_offline_xray_fallbacks_match_ui_fallback_links(
    client, serp_server, monkeypatch
):
    serp_server.route_search_engines(monkeypatch, closed_port=True)
    resp = post_json(
        client,
        "/api/xray/search",
        {"company_name": "Offline Parity Corp", "website": "https://offlineparity.ae"},
    )
    assert resp.status_code == 200
    assert_zero_mock_xray_response(resp.get_json(), expect_website_domain="offlineparity.ae")

    _, tabs_all_src, panel_files = get_tabs_bundle()
    xray_src = panel_files.get("components/dossier/DossierXraySection.tsx", tabs_all_src)
    for key in ("linkedin_keyword_search_url", "search_urls", "corporate_contact_urls"):
        assert key in xray_src


def test_t3_f4_plus_f6_importer_and_supplier_pages_serve_with_r4_endpoints(
    client, create_lead, frontend_base_url
):
    create_lead(
        company_name="SSR R4 Importer",
        lead_type="importer",
        country="United Arab Emirates",
        origin_state="Punjab",
        b2b_directory="Gulf Trade Portal",
    )
    create_lead(
        company_name="SSR R4 Supplier",
        lead_type="wb_mill",
        country="India",
        state="West Bengal",
        origin_state="West Bengal",
    )
    s_imp, d_imp = get_json(client, "/api/leads/importers")
    s_sup, d_sup = get_json(client, "/api/leads/suppliers")
    assert s_imp == 200 and len(d_imp["importers"]) >= 1
    assert s_sup == 200 and len(d_sup["suppliers"]) >= 1
    assert "origin_state" in d_imp["importers"][0]
    assert "origin_state" in d_sup["suppliers"][0]

    if frontend_base_url:
        for route in ("/leads/importers", "/leads/suppliers"):
            st, html = fetch_ssr_html(frontend_base_url, route)
            assert st == 200 and "<!DOCTYPE html>" in html


def test_t3_f2_plus_f10_pipeline_importers_suppliers_enroll_parity(
    client, create_lead, create_campaign
):
    assert_enrollment_wired_across_pages()

    lead = create_lead(company_name="Parity Enroll Co", contact_person="Imran Khan", emails="imran@parity.ae")
    get_json(client, f"/api/leads/{lead['id']}/contacts")
    camp = create_campaign(name="Parity Campaign")
    resp = post_json(
        client,
        f"/api/campaigns/{camp['campaign_id']}/enroll",
        {"lead_id": lead["id"], "enrollment_mode": "all_contacts"},
    )
    assert resp.status_code in (200, 201) and resp.get_json()["enrolled_count"] == 1


def test_t3_f1_plus_f3_backfilled_contact_and_notes_in_unified_audit(client, create_lead):
    lead = create_lead(
        company_name="Unified Audit Trading",
        contact_person="Bilal Qureshi",
        emails="bilal@unifiedaudit.ae",
        phones="+971509998877",
    )
    lid = lead["id"]
    _, contacts = get_json(client, f"/api/leads/{lid}/contacts")
    assert len(contacts["contacts"]) == 1

    post_json(client, f"/api/leads/{lid}/notes", {"note": "Verified LC terms with Bilal"})
    post_json(
        client,
        f"/api/omnichannel/threads/{lid}/reply",
        {"channel": "WhatsApp", "content": "Shared proforma invoice"},
    )
    _, tl = get_json(client, f"/api/leads/{lid}/timeline")
    _, oh = get_json(client, f"/api/leads/{lid}/outreach-history")
    assert len(tl["timeline"]) >= 1
    assert len(oh["messages"]) == 1
