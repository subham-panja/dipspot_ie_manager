"""E2E Tests — F2: Dual Campaign Enrollment Backend (Tier 1 & Tier 2)."""

from tests.e2e.helpers_e2e import get_json, post_json


def _seed_company_with_contacts(client, create_lead, count=3):
    lead = create_lead(company_name="Gulf Meridian Imports LLC", contact_person="")
    created = []
    for idx in range(count):
        resp = post_json(
            client,
            f"/api/leads/{lead['id']}/contacts",
            {
                "full_name": f"Buyer Contact {idx + 1}",
                "job_title": "Import Specialist",
                "email": f"buyer{idx + 1}@gulfmeridian.ae",
                "phone": f"+9715000010{idx + 1}",
                "linkedin_profile_url": f"https://www.linkedin.com/in/buyer-contact-{idx + 1}",
                "is_primary": idx == 0,
            },
        )
        assert resp.status_code == 201, resp.get_data(as_text=True)
        created.append(resp.get_json()["contact"])
    return lead, created


# ---------------------------------------------------------------------------
# Tier 1 — Happy-Path Feature Coverage (5 tests)
# ---------------------------------------------------------------------------


def test_f2_t1_enroll_all_contacts_persists_all_company_contacts(client, create_lead, create_campaign):
    lead, contacts = _seed_company_with_contacts(client, create_lead, count=3)
    campaign = create_campaign(name="All Contacts Campaign")
    cid = campaign["campaign_id"]

    resp = post_json(
        client,
        f"/api/campaigns/{cid}/enroll",
        {"lead_id": lead["id"], "enrollment_mode": "all_contacts"},
    )
    assert resp.status_code in (200, 201), resp.get_data(as_text=True)
    data = resp.get_json()
    assert data["success"] is True
    assert data["enrollment_mode"] == "all_contacts"
    assert data["enrolled_count"] == 3
    assert len(data["enrolled_contacts"]) == 3

    expected_ids = {c["contact_id"] for c in contacts}
    actual_ids = {c.get("contact_id") for c in data["enrolled_contacts"]}
    assert actual_ids == expected_ids


def test_f2_t1_enroll_single_contact_enrolls_only_chosen_contact(client, create_lead, create_campaign):
    lead, contacts = _seed_company_with_contacts(client, create_lead, count=3)
    chosen = contacts[1]
    campaign = create_campaign(name="Single Contact Campaign")
    cid = campaign["campaign_id"]

    resp = post_json(
        client,
        f"/api/campaigns/{cid}/enroll",
        {
            "lead_id": lead["id"],
            "enrollment_mode": "single_contact",
            "contact_id": chosen["contact_id"],
        },
    )
    assert resp.status_code in (200, 201), resp.get_data(as_text=True)
    data = resp.get_json()
    assert data["success"] is True
    assert data["enrollment_mode"] == "single_contact"
    assert data["enrolled_count"] == 1
    assert len(data["enrolled_contacts"]) == 1
    assert data["enrolled_contacts"][0]["contact_id"] == chosen["contact_id"]

    status, enr_list = get_json(client, f"/api/campaigns/{cid}/enrollments")
    assert status == 200
    assert len(enr_list["enrollments"]) == 1
    assert enr_list["enrollments"][0]["contact_id"] == chosen["contact_id"]

    # Also verify plural contact_ids list in single_contact mode (PROJECT.md §4)
    camp_plural = create_campaign(name="Plural Contact IDs Campaign")
    cid_plural = camp_plural["campaign_id"]
    target_pair = [contacts[0]["contact_id"], contacts[2]["contact_id"]]
    resp_plural = post_json(
        client,
        f"/api/campaigns/{cid_plural}/enroll",
        {
            "lead_id": lead["id"],
            "enrollment_mode": "single_contact",
            "contact_ids": target_pair,
        },
    )
    assert resp_plural.status_code in (200, 201), resp_plural.get_data(as_text=True)
    d_plural = resp_plural.get_json()
    assert d_plural["enrollment_mode"] == "single_contact"
    assert d_plural["enrolled_count"] == 2
    assert {c["contact_id"] for c in d_plural["enrolled_contacts"]} == set(target_pair)

    st_p, enr_plural = get_json(client, f"/api/campaigns/{cid_plural}/enrollments")
    assert st_p == 200
    assert {row["contact_id"] for row in enr_plural["enrollments"]} == set(target_pair)


