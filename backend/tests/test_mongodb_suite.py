import json
import pytest


class TestPipelineAPI:
    def test_get_pipeline_stages(self, client):
        resp = client.get("/api/pipeline/stages")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "stages" in data
        assert len(data["stages"]) >= 8
        assert any(s["stage_id"] == "inquiry" for s in data["stages"])

    def test_create_and_update_deal(self, client):
        payload = {
            "title": "Test 100 MT Deal",
            "company_name": "Test Importer LLC",
            "country": "United Arab Emirates",
            "commodity": "IR-64 Parboiled",
            "quantity_mt": 100,
            "value_usd": 45000,
            "incoterm": "CIF Jebel Ali",
        }
        res = client.post("/api/pipeline/deals", data=json.dumps(payload), content_type="application/json")
        assert res.status_code == 201
        deal = res.get_json()["deal"]
        deal_id = deal["deal_id"]
        assert deal_id.startswith("DEAL-")
        assert deal["stage_id"] == "inquiry"

        # Update stage
        patch_res = client.patch(f"/api/pipeline/deals/{deal_id}", data=json.dumps({"stage_id": "contract_signed", "note": "Signed PI"}), content_type="application/json")
        assert patch_res.status_code == 200
        assert patch_res.get_json()["deal"]["stage_id"] == "contract_signed"

        # Delete
        del_res = client.delete(f"/api/pipeline/deals/{deal_id}")
        assert del_res.status_code == 200


class TestCampaignsAPI:
    def test_get_campaigns(self, client):
        client.post(
            "/api/campaigns",
            data=json.dumps({"name": "GCC Sourcing Campaign", "channel": "Email"}),
            content_type="application/json",
        )
        resp = client.get("/api/campaigns")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "campaigns" in data
        assert len(data["campaigns"]) >= 1

    def test_create_and_enroll_campaign(self, client):
        payload = {
            "name": "Test Oman Campaign",
            "channel": "Email",
            "target_commodity": "Parboiled Rice",
            "template_subject": "Rice Export Offer",
            "template_body": "Hello from Kolkata mill",
        }
        res = client.post("/api/campaigns", data=json.dumps(payload), content_type="application/json")
        assert res.status_code == 201
        cmp_id = res.get_json()["campaign"]["campaign_id"]

        # Enroll
        enroll_res = client.post(f"/api/campaigns/{cmp_id}/enroll", data=json.dumps({"country": "United Arab Emirates"}), content_type="application/json")
        assert enroll_res.status_code == 200
        assert "enrolled_count" in enroll_res.get_json()

        # Delete
        client.delete(f"/api/campaigns/{cmp_id}")


class TestShipmentsAPI:
    def test_get_shipment_stages(self, client):
        resp = client.get("/api/shipments/stages")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "stages" in data
        assert len(data["stages"]) >= 5

    def test_create_and_track_shipment(self, client):
        payload = {
            "customer_name": "Test Doha Supermarket",
            "destination_port": "Hamad Port, Doha",
            "cargo_description": "200 MT Miniket Parboiled",
            "container_numbers": "MSKU1122334, MSKU1122335",
        }
        res = client.post("/api/shipments", data=json.dumps(payload), content_type="application/json")
        assert res.status_code == 201
        trk_num = res.get_json()["shipment"]["tracking_number"]
        assert trk_num.startswith("TRK-")

        # Test Public Tracking Link
        track_res = client.get(f"/api/shipments/track/{trk_num}")
        assert track_res.status_code == 200
        track_data = track_res.get_json()
        assert track_data["found"] is True
        assert track_data["tracking_number"] == trk_num
        assert len(track_data["milestones"]) >= 5

        # Update stage
        patch_res = client.patch(f"/api/shipments/{trk_num}", data=json.dumps({"current_stage_id": "vessel_sailed", "progress_percent": 50}), content_type="application/json")
        assert patch_res.status_code == 200
        assert patch_res.get_json()["shipment"]["progress_percent"] == 50

        # Delete
        client.delete(f"/api/shipments/{trk_num}")


