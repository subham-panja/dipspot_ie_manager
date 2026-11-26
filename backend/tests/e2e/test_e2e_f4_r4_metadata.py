"""E2E Tests — F4: R4 Trade Intelligence & Lead Source Metadata API (Tier 1 & Tier 2)."""

from tests.e2e.helpers_e2e import delete_json, get_json, patch_json, post_json


R4_REQUIRED_KEYS = {
    "origin_state",
    "state",
    "country",
    "nearest_port",
    "key_trade_lanes",
    "shipment_volume",
    "annual_volume_est",
    "commodities_list",
    "matched_varieties",
    "hs_codes_applicable",
    "source_name",
    "source_url",
    "source_category",
    "source_reliability",
    "customs_manifest_data",
    "b2b_directory",
    "harvest_date",
    "created_at",
    "contacts_count",
}


# ---------------------------------------------------------------------------
# Tier 1 — Happy-Path Feature Coverage (5 tests)
# ---------------------------------------------------------------------------


def test_f4_t1_create_and_get_lead_exposes_all_r4_fields(client):
    payload = {
        "company_name": "Riyadh Royal Grains LLC",
        "lead_type": "importer",
        "country": "Saudi Arabia",
        "city_or_hub": "Jeddah",
        "origin_state": "Punjab / Haryana",
        "state": "Makkah Province",
        "nearest_port": "Jeddah Islamic Port (SAJED)",
        "shipment_volume": "4-6 FCL/mo",
        "annual_volume_est": "1,400 MT / Year",
        "matched_varieties": "1121 Steam Basmati; Sella Basmati",
        "hs_codes_applicable": "10063020",
        "b2b_directory": "Saudi Chambers Trade Portal",
        "harvest_date": "2026-10-20",
        "source_name": "ExportMandi",
        "source_url": "https://exportmandi.com/saudi-rice-importers",
        "source_category": "B2B Trade Portal",
        "source_reliability": 94,
        "customs_manifest_data": "BL-SAJED-44102 | 125 MT",
    }
    resp = post_json(client, "/api/leads", payload)
    assert resp.status_code == 201, resp.get_data(as_text=True)
    lead_id = resp.get_json()["lead"]["id"]

    status, data = get_json(client, f"/api/leads/{lead_id}")
    assert status == 200
    lead = data["lead"]
    assert R4_REQUIRED_KEYS.issubset(lead.keys())
    assert lead["origin_state"] == "Punjab / Haryana"
    assert lead["b2b_directory"] == "Saudi Chambers Trade Portal"
    assert lead["harvest_date"] == "2026-10-20"
    assert lead["source_name"] == "ExportMandi"
    assert lead["source_category"] == "B2B Trade Portal"
    assert lead["customs_manifest_data"] == "BL-SAJED-44102 | 125 MT"
    assert lead["annual_volume_est"] == "1,400 MT / Year"
    assert lead["commodities_list"] == ["1121 Steam Basmati", "Sella Basmati"]


def test_f4_t1_patch_lead_updates_r4_trade_and_source_metadata(client, create_lead):
    lead = create_lead(company_name="Patch R4 Importer LLC")
    updates = {
        "origin_state": "West Bengal",
        "b2b_directory": "Dubai Chamber Directory",
        "harvest_date": "2026-11-05",
        "source_name": "TradeIndia Verified",
        "source_url": "https://tradeindia.com/dubai-rice",
        "source_category": "Customs Manifest & B2B",
        "source_reliability": 98,
        "customs_manifest_data": "B/L AEJEA-7781 | 80 MT",
        "commodities_list": ["Gobindobhog", "IR-64 Parboiled"],
        "annual_volume_est": "2,200 MT / Year",
        "key_trade_lanes": ["Kolkata Port (INCCU) → Jebel Ali Port (AEJEA)"],
    }
    resp = patch_json(client, f"/api/leads/{lead['id']}", updates)
    assert resp.status_code == 200, resp.get_data(as_text=True)

    status, fetched = get_json(client, f"/api/leads/{lead['id']}")
    assert status == 200
    saved = fetched["lead"]
    for key, expected in updates.items():
        assert saved[key] == expected


def test_f4_t1_importer_lead_computes_trade_lanes_and_commodities_list(client, create_lead):
    lead = create_lead(
        company_name="Dubai Creek Foods LLC",
        country="United Arab Emirates",
        city_or_hub="Dubai",
        matched_varieties="1121 Basmati; IR-64 Parboiled",
    )
    status, data = get_json(client, f"/api/leads/{lead['id']}")
    assert status == 200
    fetched = data["lead"]
    assert fetched["commodities_list"] == ["1121 Basmati", "IR-64 Parboiled"]
    assert "Jebel Ali" in fetched["nearest_port"]
    assert isinstance(fetched["key_trade_lanes"], list) and len(fetched["key_trade_lanes"]) >= 1