def test_f2_t1_get_campaign_enrollments_returns_contact_metadata(client, create_lead, create_campaign):
    lead, contacts = _seed_company_with_contacts(client, create_lead, count=2)
    campaign = create_campaign(name="Metadata Audit Campaign")
    cid = campaign["campaign_id"]

    resp = post_json(
        client,
        f"/api/campaigns/{cid}/enroll",
        {"lead_id": lead["id"], "enrollment_mode": "all_contacts"},
    )
    assert resp.status_code in (200, 201)

    status, data = get_json(client, f"/api/campaigns/{cid}/enrollments")
    assert status == 200
    assert data["campaign_id"] == cid
    assert len(data["enrollments"]) == 2
    required_keys = {
        "campaign_id",
        "lead_id",
        "company_name",
        "contact_id",
        "contact_name",
        "contact_email",
        "contact_phone",
        "linkedin_profile_url",
        "enrollment_mode",
        "status",
        "enrolled_at",
    }
    for row in data["enrollments"]:
        assert required_keys.issubset(row.keys())
        assert row["company_name"] == "Gulf Meridian Imports LLC"
        assert row["contact_id"] in {c["contact_id"] for c in contacts}


def test_f2_t1_enrollment_updates_campaign_counts(client, create_lead, create_campaign):
    lead, contacts = _seed_company_with_contacts(client, create_lead, count=2)
    campaign = create_campaign(name="Counter Update Campaign")
    cid = campaign["campaign_id"]

    resp = post_json(
        client,
        f"/api/campaigns/{cid}/enroll",
        {"lead_id": lead["id"], "enrollment_mode": "all_contacts"},
    )
    assert resp.status_code in (200, 201)

    status, camp_data = get_json(client, f"/api/campaigns/{cid}")
    assert status == 200
    camp = camp_data["campaign"]
    assert camp["enrolled_leads_count"] >= 1
    assert camp.get("enrolled_contacts_count", 0) == 2


def test_f2_t1_backward_compatible_filter_enrollment(client, create_lead, create_campaign):
    create_lead(company_name="UAE Importer 1", country="United Arab Emirates", lead_type="importer")
    create_lead(company_name="UAE Importer 2", country="United Arab Emirates", lead_type="importer")
    create_lead(company_name="Bengal Mill 1", country="India", lead_type="wb_mill")
    campaign = create_campaign(name="Legacy Filter Campaign")
    cid = campaign["campaign_id"]

    resp = post_json(
        client,
        f"/api/campaigns/{cid}/enroll",
        {"country": "United Arab Emirates", "lead_type": "importer"},
    )
    assert resp.status_code in (200, 201), resp.get_data(as_text=True)
    data = resp.get_json()
    assert data["enrolled_count"] == 2


# ---------------------------------------------------------------------------
# Tier 2 — Boundary & Corner Cases (6 tests)
# ---------------------------------------------------------------------------


def test_f2_t2_single_contact_missing_contact_id_rejected(client, create_lead, create_campaign):
    lead, _ = _seed_company_with_contacts(client, create_lead, count=2)
    campaign = create_campaign(name="Missing Contact ID Campaign")
    cid = campaign["campaign_id"]

    resp = post_json(
        client,
        f"/api/campaigns/{cid}/enroll",
        {"lead_id": lead["id"], "enrollment_mode": "single_contact"},
    )
    assert resp.status_code == 400
    _, enr = get_json(client, f"/api/campaigns/{cid}/enrollments")
    assert enr["enrollments"] == []