class TestCompetitiveIntelligenceAPI:
    def test_get_intelligence_summary(self, client):
        resp = client.get("/api/intelligence/summary")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "total_tracked_competitors" in data
        assert data["total_tracked_competitors"] >= 1

    def test_get_competitors(self, client):
        resp = client.get("/api/intelligence/competitors")
        assert resp.status_code == 200
        assert len(resp.get_json()["competitors"]) >= 1

    def test_get_freight(self, client):
        resp = client.get("/api/intelligence/freight")
        assert resp.status_code == 200
        assert len(resp.get_json()["freight_index"]) >= 1

    def test_get_pricing(self, client):
        resp = client.get("/api/intelligence/pricing")
        assert resp.status_code == 200
        assert len(resp.get_json()["price_benchmarks"]) >= 1

    def test_get_tariffs(self, client):
        resp = client.get("/api/intelligence/tariffs")
        assert resp.status_code == 200
        assert len(resp.get_json()["tariffs"]) >= 1


class TestConfigAPI:
    def test_get_and_update_config(self, client):
        resp = client.get("/api/config")
        assert resp.status_code == 200
        conf = resp.get_json()["config"]
        assert "user_agent" in conf

        patch_res = client.patch("/api/config", data=json.dumps({"timeout_seconds": 30}), content_type="application/json")
        assert patch_res.status_code == 200
        assert patch_res.get_json()["config"]["timeout_seconds"] == 30


class TestDedicatedLeadsEndpoints:
    def test_get_importers_endpoint(self, client):
        resp = client.get("/api/leads/importers?country=United Arab Emirates")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "importers" in data
        assert "aggregations" in data
        assert "total_importers" in data["aggregations"]
        assert "top_countries" in data["aggregations"]

    def test_get_suppliers_endpoint(self, client):
        resp = client.get("/api/leads/suppliers?district=Burdwan")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "suppliers" in data
        assert "aggregations" in data
        assert "verified_gst_count" in data["aggregations"]
        assert "top_districts" in data["aggregations"]


class TestTemplateEngineAPI:
    def test_get_templates(self, client):
        resp = client.get("/api/campaigns/templates")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "templates" in data
        assert len(data["templates"]) >= 1

    def test_preview_template(self, client):
        payload = {
            "body": "Hello {contact_name} at {company_name}, your {commodity} is loading at {port}.",
            "customer": {
                "contact_name": "John Doe",
                "company_name": "Acme Global",
                "commodity": "Basmati Rice",
                "port": "Kolkata Port",
            }
        }
        resp = client.post("/api/campaigns/templates/preview", data=json.dumps(payload), content_type="application/json")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["hydrated_body"] == "Hello John Doe at Acme Global, your Basmati Rice is loading at Kolkata Port."

    def test_test_send_template(self, client):
        payload = {
            "template_id": "TPL-EMAIL-FOB",
            "recipient": "buyer@uae-grain.com",
            "subject": "Spot Offer {commodity}",
            "body": "Dear {contact_name}, here is quote for {commodity} to {port}.",
            "channel": "Email",
            "customer": {
                "contact_name": "Tariq",
                "commodity": "IR-64 Parboiled Rice",
                "port": "Jebel Ali Port"
            }
        }
        resp = client.post("/api/campaigns/templates/test-send", data=json.dumps(payload), content_type="application/json")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is True
        assert "dispatch_id" in data

    def test_test_send_sms(self, client):
        payload = {
            "template_id": "TPL-SMS-BL",
            "recipient": "+971501234567",
            "body": "Alert for {company_name}: BL released for {commodity}.",
            "channel": "SMS",
            "customer": {
                "company_name": "Al-Dhiyafa LLC",
                "commodity": "Wheat Grain"
            }
        }
        resp = client.post("/api/campaigns/templates/test-send", data=json.dumps(payload), content_type="application/json")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is True
        assert data["segments"] >= 1

    def test_get_dispatches(self, client):
        payload = {
            "template_id": "TPL-SMS-BL",
            "recipient": "+971501234567",
            "body": "Alert for {company_name}: BL released for {commodity}.",
            "channel": "SMS",
            "customer": {
                "company_name": "Al-Dhiyafa LLC",
                "commodity": "Wheat Grain",
            },
        }
        client.post("/api/campaigns/templates/test-send", data=json.dumps(payload), content_type="application/json")
        resp = client.get("/api/campaigns/templates/dispatches")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "dispatches" in data
        assert len(data["dispatches"]) >= 1


class TestPortsDirectoryAPI:
    def test_get_ports(self, client):
        resp = client.get("/api/shipments/ports")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "ports" in data
        assert any(p["port_code"] == "INCCU" for p in data["ports"])
        assert any(p["port_code"] == "AEJEA" for p in data["ports"])


