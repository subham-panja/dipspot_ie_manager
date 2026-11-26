"""Tests for F1 M2M Contact <-> Company model, deduplication, lazy backfill, and APIs."""

import pytest
from sqlalchemy.exc import IntegrityError
from app.db import get_db, now_iso


class TestContactSQLiteModels:
    def test_contact_and_company_contact_unique_constraint(self, app, sample_lead_data):
        from app.models import Lead, db
        from app.models_contacts import CompanyContact, Contact

        with app.app_context():
            lead = Lead(**sample_lead_data)
            db.session.add(lead)
            db.session.flush()

            contact = Contact(
                contact_id="CNT-TEST001",
                full_name="Tariq Al Mansoor",
                job_title="Head of Procurement",
                email="tariq@alfazal.ae",
                phone="+971501112233",
                linkedin_profile_url="https://www.linkedin.com/in/tariq-mansoor",
                source="manual",
                verified=True,
            )
            db.session.add(contact)
            db.session.flush()

            link1 = CompanyContact(
                lead_id=lead.id,
                contact_id=contact.id,
                role_at_company="Procurement Lead",
                is_primary=True,
            )
            db.session.add(link1)
            db.session.commit()

            assert lead.to_dict()["contacts_count"] == 1
            assert contact.to_dict()["contact_id"] == "CNT-TEST001"

            dup_link = CompanyContact(lead_id=lead.id, contact_id=contact.id)
            db.session.add(dup_link)
            with pytest.raises(IntegrityError):
                db.session.commit()
            db.session.rollback()

    def test_lead_to_dict_exposes_f4_metadata(self, app, sample_mill_data):
        from app.models import Lead, db

        with app.app_context():
            data = dict(sample_mill_data)
            data.update({
                "origin_state": "West Bengal",
                "b2b_directory": "WBRMA Member Directory",
                "harvest_date": "2026-11-20",
                "customs_manifest_data": "INCCU-EXP-2026",
                "source_name": "WBRMA",
                "source_category": "Mill Association",
                "source_reliability": 98,
                "shipment_volume": "10-15 FCL/mo",
                "annual_volume_est": "12,000 MT / Year",
                "nearest_port": "Kolkata Port (INCCU)",
                "extraction_notes": "Verified mill unit",
            })
            lead = Lead(**data)
            db.session.add(lead)
            db.session.commit()

            d = lead.to_dict()
            assert d["origin_state"] == "West Bengal"
            assert d["b2b_directory"] == "WBRMA Member Directory"
            assert d["harvest_date"] == "2026-11-20"
            assert d["customs_manifest_data"] == "INCCU-EXP-2026"
            assert d["source_name"] == "WBRMA"
            assert d["source_category"] == "Mill Association"
            assert d["source_reliability"] == 98
            assert d["shipment_volume"] == "10-15 FCL/mo"
            assert d["annual_volume_est"] == "12,000 MT / Year"
            assert d["nearest_port"] == "Kolkata Port (INCCU)"
            assert d["extraction_notes"] == "Verified mill unit"
            assert d["contacts_count"] == 0


