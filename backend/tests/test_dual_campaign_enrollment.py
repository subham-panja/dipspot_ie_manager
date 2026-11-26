"""Tests for F2 Dual Campaign Enrollment, Broadcast Attribution, and FollowUpEngine."""

from bson import ObjectId
from app.db import get_db, now_iso
from app.followup_engine import FollowUpEngine


class TestDualCampaignEnrollment:
    def _setup_lead_with_two_contacts(self, client):
        lead = client.post("/api/leads", json={
            "company_name": "Gulf Horizon Foods LLC",
            "country": "United Arab Emirates",
            "emails": "desk@gulfhorizon.ae",
            "phones": "+971502223344",
        }).get_json()["lead"]

        c1 = client.post(f"/api/leads/{lead['id']}/contacts", json={
            "full_name": "Omar Al Suwaidi",
            "job_title": "Head of Imports",
            "email": "omar@gulfhorizon.ae",
            "phone": "+971502223344",
            "is_primary": True,
        }).get_json()["contact"]

        c2 = client.post(f"/api/leads/{lead['id']}/contacts", json={
            "full_name": "Nadia Haddad",
            "job_title": "Logistics Manager",
            "email": "nadia@gulfhorizon.ae",
            "phone": "+971509998877",
        }).get_json()["contact"]

        cmp_doc = client.post("/api/campaigns", json={
            "name": "UAE Dual Enrollment Campaign",
            "channel": "Email",
            "target_countries": ["United Arab Emirates"],
        }).get_json()["campaign"]

        return lead, c1, c2, cmp_doc

    def test_enroll_all_contacts_and_idempotency(self, client):
        lead, c1, c2, cmp_doc = self._setup_lead_with_two_contacts(client)
        cid = cmp_doc["campaign_id"]

        res = client.post(f"/api/campaigns/{cid}/enroll", json={
            "lead_id": lead["id"],
            "enrollment_mode": "all_contacts",
        })
        assert res.status_code == 200
        body = res.get_json()
        assert body["success"] is True
        assert body["enrollment_mode"] == "all_contacts"
        assert body["enrolled_count"] == 2
        assert body["enrolled_leads_count"] == 1
        assert body["enrolled_contacts_count"] == 2
        assert {e["contact_id"] for e in body["enrolled_contacts"]} == {c1["contact_id"], c2["contact_id"]}

        # Re-enrolling same lead in all_contacts must be idempotent (newly_enrolled_count == 0)
        res2 = client.post(f"/api/campaigns/{cid}/enroll", json={
            "lead_id": lead["id"],
            "enrollment_mode": "all_contacts",
        })
        assert res2.status_code == 200
        assert res2.get_json()["newly_enrolled_count"] == 0
        assert res2.get_json()["enrolled_contacts_count"] == 2

        # GET enrollments
        enr_list = client.get(f"/api/campaigns/{cid}/enrollments")
        assert enr_list.status_code == 200
        assert enr_list.get_json()["total"] == 2

    def test_enroll_single_contact_and_validation(self, client):
        lead, c1, c2, cmp_doc = self._setup_lead_with_two_contacts(client)
        cid = cmp_doc["campaign_id"]

        # Missing contact_id in single_contact mode -> 400
        bad = client.post(f"/api/campaigns/{cid}/enroll", json={
            "lead_id": lead["id"],
            "enrollment_mode": "single_contact",
        })
        assert bad.status_code == 400

        # Nonexistent contact_id -> 404
        missing = client.post(f"/api/campaigns/{cid}/enroll", json={
            "lead_id": lead["id"],
            "enrollment_mode": "single_contact",
            "contact_id": "CNT-DOESNOTEXIST",
        })
        assert missing.status_code == 404

        # Valid single_contact enrollment for c2 only
        res = client.post(f"/api/campaigns/{cid}/enroll", json={
            "lead_id": lead["id"],
            "enrollment_mode": "single_contact",
            "contact_id": c2["contact_id"],
        })
        assert res.status_code == 200
        body = res.get_json()
        assert body["enrollment_mode"] == "single_contact"
        assert body["enrolled_count"] == 1
        assert body["enrolled_contacts"][0]["contact_id"] == c2["contact_id"]
        assert body["enrolled_contacts"][0]["contact_email"] == "nadia@gulfhorizon.ae"

        # Broadcast logs contact_id and lead_id into dispatched_messages -> surfaces in outreach-history
        bc = client.post(f"/api/campaigns/{cid}/broadcast")
        assert bc.status_code == 200

        oh = client.get(f"/api/leads/{lead['id']}/outreach-history").get_json()
        assert len(oh["dispatches"]) == 1
        assert oh["dispatches"][0]["contact_id"] == c2["contact_id"]
        assert oh["dispatches"][0]["recipient"] == "nadia@gulfhorizon.ae"

    def test_legacy_filter_mode_backward_compatible(self, client):
        client.post("/api/leads", json={
            "company_name": "Muscat Grain LLC",
            "country": "Oman",
            "emails": "buy@muscatgrain.om",
        })
        cmp_doc = client.post("/api/campaigns", json={
            "name": "Oman Filter Campaign",
            "channel": "Email",
        }).get_json()["campaign"]

        res = client.post(f"/api/campaigns/{cmp_doc['campaign_id']}/enroll", json={
            "country": "Oman",
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data["enrolled_count"] == 1
        assert data["total_enrolled"] == 1
        assert data["enrollment_mode"] == "filter"

    def test_cadence_enroll_supports_objectid_and_contact_id(self, client):
        mongo_db = get_db()
        oid_res = mongo_db.leads.insert_one({
            "company_name": "Riyadh Rice Co",
            "country": "Saudi Arabia",
            "emails": "info@riyadhrice.sa",
            "phones": "+966509988776",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })
        oid_str = str(oid_res.inserted_id)

        contact = client.post(f"/api/leads/{oid_str}/contacts", json={
            "full_name": "Faisal Al Harbi",
            "email": "faisal@riyadhrice.sa",
            "phone": "+966509988776",
        }).get_json()["contact"]

        FollowUpEngine.get_cadences()
        enr_res = client.post("/api/campaigns/cadences/enroll", json={
            "lead_id": oid_str,
            "contact_id": contact["contact_id"],
            "cadence_id": "CAD-COMMERCIAL-OUTREACH",
        })
        assert enr_res.status_code == 201
        enr = enr_res.get_json()["enrollment"]
        assert enr["lead_id"] == oid_str
        assert enr["contact_id"] == contact["contact_id"]
        assert enr["email"] == "faisal@riyadhrice.sa"

        run_res = FollowUpEngine.execute_due_followups()
        assert run_res["processed_count"] >= 1
        msg = mongo_db.omnichannel_messages.find_one({"lead_id": oid_str})
        assert msg is not None
        assert msg["contact_id"] == contact["contact_id"]

        FollowUpEngine.pause_on_client_reply(oid_str, "Email", "Interested, send PI.")
        paused = mongo_db.cadence_enrollments.find_one({"lead_id": oid_str})
        assert paused["has_replied"] is True
        assert "Paused" in paused["status"]

    def test_cross_company_single_contact_enrollment_rejected(self, client):
        lead_a, c1, _c2, cmp_doc = self._setup_lead_with_two_contacts(client)
        lead_b = client.post("/api/leads", json={
            "company_name": "Foreign Company LLC",
            "country": "United Arab Emirates",
            "emails": "info@foreign.ae",
        }).get_json()["lead"]
        foreign_contact = client.post(f"/api/leads/{lead_b['id']}/contacts", json={
            "full_name": "Foreign Contact",
            "email": "foreign@foreign.ae",
        }).get_json()["contact"]

        cid = cmp_doc["campaign_id"]
        res = client.post(f"/api/campaigns/{cid}/enroll", json={
            "lead_id": lead_a["id"],
            "enrollment_mode": "single_contact",
            "contact_id": foreign_contact["contact_id"],
        })
        assert res.status_code in (400, 404)
        assert get_db().campaign_enrollments.count_documents({"campaign_id": cid}) == 0

        # Also reject mixed [linked, foreign] contact_ids
        res_mix = client.post(f"/api/campaigns/{cid}/enroll", json={
            "lead_id": lead_a["id"],
            "enrollment_mode": "single_contact",
            "contact_ids": [c1["contact_id"], foreign_contact["contact_id"]],
        })
        assert res_mix.status_code in (400, 404)
        assert get_db().campaign_enrollments.count_documents({"campaign_id": cid}) == 0

        # FollowUpEngine.enroll_lead must also reject unlinked contact_id
        FollowUpEngine.get_cadences()
        cad_res = client.post("/api/campaigns/cadences/enroll", json={
            "lead_id": lead_a["id"],
            "contact_id": foreign_contact["contact_id"],
            "cadence_id": "CAD-COMMERCIAL-OUTREACH",
        })
        assert cad_res.status_code == 400

    def test_empty_company_all_contacts_zero_fabrication(self, client):
        empty_lead = client.post("/api/leads", json={
            "company_name": "Empty Shell Co",
            "country": "Oman",
            "contact_person": "Purchase Manager",
            "emails": "",
            "phones": "",
        }).get_json()["lead"]
        cmp_doc = client.post("/api/campaigns", json={
            "name": "Zero Fabrication Campaign",
            "channel": "Email",
        }).get_json()["campaign"]
        cid = cmp_doc["campaign_id"]

        res = client.post(f"/api/campaigns/{cid}/enroll", json={
            "lead_id": empty_lead["id"],
            "enrollment_mode": "all_contacts",
        })
        assert res.status_code == 200
        body = res.get_json()
        assert body["enrolled_count"] == 0
        assert body["enrolled_contacts"] == []
        assert body["enrolled_leads_count"] == 0
        assert body["enrolled_contacts_count"] == 0
        assert get_db().campaign_enrollments.count_documents({"campaign_id": cid}) == 0

    def test_legacy_filter_excludes_soft_deleted_and_no_double_count(self, client):
        l1 = client.post("/api/leads", json={
            "company_name": "Active UAE Co",
            "country": "United Arab Emirates",
            "lead_type": "importer",
            "emails": "buy@activeuae.ae",
        }).get_json()["lead"]
        l2 = client.post("/api/leads", json={
            "company_name": "Deleted UAE Co",
            "country": "United Arab Emirates",
            "lead_type": "importer",
            "emails": "buy@deleteduae.ae",
        }).get_json()["lead"]
        assert client.delete(f"/api/leads/{l2['id']}").status_code == 200

        cmp_doc = client.post("/api/campaigns", json={
            "name": "UAE Filter Dedup",
            "channel": "Email",
        }).get_json()["campaign"]
        cid = cmp_doc["campaign_id"]

        r1 = client.post(f"/api/campaigns/{cid}/enroll", json={
            "country": "United Arab Emirates",
            "lead_type": "importer",
        })
        assert r1.status_code == 200
        d1 = r1.get_json()
        assert d1["enrolled_count"] == 1
        assert d1["enrolled_leads_count"] == 1
        assert all(e["lead_id"] == l1["id"] for e in d1["enrolled_contacts"])

        r2 = client.post(f"/api/campaigns/{cid}/enroll", json={
            "country": "United Arab Emirates",
            "lead_type": "importer",
        })
        assert r2.status_code == 200
        d2 = r2.get_json()
        assert d2["enrolled_leads_count"] == 1
        assert d2["enrolled_contacts_count"] == 1

    def test_cadence_enroll_no_contact_id_does_not_overwrite_contact_row(self, client):
        lead, c1, _c2, _cmp = self._setup_lead_with_two_contacts(client)
        FollowUpEngine.get_cadences()

        r1 = client.post("/api/campaigns/cadences/enroll", json={
            "lead_id": lead["id"],
            "contact_id": c1["contact_id"],
            "cadence_id": "CAD-COMMERCIAL-OUTREACH",
        })
        assert r1.status_code == 201

        r2 = client.post("/api/campaigns/cadences/enroll", json={
            "lead_id": lead["id"],
            "cadence_id": "CAD-COMMERCIAL-OUTREACH",
        })
        assert r2.status_code == 201

        rows = list(get_db().cadence_enrollments.find({"lead_id": lead["id"]}))
        assert len(rows) == 2
        assert {r["contact_id"] for r in rows} == {c1["contact_id"], ""}
