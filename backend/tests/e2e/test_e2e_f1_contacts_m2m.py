"""E2E Tests — F1: Many-to-Many Contact <-> Company Model & APIs (Tier 1 & Tier 2)."""

import requests

from tests.e2e.helpers_e2e import delete_json, get_json, patch_json, post_json


REQUIRED_CONTACT_KEYS = {
    "id",
    "contact_id",
    "full_name",
    "job_title",
    "email",
    "phone",
    "whatsapp_url",
    "linkedin_profile_url",
    "source",
    "verified",
    "companies",
    "created_at",
    "updated_at",
}


# ---------------------------------------------------------------------------
# Tier 1 — Happy-Path Feature Coverage (5 tests)
# ---------------------------------------------------------------------------


def test_f1_t1_create_contact_and_list_globally(client, live_api_url):
    payload = {
        "full_name": "Rashid Al Maktoum",
        "job_title": "Head of Sourcing",
        "email": "rashid@gulfgrain.ae",
        "phone": "+971504445566",
        "linkedin_profile_url": "https://www.linkedin.com/in/rashid-al-maktoum",
        "source": "xray",
        "verified": True,
    }
    resp = post_json(client, "/api/contacts", payload)
    assert resp.status_code == 201, resp.get_data(as_text=True)
    contact = resp.get_json()["contact"]
    assert REQUIRED_CONTACT_KEYS.issubset(contact.keys())
    assert contact["full_name"] == "Rashid Al Maktoum"
    assert contact["job_title"] == "Head of Sourcing"
    assert contact["linkedin_profile_url"] == "https://www.linkedin.com/in/rashid-al-maktoum"

    status, listed = get_json(client, "/api/contacts")
    assert status == 200
    assert listed["total"] >= 1
    ids = {c.get("contact_id") or c.get("id") for c in listed["contacts"]}
    assert (contact.get("contact_id") or contact.get("id")) in ids

    q_status, q_data = get_json(client, "/api/contacts?q=Rashid")
    assert q_status == 200
    assert q_data["total"] >= 1
    assert any(c["full_name"] == "Rashid Al Maktoum" for c in q_data["contacts"])

    # Real HTTP transport check via live_api_url (requests.post + requests.get)
    http_post = requests.post(
        f"{live_api_url}/api/contacts",
        json={
            "full_name": "Salma Al Dhaheri",
            "job_title": "Trade Buyer",
            "email": "salma@gulfgrain.ae",
        },
        timeout=5.0,
    )
    assert http_post.status_code == 201, http_post.text
    http_get = requests.get(f"{live_api_url}/api/contacts?q=Salma", timeout=5.0)
    assert http_get.status_code == 200
    assert any(c["full_name"] == "Salma Al Dhaheri" for c in http_get.json()["contacts"])

    empty_status, empty_q = get_json(client, "/api/contacts?q=NoSuchPersonXYZ999")
    assert empty_status == 200
    assert empty_q["total"] == 0