def test_f2_t2_invalid_enrollment_mode_rejected(client, create_lead, create_campaign):
    lead, _ = _seed_company_with_contacts(client, create_lead, count=1)
    campaign = create_campaign(name="Invalid Mode Campaign")
    cid = campaign["campaign_id"]

    resp = post_json(
        client,
        f"/api/campaigns/{cid}/enroll",
        {"lead_id": lead["id"], "enrollment_mode": "random_subset"},
    )
    assert resp.status_code == 400


def test_f2_t2_enroll_empty_company_all_contacts(client, create_lead, create_campaign):
    empty_lead = create_lead(
        company_name="No Contacts Imports LLC",
        contact_person="",
        emails="",
        phones="",
    )
    campaign = create_campaign(name="Empty Company Campaign")
    cid = campaign["campaign_id"]

    resp = post_json(
        client,
        f"/api/campaigns/{cid}/enroll",
        {"lead_id": empty_lead["id"], "enrollment_mode": "all_contacts"},
    )
    assert resp.status_code in (200, 400)
    if resp.status_code == 200:
        data = resp.get_json()
        assert data["enrolled_count"] == 0
        assert data.get("enrolled_contacts", []) == []

    _, enr = get_json(client, f"/api/campaigns/{cid}/enrollments")
    assert enr["enrollments"] == []


def test_f2_t2_single_contact_belonging_to_different_company_rejected(
    client, create_lead, create_campaign
):
    lead_a = create_lead(company_name="Target Company A", contact_person="")
    lead_b = create_lead(company_name="Other Company B", contact_person="")
    c_resp = post_json(
        client,
        f"/api/leads/{lead_b['id']}/contacts",
        {"full_name": "External Person", "email": "ext@otherb.ae"},
    )
    assert c_resp.status_code == 201
    foreign_cid = c_resp.get_json()["contact"]["contact_id"]

    campaign = create_campaign(name="Cross-Company Guard Campaign")
    resp = post_json(
        client,
        f"/api/campaigns/{campaign['campaign_id']}/enroll",
        {
            "lead_id": lead_a["id"],
            "enrollment_mode": "single_contact",
            "contact_id": foreign_cid,
        },
    )
    assert resp.status_code in (400, 404)


def test_f2_t2_duplicate_enrollment_idempotency(client, create_lead, create_campaign):
    lead, contacts = _seed_company_with_contacts(client, create_lead, count=2)
    campaign = create_campaign(name="Idempotency Campaign")
    cid = campaign["campaign_id"]

    r1 = post_json(
        client,
        f"/api/campaigns/{cid}/enroll",
        {
            "lead_id": lead["id"],
            "enrollment_mode": "single_contact",
            "contact_id": contacts[0]["contact_id"],
        },
    )
    assert r1.status_code in (200, 201)

    r2 = post_json(
        client,
        f"/api/campaigns/{cid}/enroll",
        {"lead_id": lead["id"], "enrollment_mode": "all_contacts"},
    )
    assert r2.status_code in (200, 201)

    _, enr = get_json(client, f"/api/campaigns/{cid}/enrollments")
    enrolled_contact_ids = [row["contact_id"] for row in enr["enrollments"]]
    assert len(enrolled_contact_ids) == 2
    assert len(set(enrolled_contact_ids)) == 2


def test_f2_t2_enroll_unknown_campaign_or_lead_returns_404(client, create_lead, create_campaign):
    lead = create_lead(company_name="Valid Lead Co")
    campaign = create_campaign(name="Valid Campaign")

    r_bad_camp = post_json(
        client,
        "/api/campaigns/CMP-DOES-NOT-EXIST/enroll",
        {"lead_id": lead["id"], "enrollment_mode": "all_contacts"},
    )
    assert r_bad_camp.status_code == 404

    r_bad_lead = post_json(
        client,
        f"/api/campaigns/{campaign['campaign_id']}/enroll",
        {"lead_id": 999999, "enrollment_mode": "all_contacts"},
    )
    assert r_bad_lead.status_code == 404