class TestContactDeduplicationAndM2M:
    def _create_lead(self, client, name="Alpha Grains LLC", country="United Arab Emirates", **extra):
        payload = {"company_name": name, "country": country, "lead_type": "importer", **extra}
        resp = client.post("/api/leads", json=payload)
        assert resp.status_code == 201
        return resp.get_json()["lead"]

    def test_dedup_by_normalized_linkedin_and_reject_search_url(self, client):
        r1 = client.post("/api/contacts", json={
            "full_name": "Tariq Mansoor",
            "job_title": "Import Director",
            "linkedin_profile_url": "https://ae.linkedin.com/in/Tariq-Mansoor/?trk=public_profile",
        })
        assert r1.status_code == 201
        c1 = r1.get_json()["contact"]
        assert c1["linkedin_profile_url"] == "https://www.linkedin.com/in/tariq-mansoor"
        assert r1.get_json()["deduplicated"] is False

        # Second create with different domain/trailing slash -> deduped to same contact
        r2 = client.post("/api/contacts", json={
            "full_name": "Tariq Mansoor",
            "email": "tariq@alphagrains.ae",
            "linkedin_profile_url": "http://www.linkedin.com/in/tariq-mansoor/",
        })
        assert r2.status_code == 201
        assert r2.get_json()["deduplicated"] is True
        assert r2.get_json()["contact"]["contact_id"] == c1["contact_id"]
        assert r2.get_json()["contact"]["email"] == "tariq@alphagrains.ae"

        # Search URL must NOT be treated as a profile dedup key
        r_s1 = client.post("/api/contacts", json={
            "full_name": "Person One",
            "linkedin_profile_url": "https://www.linkedin.com/search/results/people/?keywords=Alpha",
        })
        r_s2 = client.post("/api/contacts", json={
            "full_name": "Person Two",
            "linkedin_profile_url": "https://www.linkedin.com/search/results/people/?keywords=Alpha",
        })
        assert r_s1.status_code == 201 and r_s2.status_code == 201
        assert r_s1.get_json()["contact"]["contact_id"] != r_s2.get_json()["contact"]["contact_id"]

    def test_dedup_by_email_and_name_phone_and_patch_conflict(self, client):
        r1 = client.post("/api/contacts", json={
            "full_name": "Raza Khan",
            "email": "Raza.Khan@GulfRice.com",
            "phone": "+971 50 987 6543",
        })
        assert r1.status_code == 201
        cid1 = r1.get_json()["contact"]["contact_id"]

        # Dedup by case-insensitive email
        r2 = client.post("/api/contacts", json={
            "full_name": "Raza K.",
            "email": "raza.khan@gulfrice.com",
        })
        assert r2.status_code == 201
        assert r2.get_json()["deduplicated"] is True
        assert r2.get_json()["contact"]["contact_id"] == cid1

        # Dedup by (full_name, phone) when email absent
        r3 = client.post("/api/contacts", json={
            "full_name": "Raza Khan",
            "phone": "971-50-987-6543",
            "job_title": "VP Sourcing",
        })
        assert r3.status_code == 201
        assert r3.get_json()["deduplicated"] is True
        assert r3.get_json()["contact"]["contact_id"] == cid1

        # Second distinct contact -> PATCH to collide on email returns 409
        r4 = client.post("/api/contacts", json={
            "full_name": "Other Buyer",
            "email": "other@gulfrice.com",
        })
        assert r4.status_code == 201
        cid2 = r4.get_json()["contact"]["contact_id"]

        patch_clash = client.patch(f"/api/contacts/{cid2}", json={"email": "raza.khan@gulfrice.com"})
        assert patch_clash.status_code == 409

    def test_m2m_link_and_unlink_preserves_contact_and_updates_counts(self, client):
        l1 = self._create_lead(client, name="Company One LLC", emails="info@one.ae")
        l2 = self._create_lead(client, name="Company Two LLC", emails="info@two.ae")

        r_add = client.post(f"/api/leads/{l1['id']}/contacts", json={
            "full_name": "Amina Patel",
            "job_title": "Commodity Buyer",
            "email": "amina@tradehub.ae",
            "linkedin_profile_url": "https://www.linkedin.com/in/amina-patel",
            "is_primary": True,
        })
        assert r_add.status_code == 201
        cid = r_add.get_json()["contact"]["contact_id"]

        # Link same existing contact to Company Two
        r_link2 = client.post(f"/api/leads/{l2['id']}/contacts", json={
            "contact_id": cid,
            "role_at_company": "External Advisor",
        })
        assert r_link2.status_code == 201

        # Verify GET /api/contacts/<cid> shows both companies
        r_get = client.get(f"/api/contacts/{cid}")
        assert r_get.status_code == 200
        companies = r_get.get_json()["contact"]["companies"]
        assert len(companies) == 2
        assert {c["company_name"] for c in companies} == {"Company One LLC", "Company Two LLC"}

        # Verify contacts_count on single lead
        r_lead1 = client.get(f"/api/leads/{l1['id']}")
        assert r_lead1.get_json()["lead"]["contacts_count"] == 1

        # Unlink from Company One -> contact & Company Two link must remain
        r_unlink = client.delete(f"/api/leads/{l1['id']}/contacts/{cid}")
        assert r_unlink.status_code == 200
        assert r_unlink.get_json()["remaining_companies"] == 1

        r_get_after = client.get(f"/api/contacts/{cid}")
        assert r_get_after.status_code == 200
        assert len(r_get_after.get_json()["contact"]["companies"]) == 1
        assert r_get_after.get_json()["contact"]["companies"][0]["company_name"] == "Company Two LLC"

        # Verify contacts_count updated to 0 on Company One
        assert client.get(f"/api/leads/{l1['id']}").get_json()["lead"]["contacts_count"] == 0

    def test_cross_key_merge_returns_409_not_500(self, client):
        r1 = client.post("/api/contacts", json={
            "full_name": "Cross User",
            "email": "cross@acme.com",
        })
        r2 = client.post("/api/contacts", json={
            "full_name": "Cross User",
            "linkedin_profile_url": "https://www.linkedin.com/in/cross-user",
        })
        assert r1.status_code == 201 and r2.status_code == 201

        # POST supplying both keys owned by different contacts must return 409, not 500
        r3 = client.post("/api/contacts", json={
            "full_name": "Cross User",
            "linkedin_profile_url": "https://www.linkedin.com/in/cross-user",
            "email": "cross@acme.com",
        })
        assert r3.status_code == 409

        # Same via /api/leads/<id>/contacts
        lead = self._create_lead(client, name="Cross Co LLC")
        r4 = client.post(f"/api/leads/{lead['id']}/contacts", json={
            "full_name": "Cross User",
            "linkedin_profile_url": "https://www.linkedin.com/in/cross-user",
            "email": "cross@acme.com",
        })
        assert r4.status_code == 409

    def test_patch_strips_blocked_linkedin_urls(self, client):
        r1 = client.post("/api/contacts", json={
            "full_name": "Patched User",
            "linkedin_profile_url": "https://www.linkedin.com/in/patched-user",
        })
        assert r1.status_code == 201
        cid = r1.get_json()["contact"]["contact_id"]

        for blocked_url in (
            "https://www.linkedin.com/search/results/people/?keywords=foo",
            "https://www.linkedin.com/company/acme-corp",
            "https://www.linkedin.com/jobs/view/12345",
            "https://www.linkedin.com/school/mit",
        ):
            res = client.patch(f"/api/contacts/{cid}", json={"linkedin_profile_url": blocked_url})
            assert res.status_code == 200
            assert res.get_json()["contact"]["linkedin_profile_url"] == ""
            raw_doc = get_db().contacts.find_one({"contact_id": cid})
            assert "norm_linkedin" not in raw_doc


