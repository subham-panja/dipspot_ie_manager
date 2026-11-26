"""E2E Tests — Tier 4: Real-World End-to-End Application Scenarios (5 tests)."""

import pytest
import requests

from tests.e2e.helpers_e2e import (
    assert_zero_mock_xray_response,
    delete_json,
    fetch_ssr_html,
    find_repo_files_over_limit,
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


def test_t4_w1_dubai_basmati_importer_full_dossier_lifecycle(
    client, create_campaign, serp_server, monkeypatch, frontend_base_url
):
    serp_server.mode = "bing_valid"
    serp_server.profiles = [
        {
            "name": "Yusuf Al Habtoor",
            "title": "Procurement Director",
            "company": "Al Noor Basmati Trading LLC",
            "url": "https://www.linkedin.com/in/yusuf-al-habtoor-ae",
            "snippet": "Procurement Director at Al Noor Basmati Trading LLC in Dubai.",
        }
    ]
    serp_server.route_search_engines(monkeypatch)

    lead_resp = post_json(
        client,
        "/api/leads",
        {
            "company_name": "Al Noor Basmati Trading LLC",
            "lead_type": "importer",
            "country": "United Arab Emirates",
            "city_or_hub": "Dubai",
            "origin_state": "Punjab / Haryana Corridor",
            "nearest_port": "Jebel Ali Port (AEJEA)",
            "shipment_volume": "3-5 FCL/mo",
            "annual_volume_est": "1,800 MT / Year",
            "matched_varieties": "1121 Basmati; Sella Gold",
            "b2b_directory": "Dubai Chamber Trade Directory",
            "harvest_date": "2026-10-15",
            "customs_manifest_data": "BL-AEJEA-90211 | 120 MT",
            "source_name": "ExportMandi",
            "source_category": "B2B Trade Portal",
            "contact_person": "",
        },
    )
    assert lead_resp.status_code == 201
    lid = lead_resp.get_json()["lead"]["id"]

    xray_resp = post_json(
        client,
        "/api/xray/search",
        {
            "company_name": "Al Noor Basmati Trading LLC",
            "country": "United Arab Emirates",
            "lead_id": lid,
            "persist": True,
        },
    )
    assert xray_resp.status_code == 200
    xray_data = xray_resp.get_json()
    assert len(xray_data["persisted_contacts"]) == 1
    first_cid = xray_data["persisted_contacts"][0]["contact_id"]

    c2_resp = post_json(
        client,
        f"/api/leads/{lid}/contacts",
        {
            "full_name": "Ananya Roy",
            "job_title": "Import Coordinator",
            "email": "ananya@alnoorbasmati.ae",
            "phone": "+971508887766",
        },
    )
    assert c2_resp.status_code == 201

    assert patch_json(client, f"/api/leads/{lid}", {"extraction_notes": "Sent 2 FCL CIF quote"}).status_code == 200
    assert post_json(client, f"/api/leads/{lid}/notes", {"note": "Requested lab COA"}).status_code == 201
    assert post_json(
        client,
        "/api/omnichannel/inbound",
        {"lead_id": lid, "channel": "WhatsApp", "content": "Share CIF Jebel Ali price for 5 FCL"},
    ).status_code == 201

    camp = create_campaign(name="GCC Basmati Q4")
    enr_resp = post_json(
        client,
        f"/api/campaigns/{camp['campaign_id']}/enroll",
        {"lead_id": lid, "enrollment_mode": "single_contact", "contact_id": first_cid},
    )
    assert enr_resp.status_code in (200, 201) and enr_resp.get_json()["enrolled_count"] == 1

    _, oh = get_json(client, f"/api/leads/{lid}/outreach-history")
    _, tl = get_json(client, f"/api/leads/{lid}/timeline")
    _, dossier = get_json(client, f"/api/leads/{lid}")

    assert len(oh["messages"]) == 1 and len(oh["enrollments"]) == 1
    assert len(tl["timeline"]) >= 2
    assert dossier["lead"]["origin_state"] == "Punjab / Haryana Corridor"
    assert dossier["lead"]["contacts_count"] == 2

    if frontend_base_url:
        st, _ = fetch_ssr_html(frontend_base_url, "/leads/importers")
        assert st == 200


def test_t4_w2_multi_company_buyer_cross_linking_and_dual_enrollment(
    client, create_lead, create_campaign
):
    comp1 = create_lead(company_name="Emirates Grain LLC", contact_person="")
    comp2 = create_lead(company_name="Sharjah Bulk Foods WLL", contact_person="")

    r_faisal = post_json(
        client,
        f"/api/leads/{comp1['id']}/contacts",
        {
            "full_name": "Faisal Al Qasimi",
            "job_title": "Regional Commodity Buyer",
            "email": "faisal@gulftrade.ae",
            "linkedin_profile_url": "https://www.linkedin.com/in/faisal-al-qasimi",
        },
    )
    assert r_faisal.status_code == 201
    faisal_id = r_faisal.get_json()["contact"]["contact_id"]

    assert post_json(client, f"/api/leads/{comp2['id']}/contacts", {"contact_id": faisal_id}).status_code in (200, 201)
    assert post_json(
        client,
        f"/api/leads/{comp2['id']}/contacts",
        {"full_name": "Meera Nair", "job_title": "Supply Analyst", "email": "meera@sharjahbulk.ae"},
    ).status_code == 201

    camp_a = create_campaign(name="Emirates Targeted Campaign")
    camp_b = create_campaign(name="Sharjah Full Account Campaign")

    ea = post_json(
        client,
        f"/api/campaigns/{camp_a['campaign_id']}/enroll",
        {"lead_id": comp1["id"], "enrollment_mode": "single_contact", "contact_id": faisal_id},
    )
    eb = post_json(
        client,
        f"/api/campaigns/{camp_b['campaign_id']}/enroll",
        {"lead_id": comp2["id"], "enrollment_mode": "all_contacts"},
    )
    assert ea.status_code in (200, 201) and ea.get_json()["enrolled_count"] == 1
    assert eb.status_code in (200, 201) and eb.get_json()["enrolled_count"] == 2

    assert delete_json(client, f"/api/leads/{comp1['id']}/contacts/{faisal_id}").status_code == 200

    _, c1_list = get_json(client, f"/api/leads/{comp1['id']}/contacts")
    _, c2_list = get_json(client, f"/api/leads/{comp2['id']}/contacts")
    _, faisal_detail = get_json(client, f"/api/contacts/{faisal_id}")
    _, camp_b_enr = get_json(client, f"/api/campaigns/{camp_b['campaign_id']}/enrollments")

    assert c1_list["contacts"] == []
    assert len(c2_list["contacts"]) == 2
    assert len(faisal_detail["contact"]["companies"]) == 1
    assert faisal_detail["contact"]["companies"][0]["company_name"] == "Sharjah Bulk Foods WLL"
    assert len(camp_b_enr["enrollments"]) == 2


def test_t4_w3_west_bengal_rice_mill_supplier_r4_and_contract_campaign(client, create_campaign):
    mill_resp = post_json(
        client,
        "/api/leads",
        {
            "company_name": "Burdwan Agro Rice Mill Pvt Ltd",
            "lead_type": "wb_mill",
            "country": "India",
            "origin_state": "West Bengal",
            "state": "West Bengal",
            "district": "Purba Bardhaman",
            "city_or_hub": "Burdwan",
            "gstin": "19AABCB1234F1Z5",
            "b2b_directory": "WBRMA Member Directory",
            "harvest_date": "2026-11-01",
            "matched_varieties": "Gobindobhog; Swarna; IR-64",
            "source_name": "WBRMA",
            "source_category": "Mill Association",
            "contact_person": "",
        },
    )
    assert mill_resp.status_code == 201
    mid = mill_resp.get_json()["lead"]["id"]

    s_sup, sup_list = get_json(client, "/api/leads/suppliers")
    assert s_sup == 200
    assert any(s["company_name"] == "Burdwan Agro Rice Mill Pvt Ltd" for s in sup_list["suppliers"])

    _, mill_detail = get_json(client, f"/api/leads/{mid}")
    assert mill_detail["lead"]["origin_state"] == "West Bengal"
    assert mill_detail["lead"]["b2b_directory"] == "WBRMA Member Directory"

    assert post_json(
        client,
        f"/api/leads/{mid}/contacts",
        {"full_name": "Subrata Banerjee", "job_title": "Export Manager", "email": "subrata@burdwanmill.in"},
    ).status_code == 201
    assert post_json(client, f"/api/leads/{mid}/notes", {"note": "Moisture < 12.5% verified"}).status_code == 201

    camp = create_campaign(name="Supplier Export Allocation")
    assert post_json(
        client,
        f"/api/campaigns/{camp['campaign_id']}/enroll",
        {"lead_id": mid, "enrollment_mode": "all_contacts"},
    ).status_code in (200, 201)

    deal_resp = post_json(client, f"/api/leads/{mid}/convert-to-deal", {"deal_value": 65000})
    assert deal_resp.status_code == 201

    _, tl = get_json(client, f"/api/leads/{mid}/timeline")
    _, oh = get_json(client, f"/api/leads/{mid}/outreach-history")
    assert len(tl["timeline"]) >= 2
    assert len(oh["enrollments"]) == 1


def test_t4_w4_rate_limited_xray_zero_mock_fallback_to_manual_outreach(
    client, create_lead, create_campaign, serp_server, monkeypatch
):
    lead = create_lead(
        company_name="Jeddah Foodstuff Co",
        country="Saudi Arabia",
        website="https://jeddahfoodstuff.sa",
        contact_person="",
    )
    lid = lead["id"]

    serp_server.mode = "rate_limited_429"
    serp_server.route_search_engines(monkeypatch)
    xray_resp = post_json(
        client,
        "/api/xray/search",
        {
            "company_name": "Jeddah Foodstuff Co",
            "country": "Saudi Arabia",
            "website": "https://jeddahfoodstuff.sa",
            "lead_id": lid,
            "persist": True,
        },
    )
    assert xray_resp.status_code == 200
    assert_zero_mock_xray_response(xray_resp.get_json(), expect_website_domain="jeddahfoodstuff.sa")

    c_resp = post_json(
        client,
        f"/api/leads/{lid}/contacts",
        {
            "full_name": "Khalid Al Harbi",
            "job_title": "Purchasing Manager",
            "email": "khalid@jeddahfoodstuff.sa",
            "linkedin_profile_url": "https://www.linkedin.com/in/khalid-al-harbi-sa",
        },
    )
    assert c_resp.status_code == 201
    cid = c_resp.get_json()["contact"]["contact_id"]

    assert post_json(
        client, f"/api/leads/{lid}/notes", {"note": "X-Ray rate-limited; verified Khalid manually"}
    ).status_code == 201
    assert post_json(
        client,
        f"/api/omnichannel/threads/{lid}/reply",
        {"channel": "Email", "content": "Attached IR-64 Parboiled CIF Jeddah spec sheet."},
    ).status_code == 200

    camp = create_campaign(name="KSA Direct Outreach")
    assert post_json(
        client,
        f"/api/campaigns/{camp['campaign_id']}/enroll",
        {"lead_id": lid, "enrollment_mode": "single_contact", "contact_id": cid},
    ).status_code in (200, 201)

    _, oh = get_json(client, f"/api/leads/{lid}/outreach-history")
    _, tl = get_json(client, f"/api/leads/{lid}/timeline")
    assert len(oh["messages"]) == 1 and len(oh["enrollments"]) == 1
    assert len(tl["timeline"]) >= 2


def test_t4_w5_full_stack_ssr_dossier_parity_and_repo_line_limit_audit(
    live_api_url, frontend_base_url, frontend_tsc_result
):
    rc, output = frontend_tsc_result
    assert rc == 0, f"TypeScript check failed:\n{output}"

    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    header_src = get_dossier_header_source()
    tabs_entry_src, tabs_all_src, _ = get_tabs_bundle()
    right_src, _ = get_right_column_sources()
    _, modal_src = get_enroll_modal_source()

    assert len(dossier_src.strip()) > 0 and len(header_src.strip()) > 0
    assert len(tabs_entry_src.strip()) > 0 and "/xray/search" in tabs_all_src
    assert "/outreach-history" in tabs_all_src and "extraction_notes" in (tabs_all_src + "\n" + dossier_src)
    assert "shipment_volume" in right_src and "origin_state" in right_src and "customs_manifest_data" in right_src
    assert "all_contacts" in modal_src and "single_contact" in modal_src

    offenders = find_repo_files_over_limit(500)
    assert offenders == [], f"Files >= 500 lines found: {offenders}"

    # Real HTTP transport check over live WSGI socket (exercises live_api_url)
    post_resp = requests.post(
        f"{live_api_url}/api/leads",
        json={
            "company_name": "WSGI Live Transport Importer LLC",
            "country": "United Arab Emirates",
            "lead_type": "importer",
            "origin_state": "Punjab",
        },
        timeout=5.0,
    )
    assert post_resp.status_code == 201, post_resp.text
    created_lead = post_resp.json()["lead"]
    get_resp = requests.get(f"{live_api_url}/api/leads/{created_lead['id']}", timeout=5.0)
    assert get_resp.status_code == 200, get_resp.text
    assert get_resp.json()["lead"]["origin_state"] == "Punjab"

    if frontend_base_url:
        for route in ("/", "/leads/importers", "/leads/suppliers", "/pipeline"):
            st, html = fetch_ssr_html(frontend_base_url, route)
            assert st == 200, f"Expected 200 on {route}, got {st}"
            assert "<!DOCTYPE html>" in html or "<html" in html