def test_f1_t1_create_contact_with_lead_id_and_verify_company_contacts(client, create_lead):
    lead = create_lead(company_name="Deira Agro Imports LLC", contact_person="")
    lead_id = lead["id"]

    resp = post_json(
        client,
        "/api/contacts",
        {
            "full_name": "Amina Hassan",
            "job_title": "Import Manager",
            "email": "amina@deiraagro.ae",
            "phone": "+971502223344",
            "linkedin_profile_url": "https://www.linkedin.com/in/amina-hassan-ae",
            "lead_id": lead_id,
            "role_at_company": "Lead Rice Buyer",
            "is_primary": True,
        },
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    contact = resp.get_json()["contact"]
    assert any(str(c["lead_id"]) == str(lead_id) for c in contact["companies"])

    status, company_data = get_json(client, f"/api/leads/{lead_id}/contacts")
    assert status == 200
    assert str(company_data["lead_id"]) == str(lead_id)
    assert company_data["company_name"] == "Deira Agro Imports LLC"
    assert len(company_data["contacts"]) == 1
    assert company_data["contacts"][0]["full_name"] == "Amina Hassan"

    f_status, filtered = get_json(client, f"/api/contacts?lead_id={lead_id}")
    assert f_status == 200
    assert filtered["total"] == 1
    assert filtered["contacts"][0]["full_name"] == "Amina Hassan"

    m_status, missing_filtered = get_json(client, "/api/contacts?lead_id=999999")
    assert m_status == 200
    assert missing_filtered["contacts"] == []
    assert missing_filtered["total"] == 0


def test_f1_t1_link_single_contact_to_multiple_companies(client, create_lead):
    comp_a = create_lead(company_name="Gulf Horizon Foods LLC", contact_person="")
    comp_b = create_lead(company_name="Emirates Staple Trading WLL", contact_person="")

    resp_a = post_json(
        client,
        f"/api/leads/{comp_a['id']}/contacts",
        {
            "full_name": "Karan Mehta",
            "job_title": "Regional Procurement Director",
            "email": "karan@gulffoods.ae",
            "phone": "+971551112233",
            "linkedin_profile_url": "https://www.linkedin.com/in/karan-mehta-gcc",
            "role_at_company": "Procurement Advisor",
            "is_primary": True,
        },
    )
    assert resp_a.status_code == 201, resp_a.get_data(as_text=True)
    cid = resp_a.get_json()["contact"]["contact_id"]

    resp_b = post_json(
        client,
        f"/api/leads/{comp_b['id']}/contacts",
        {"contact_id": cid, "role_at_company": "Group Buyer", "is_primary": False},
    )
    assert resp_b.status_code in (200, 201), resp_b.get_data(as_text=True)
    assert resp_b.get_json().get("linked") is True

    _, list_a = get_json(client, f"/api/leads/{comp_a['id']}/contacts")
    _, list_b = get_json(client, f"/api/leads/{comp_b['id']}/contacts")
    assert [c["contact_id"] for c in list_a["contacts"]] == [cid]
    assert [c["contact_id"] for c in list_b["contacts"]] == [cid]

    status, detail = get_json(client, f"/api/contacts/{cid}")
    assert status == 200
    company_names = {c["company_name"] for c in detail["contact"]["companies"]}
    assert company_names == {"Gulf Horizon Foods LLC", "Emirates Staple Trading WLL"}


def test_f1_t1_update_and_delete_contact_crud(client, create_lead, create_contact):
    lead = create_lead(company_name="CRUD Link Check Co", contact_person="")
    contact = create_contact(
        full_name="Suresh Iyer",
        email="suresh@exporttrade.in",
        lead_id=lead["id"],
    )
    cid = contact["contact_id"]

    _, pre_del = get_json(client, f"/api/leads/{lead['id']}/contacts")
    assert [c["contact_id"] for c in pre_del["contacts"]] == [cid]

    patch_resp = patch_json(
        client,
        f"/api/contacts/{cid}",
        {"job_title": "VP Commodities", "phone": "+919820012345", "verified": True},
    )
    assert patch_resp.status_code == 200
    updated = patch_resp.get_json()["contact"]
    assert updated["job_title"] == "VP Commodities"
    assert updated["phone"] == "+919820012345"
    assert updated["verified"] is True

    del_resp = delete_json(client, f"/api/contacts/{cid}")
    assert del_resp.status_code == 200

    status, _ = get_json(client, f"/api/contacts/{cid}")
    assert status == 404

    _, post_del = get_json(client, f"/api/leads/{lead['id']}/contacts")
    assert post_del["contacts"] == []


def test_f1_t1_lazy_backfill_valid_primary_lead_contact(client, create_lead):
    lead = create_lead(
        company_name="Al Noor Basmati LLC",
        contact_person="Tariq Al Mansoori",
        emails="tariq@alnoor.ae",
        phones="+971501234567",
    )
    status, data = get_json(client, f"/api/leads/{lead['id']}/contacts")
    assert status == 200
    assert len(data["contacts"]) == 1
    backfilled = data["contacts"][0]
    assert backfilled["full_name"] == "Tariq Al Mansoori"
    assert backfilled["email"] == "tariq@alnoor.ae"
    assert backfilled["phone"] == "+971501234567"


# ---------------------------------------------------------------------------
# Tier 2 — Boundary & Corner Cases (6 tests)
# ---------------------------------------------------------------------------


def test_f1_t2_dedup_by_normalized_linkedin_url(client):
    r1 = post_json(
        client,
        "/api/contacts",
        {
            "full_name": "Ahmed Khan",
            "job_title": "Buyer",
            "linkedin_profile_url": "https://www.linkedin.com/in/ahmed-khan-trade/",
        },
    )
    assert r1.status_code == 201
    cid1 = r1.get_json()["contact"]["contact_id"]

    r2 = post_json(
        client,
        "/api/contacts",
        {
            "full_name": "Ahmed Khan",
            "job_title": "Procurement Lead",
            "linkedin_profile_url": "http://ae.linkedin.com/in/ahmed-khan-trade?trk=public_profile",
        },
    )
    assert r2.status_code in (200, 201)
    cid2 = r2.get_json()["contact"]["contact_id"]
    assert cid1 == cid2

    _, listed = get_json(client, "/api/contacts")
    matching = [c for c in listed["contacts"] if "ahmed-khan-trade" in (c.get("linkedin_profile_url") or "")]
    assert len(matching) == 1


def test_f1_t2_dedup_by_case_insensitive_email(client):
    r1 = post_json(
        client,
        "/api/contacts",
        {"full_name": "Zainab Ali", "email": "Buyer@AlFazal.AE"},
    )
    assert r1.status_code == 201
    cid1 = r1.get_json()["contact"]["contact_id"]

    r2 = post_json(
        client,
        "/api/contacts",
        {"full_name": "Zainab Ali", "email": "buyer@alfazal.ae"},
    )
    assert r2.status_code in (200, 201)
    assert r2.get_json()["contact"]["contact_id"] == cid1


def test_f1_t2_dedup_by_full_name_and_phone(client):
    r1 = post_json(
        client,
        "/api/contacts",
        {"full_name": "Ravi Sen", "phone": "+91-98300-11223"},
    )
    assert r1.status_code == 201
    cid1 = r1.get_json()["contact"]["contact_id"]

    r2 = post_json(
        client,
        "/api/contacts",
        {"full_name": "Ravi Sen", "phone": "+91 98300 11223"},
    )
    assert r2.status_code in (200, 201)
    assert r2.get_json()["contact"]["contact_id"] == cid1


def test_f1_t2_unlink_shared_contact_preserves_other_company(client, create_lead):
    comp_a = create_lead(company_name="Importer Alpha LLC", contact_person="")
    comp_b = create_lead(company_name="Importer Beta LLC", contact_person="")

    r = post_json(
        client,
        "/api/contacts",
        {
            "full_name": "Nadia Farooq",
            "email": "nadia@gccbulk.ae",
            "lead_ids": [comp_a["id"], comp_b["id"]],
        },
    )
    assert r.status_code == 201
    cid = r.get_json()["contact"]["contact_id"]

    del_resp = delete_json(client, f"/api/leads/{comp_a['id']}/contacts/{cid}")
    assert del_resp.status_code == 200

    _, data_a = get_json(client, f"/api/leads/{comp_a['id']}/contacts")
    _, data_b = get_json(client, f"/api/leads/{comp_b['id']}/contacts")
    assert data_a["contacts"] == []
    assert [c["contact_id"] for c in data_b["contacts"]] == [cid]

    status, detail = get_json(client, f"/api/contacts/{cid}")
    assert status == 200
    assert len(detail["contact"]["companies"]) == 1


def test_f1_t2_empty_company_zero_contacts_and_placeholder_skip(client, create_lead):
    lead = create_lead(
        company_name="Generic Desk Trading LLC",
        contact_person="Purchase Manager",
        emails="",
        phones="",
    )
    status, data = get_json(client, f"/api/leads/{lead['id']}/contacts")
    assert status == 200
    assert data["contacts"] == []


def test_f1_t2_invalid_contact_and_lead_ids_return_404_or_400(client):
    bad_create = post_json(client, "/api/contacts", {"job_title": "Manager"})
    assert bad_create.status_code == 400

    s_contact, _ = get_json(client, "/api/contacts/CNT-NONEXISTENT-999")
    assert s_contact == 404

    r_link = post_json(
        client,
        "/api/leads/999999/contacts",
        {"full_name": "Orphan Buyer", "email": "orphan@example.com"},
    )
    assert r_link.status_code == 404