class TestZeroFabricationLazyBackfill:
    def test_lazy_backfill_creates_contact_only_for_genuine_info(self, client):
        # 1. Lead with genuine email & contact_person -> backfills 1 contact
        r_good = client.post("/api/leads", json={
            "company_name": "Genuine Traders LLC",
            "country": "Qatar",
            "contact_person": "James K Varghese (Director)",
            "emails": "james@genuinetraders.qa",
            "phones": "+97444112233",
        })
        good_id = r_good.get_json()["lead"]["id"]
        res_good = client.get(f"/api/leads/{good_id}/contacts")
        assert res_good.status_code == 200
        contacts = res_good.get_json()["contacts"]
        assert len(contacts) == 1
        assert contacts[0]["full_name"] == "James K Varghese"
        assert contacts[0]["job_title"] == "Director"
        assert contacts[0]["email"] == "james@genuinetraders.qa"

        # 2. Lead with NO email, NO >=7-digit phone, NO /in/ LinkedIn URL (even with placeholder contact_person)
        mongo_db = get_db()
        oid_res = mongo_db.leads.insert_one({
            "company_name": "Empty Shell Co",
            "country": "Oman",
            "contact_person": "Purchase Manager",
            "emails": "",
            "phones": "123",
            "linkedin_search_url": "https://www.linkedin.com/search/results/people/?keywords=Empty+Shell",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })
        oid_str = str(oid_res.inserted_id)

        res_empty = client.get(f"/api/leads/{oid_str}/contacts")
        assert res_empty.status_code == 200
        assert res_empty.get_json()["contacts"] == []
        assert mongo_db.contacts.count_documents({}) == 1