def test_f4_t1_supplier_lead_exposes_origin_state_and_source_metadata(client):
    payload = {
        "company_name": "Burdwan Rice Mill Pvt Ltd",
        "lead_type": "wb_mill",
        "country": "India",
        "state": "West Bengal",
        "origin_state": "West Bengal",
        "district": "Burdwan",
        "city_or_hub": "Burdwan",
        "gstin": "19AABCB1234F1Z5",
        "matched_varieties": "Swarna; Miniket; Gobindobhog",
        "b2b_directory": "WBRMA Registry",
        "harvest_date": "2026-11-01",
        "source_name": "WBRMA Member Portal",
        "source_category": "Official Mill Registry",
    }
    resp = post_json(client, "/api/leads", payload)
    assert resp.status_code == 201
    lid = resp.get_json()["lead"]["id"]

    status, data = get_json(client, f"/api/leads/{lid}")
    assert status == 200
    mill = data["lead"]
    assert mill["origin_state"] == "West Bengal"
    assert mill["state"] == "West Bengal"
    assert mill["b2b_directory"] == "WBRMA Registry"
    assert mill["harvest_date"] == "2026-11-01"
    assert mill["nearest_port"]
    assert mill["contacts_count"] == 0


def test_f4_t1_contacts_count_reflects_m2m_links_in_lead_serializer(client, create_lead):
    lead = create_lead(company_name="Count Sync Importer", contact_person="")
    lid = lead["id"]

    for i in range(2):
        r = post_json(
            client,
            f"/api/leads/{lid}/contacts",
            {"full_name": f"Linked Buyer {i}", "email": f"buyer{i}@countsync.ae"},
        )
        assert r.status_code == 201

    status, data = get_json(client, f"/api/leads/{lid}")
    assert status == 200
    assert data["lead"]["contacts_count"] == 2


# ---------------------------------------------------------------------------
# Tier 2 — Boundary & Corner Cases (5 tests)
# ---------------------------------------------------------------------------


def test_f4_t2_r4_defaults_when_optional_metadata_omitted(client):
    resp = post_json(client, "/api/leads", {"company_name": "Minimal Grain Co"})
    assert resp.status_code == 201
    lid = resp.get_json()["lead"]["id"]

    status, data = get_json(client, f"/api/leads/{lid}")
    assert status == 200
    lead = data["lead"]
    assert isinstance(lead["commodities_list"], list)
    assert isinstance(lead["key_trade_lanes"], list)
    assert isinstance(lead["nearest_port"], str) and len(lead["nearest_port"]) > 0
    assert lead["contacts_count"] == 0


def test_f4_t2_r4_customs_manifest_dict_and_string_formats(client, create_lead):
    lead = create_lead(company_name="Manifest Format Corp")
    lid = lead["id"]

    dict_manifest = {"bl_number": "BL-AEJEA-8812", "mt": 150, "port": "AEJEA"}
    r1 = patch_json(client, f"/api/leads/{lid}", {"customs_manifest_data": dict_manifest})
    assert r1.status_code == 200
    assert r1.get_json()["lead"]["customs_manifest_data"] == dict_manifest

    str_manifest = "BL-INCCU-5521 | 75 MT | HS 100630"
    r2 = patch_json(client, f"/api/leads/{lid}", {"customs_manifest_data": str_manifest})
    assert r2.status_code == 200
    assert r2.get_json()["lead"]["customs_manifest_data"] == str_manifest


def test_f4_t2_r4_patch_disallowed_or_empty_payload(client, create_lead):
    lead = create_lead(company_name="Patch Safety Co")
    lid = lead["id"]
    orig_oid = lead["_id"]

    r_empty = patch_json(client, f"/api/leads/{lid}", {})
    assert r_empty.status_code == 200

    r_evil = patch_json(
        client,
        f"/api/leads/{lid}",
        {"_id": "hijack-id", "evil_field": "malicious", "origin_state": "Odisha"},
    )
    assert r_evil.status_code == 200
    updated = r_evil.get_json()["lead"]
    assert updated["_id"] == orig_oid
    assert "evil_field" not in updated
    assert updated["origin_state"] == "Odisha"


def test_f4_t2_r4_non_importer_does_not_force_importer_tier(client):
    resp = post_json(
        client,
        "/api/leads",
        {
            "company_name": "Hooghly Agro Mill",
            "lead_type": "wb_mill",
            "country": "India",
            "state": "West Bengal",
            "origin_state": "West Bengal",
            "shipment_volume": "",
        },
    )
    assert resp.status_code == 201
    mill = resp.get_json()["lead"]
    assert mill["lead_type"] == "wb_mill"
    assert mill["importer_tier"] == ""
    assert mill["origin_state"] == "West Bengal"


def test_f4_t2_r4_unknown_lead_404_and_soft_deleted_hidden(client, create_lead):
    s_unknown, _ = get_json(client, "/api/leads/999998")
    assert s_unknown == 404

    lead = create_lead(company_name="Trash Visibility Lead")
    del_resp = delete_json(client, f"/api/leads/{lead['id']}")
    assert del_resp.status_code == 200

    s_hidden, _ = get_json(client, f"/api/leads/{lead['id']}")
    s_inc, d_inc = get_json(client, f"/api/leads/{lead['id']}?include_deleted=true")
    assert s_hidden == 404
    assert s_inc == 200
    assert d_inc["lead"]["is_deleted"] is True
