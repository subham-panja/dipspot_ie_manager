import json
import pytest
from app.sources import IMPORTER_SOURCES, SUPPLIER_SOURCES, get_indian_supplier_sources, get_all_sources
from app.lead_engine import calculate_lead_similarity
from app.db import get_db, now_iso


def test_sources_count_and_indian_focus():
    """Verify >= 100 importer sources, >= 100 supplier sources, and >= 60 Indian sources."""
    assert len(IMPORTER_SOURCES) >= 100, f"Expected >= 100 importers, got {len(IMPORTER_SOURCES)}"
    assert len(SUPPLIER_SOURCES) >= 100, f"Expected >= 100 suppliers, got {len(SUPPLIER_SOURCES)}"
    indian_suppliers = get_indian_supplier_sources()
    assert len(indian_suppliers) >= 60, f"Expected >= 60 Indian suppliers, got {len(indian_suppliers)}"

    all_sources = get_all_sources()
    assert len(all_sources) >= 200


def test_calculate_lead_similarity_95_percent_threshold():
    """Test 95% similarity logic across domains, exact names, and distinct entities."""
    cand = {
        "company_name": "Al-Mansoor Foodstuff Trading LLC",
        "country": "United Arab Emirates",
        "website": "https://www.almansoor-trade.com",
        "phones": "+971 4 223 9011",
        "gstin": "",
    }

    # 1. Exact match on web domain -> >= 95%
    exist_same_domain = {
        "company_name": "Al Mansoor Global Foods",
        "country": "United Arab Emirates",
        "website": "https://www.almansoor-trade.com",
        "phones": "+971 4 999 0000",
    }
    score, reason, fields = calculate_lead_similarity(cand, exist_same_domain)
    assert score >= 95.0
    assert "website" in fields

    # 2. Distinct entity with no common domain or key -> < 95%
    exist_diff = {
        "company_name": "Dubai Pacific Rice Merchants Co",
        "country": "United Arab Emirates",
        "website": "https://www.dubaipacificrice.com",
        "phones": "+971 4 881 1234",
    }
    score_diff, reason_diff, fields_diff = calculate_lead_similarity(cand, exist_diff)
    assert score_diff < 95.0


def test_lead_full_editability(client):
    """Verify any field on a lead can be updated via PATCH /api/leads/<id>."""
    # Create lead
    post_resp = client.post(
        "/api/leads",
        data=json.dumps({
            "company_name": "Original Name Trading",
            "country": "Saudi Arabia",
            "city_or_hub": "Jeddah",
            "contact_person": "Ali Hassan",
            "phones": "+966 50 111 2222",
            "emails": "ali@original.com",
            "matched_varieties": "Basmati Rice",
            "priority_score": 80,
            "lead_type": "importer",
        }),
        content_type="application/json",
    )
    assert post_resp.status_code == 201
    lead_id = post_resp.get_json()["lead"]["id"]

    # PATCH update multiple fields
    patch_resp = client.patch(
        f"/api/leads/{lead_id}",
        data=json.dumps({
            "company_name": "Updated Gulf Commodity Group",
            "contact_person": "Sultan Al-Otaibi",
            "custom_label": "Q1-Saudi-Outreach",
            "priority_score": 95,
            "matched_varieties": "Super Basmati 1121; IR-64 Parboiled",
        }),
        content_type="application/json",
    )
    assert patch_resp.status_code == 200
    updated = patch_resp.get_json()["lead"]
    assert updated["company_name"] == "Updated Gulf Commodity Group"
    assert updated["contact_person"] == "Sultan Al-Otaibi"
    assert updated["custom_label"] == "Q1-Saudi-Outreach"
    assert updated["priority_score"] == 95
    assert "Super Basmati 1121" in updated["matched_varieties"]


def test_lead_soft_delete_and_restore(client):
    """Verify soft-delete marks is_deleted=True, hides from regular lists, and restores successfully."""
    # Create lead
    post_resp = client.post(
        "/api/leads",
        data=json.dumps({
            "company_name": "Soft Delete Test Corp",
            "country": "Germany",
            "lead_type": "importer",
        }),
        content_type="application/json",
    )
    lead_id = post_resp.get_json()["lead"]["id"]

    # Soft delete
    del_resp = client.delete(f"/api/leads/{lead_id}")
    assert del_resp.status_code == 200
    assert del_resp.get_json()["is_deleted"] is True

    # Regular GET should return 404 (hidden)
    get_resp = client.get(f"/api/leads/{lead_id}")
    assert get_resp.status_code == 404

    # Trash route should include this lead
    trash_resp = client.get("/api/leads/trash")
    assert trash_resp.status_code == 200
    trash_leads = trash_resp.get_json()["leads"]
    assert any(str(l["id"]) == str(lead_id) for l in trash_leads)

    # Restore lead
    restore_resp = client.post(f"/api/leads/{lead_id}/restore")
    assert restore_resp.status_code == 200

    # Lead should now be accessible again
    get_again = client.get(f"/api/leads/{lead_id}")
    assert get_again.status_code == 200
    assert get_again.get_json()["lead"]["company_name"] == "Soft Delete Test Corp"


def test_pipeline_deal_interactive_comments(client):
    """Verify adding, fetching, and deleting interactive comments on a deal."""
    # Create deal
    deal_resp = client.post(
        "/api/pipeline/deals",
        data=json.dumps({
            "title": "Export 500 MT Parboiled Rice to Dubai",
            "company_name": "Emirates Grain Hub LLC",
            "country": "United Arab Emirates",
            "commodity": "IR-64 Parboiled Rice",
            "quantity_mt": 500,
            "value_usd": 235000,
        }),
        content_type="application/json",
    )
    assert deal_resp.status_code == 201
    deal_id = deal_resp.get_json()["deal"]["deal_id"]

    # Post comment
    c_resp = client.post(
        f"/api/pipeline/deals/{deal_id}/comments",
        data=json.dumps({
            "text": "Buyer confirmed L/C at sight opened via Emirates NBD.",
            "author": "Logistics Lead",
            "tag": "L/C Verification",
        }),
        content_type="application/json",
    )
    assert c_resp.status_code == 201
    comment_id = c_resp.get_json()["comment"]["id"]

    # Fetch comments
    list_resp = client.get(f"/api/pipeline/deals/{deal_id}/comments")
    assert list_resp.status_code == 200
    comments = list_resp.get_json()["comments"]
    assert len(comments) == 1
    assert comments[0]["text"] == "Buyer confirmed L/C at sight opened via Emirates NBD."
    assert comments[0]["author"] == "Logistics Lead"

    # Delete comment
    del_c_resp = client.delete(f"/api/pipeline/deals/{deal_id}/comments/{comment_id}")
    assert del_c_resp.status_code == 200

    # Comments should now be empty
    list_after = client.get(f"/api/pipeline/deals/{deal_id}/comments")
    assert len(list_after.get_json()["comments"]) == 0


def test_crawler_history_endpoint(client):
    """Verify /api/crawler/history returns recorded extraction runs with custom labels."""
    resp = client.get("/api/crawler/history")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "history" in data
    assert "total" in data
