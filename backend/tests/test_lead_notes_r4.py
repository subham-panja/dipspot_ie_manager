"""Tests for F3 Lead Notes, Timeline, Unified Outreach History, Omnichannel ObjectId, and F4 Metadata."""

from bson import ObjectId
from app.db import get_db, now_iso


class TestLeadNotesTimelineAndOutreachHistory:
    def _create_numeric_lead(self, client):
        resp = client.post("/api/leads", json={
            "company_name": "Doha Harvest Foods WLL",
            "country": "Qatar",
            "city_or_hub": "Doha",
            "emails": "sourcing@dohaharvest.qa",
            "phones": "+97455001122",
            "source_name": "ExportMandi",
            "source_url": "https://exportmandi.com/qatar-rice",
            "origin_state": "West Bengal",
            "b2b_directory": "ExportMandi",
            "harvest_date": "2026-11-18",
            "customs_manifest_data": "INCCU -> QAHMD | 2 FCL/mo",
            "source_category": "B2B Trade Portal",
            "source_reliability": 94,
            "annual_volume_est": "6,500 MT / Year",
            "commodities_list": ["IR-64 Parboiled", "Swarna Parboiled"],
        })
        assert resp.status_code == 201
        return resp.get_json()["lead"]

    def _insert_objectid_lead(self):
        mongo_db = get_db()
        res = mongo_db.leads.insert_one({
            "company_name": "Jeddah Grain Trading",
            "country": "Saudi Arabia",
            "city_or_hub": "Jeddah",
            "emails": "imports@jeddahgrain.sa",
            "phones": "+966501122334",
            "lead_type": "importer",
            "matched_varieties": "Miniket; IR-64",
            "nearest_port": "Jeddah Islamic Port (SAJED)",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })
        return str(res.inserted_id)

    def test_patch_extraction_notes_and_r4_fields_persisted(self, client):
        lead = self._create_numeric_lead(client)
        lid = lead["id"]
        assert lead["origin_state"] == "West Bengal"
        assert lead["b2b_directory"] == "ExportMandi"
        assert lead["harvest_date"] == "2026-11-18"
        assert lead["commodities_list"] == ["IR-64 Parboiled", "Swarna Parboiled"]

        patch_res = client.patch(f"/api/leads/{lid}", json={
            "extraction_notes": "Confirmed buyer prefers 25kg PP bags",
            "origin_state": "Burdwan, West Bengal",
            "b2b_directory": "Go4WorldBusiness",
            "harvest_date": "2026-11-22",
            "source_category": "Customs Manifest",
            "source_reliability": 99,
            "annual_volume_est": "9,000 MT / Year",
        })
        assert patch_res.status_code == 200
        updated = patch_res.get_json()["lead"]
        assert updated["extraction_notes"] == "Confirmed buyer prefers 25kg PP bags"
        assert updated["origin_state"] == "Burdwan, West Bengal"
        assert updated["b2b_directory"] == "Go4WorldBusiness"
        assert updated["harvest_date"] == "2026-11-22"
        assert updated["source_category"] == "Customs Manifest"
        assert updated["source_reliability"] == 99
        assert updated["annual_volume_est"] == "9,000 MT / Year"

        fetched = client.get(f"/api/leads/{lid}").get_json()["lead"]
        assert fetched["extraction_notes"] == "Confirmed buyer prefers 25kg PP bags"
        assert fetched["b2b_directory"] == "Go4WorldBusiness"

    def test_notes_crud_for_numeric_and_objectid_leads(self, client):
        num_lead = self._create_numeric_lead(client)
        oid_lead = self._insert_objectid_lead()

        for lid in (str(num_lead["id"]), oid_lead):
            # Empty note -> 400
            bad = client.post(f"/api/leads/{lid}/notes", json={"text": "   "})
            assert bad.status_code == 400

            # Valid note -> 201
            r_post = client.post(f"/api/leads/{lid}/notes", json={
                "text": "Spoke with buyer on WhatsApp regarding CIF terms",
                "author": "Subham",
                "tag": "Call Log",
            })
            assert r_post.status_code == 201
            note_id = r_post.get_json()["note"]["note_id"]

            r_list = client.get(f"/api/leads/{lid}/notes")
            assert r_list.status_code == 200
            assert r_list.get_json()["total"] == 1
            assert r_list.get_json()["notes"][0]["author"] == "Subham"

            # Delete note
            r_del = client.delete(f"/api/leads/{lid}/notes/{note_id}")
            assert r_del.status_code == 200
            assert client.get(f"/api/leads/{lid}/notes").get_json()["total"] == 0

            # Deleting again -> 404
            assert client.delete(f"/api/leads/{lid}/notes/{note_id}").status_code == 404

        # Nonexistent lead -> 404
        assert client.get(f"/api/leads/{ObjectId()}/notes").status_code == 404

    def test_timeline_and_outreach_history_aggregation(self, client):
        lead = self._create_numeric_lead(client)
        lid = lead["id"]

        # Add note, deal, omnichannel reply, campaign enrollment & broadcast
        client.post(f"/api/leads/{lid}/notes", json={"text": "Sent spec sheet", "tag": "Sales"})
        client.post(f"/api/leads/{lid}/convert-to-deal", json={"deal_value": 120000})
        client.post(f"/api/omnichannel/threads/{lid}/reply", json={
            "channel": "Email",
            "subject": "CIF Doha Offer",
            "content": "Please find attached our soft offer.",
        })

        cmp_res = client.post("/api/campaigns", json={
            "name": "Qatar Q4 Outreach",
            "channel": "Email",
            "target_countries": ["Qatar"],
        })
        cmp_id = cmp_res.get_json()["campaign"]["campaign_id"]
        client.post(f"/api/campaigns/{cmp_id}/enroll", json={"lead_id": lid, "enrollment_mode": "all_contacts"})
        client.post(f"/api/campaigns/{cmp_id}/broadcast")

        r_tl = client.get(f"/api/leads/{lid}/timeline")
        assert r_tl.status_code == 200
        tl_types = {e["type"] for e in r_tl.get_json()["timeline"]}
        assert "lead_harvested" in tl_types
        assert "note" in tl_types
        assert "deal" in tl_types
        assert "message_outbound" in tl_types
        assert "campaign_enrollment" in tl_types
        assert "campaign_dispatch" in tl_types

        r_oh = client.get(f"/api/leads/{lid}/outreach-history")
        assert r_oh.status_code == 200
        oh = r_oh.get_json()
        assert len(oh["enrollments"]) == 1
        sources = {m["source"] for m in oh["messages"]}
        assert "omnichannel" in sources
        assert "campaign_dispatch" in sources

    def test_omnichannel_supports_objectid_lead_without_crash(self, client):
        oid = self._insert_objectid_lead()

        # AI draft
        r_draft = client.post(f"/api/omnichannel/threads/{oid}/ai-draft")
        assert r_draft.status_code == 200
        assert r_draft.get_json()["lead_id"] == oid

        # Outbound reply
        r_reply = client.post(f"/api/omnichannel/threads/{oid}/reply", json={
            "channel": "WhatsApp",
            "content": "Hello from TradePulse export desk.",
        })
        assert r_reply.status_code == 200

        # Inbound webhook with ObjectId string
        r_in = client.post("/api/omnichannel/inbound", json={
            "lead_id": oid,
            "channel": "WhatsApp",
            "message_text": "Please send CIF Jeddah quote for 10 containers.",
        })
        assert r_in.status_code == 201

        # Thread detail & outreach history
        r_detail = client.get(f"/api/omnichannel/threads/{oid}")
        assert r_detail.status_code == 200
        assert len(r_detail.get_json()["messages"]) == 2

        r_oh = client.get(f"/api/leads/{oid}/outreach-history")
        assert r_oh.status_code == 200
        assert r_oh.get_json()["total"] == 2

    def test_patch_dict_customs_manifest_sqlite_safe(self, client, app):
        from app.models import Lead, db

        lead = self._create_numeric_lead(client)
        lid = lead["id"]
        manifest_obj = {"bl_number": "BL-123", "mt": 100}
        res = client.patch(f"/api/leads/{lid}", json={"customs_manifest_data": manifest_obj})
        assert res.status_code == 200
        assert res.get_json()["lead"]["customs_manifest_data"] == manifest_obj

        # SQLAlchemy session must remain clean and store serialized JSON
        with app.app_context():
            sq = db.session.get(Lead, lid)
            assert sq is not None
            assert '"bl_number": "BL-123"' in sq.customs_manifest_data

    def test_sqlite_lead_to_dict_parity_and_supplier_defaults(self, app):
        from app.models import Lead, db
        from app.routes.api_helpers import serialize_mongo_lead

        with app.app_context():
            supplier = Lead(
                company_name="Bengal Agro Mill",
                country="India",
                lead_type="supplier",
                phones="+919830011223",
                matched_varieties="1121 Basmati; IR-64 Parboiled",
            )
            db.session.add(supplier)
            db.session.commit()
            d = supplier.to_dict()
            assert all("→" in lane and "&rarr;" not in lane for lane in d["key_trade_lanes"])
            assert d["commodities_list"] == ["1121 Basmati", "IR-64 Parboiled"]
            assert d["importer_tier"] == ""
            assert d["whatsapp_url"] == ""
            assert d["source_category"] != "Commercial Trade Manifest"

        mongo_supplier = serialize_mongo_lead({
            "id": 501,
            "company_name": "WB Exporter Ltd",
            "country": "India",
            "lead_type": "exporter",
        })
        assert mongo_supplier["source_category"] != "Commercial Trade Manifest"
        assert mongo_supplier["importer_tier"] == ""

    def test_source_reliability_zero_preserved_and_non_numeric_rejected(self, client):
        # POST with source_reliability=0 preserves 0
        r0 = client.post("/api/leads", json={
            "company_name": "Zero Reliability Co",
            "country": "Oman",
            "source_reliability": 0,
        })
        assert r0.status_code == 201
        lead = r0.get_json()["lead"]
        assert lead["source_reliability"] == 0

        # PATCH with source_reliability=0 preserves 0
        rp0 = client.patch(f"/api/leads/{lead['id']}", json={"source_reliability": 0})
        assert rp0.status_code == 200
        assert rp0.get_json()["lead"]["source_reliability"] == 0

        # POST & PATCH with non-numeric source_reliability return 400
        bad_post = client.post("/api/leads", json={
            "company_name": "Bad Reliability Co",
            "source_reliability": "abc",
        })
        assert bad_post.status_code == 400

        bad_patch = client.patch(f"/api/leads/{lead['id']}", json={"source_reliability": "abc"})
        assert bad_patch.status_code == 400
