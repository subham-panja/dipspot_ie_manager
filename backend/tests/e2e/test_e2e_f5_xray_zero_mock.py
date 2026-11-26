"""E2E Tests — F5: Live RecruitIn X-Ray Search with Zero-Mock Invariant (Tier 1 & Tier 2)."""

from tests.e2e.helpers_e2e import assert_zero_mock_xray_response, get_json, post_json


# ---------------------------------------------------------------------------
# Tier 1 — Happy-Path Feature Coverage (5 tests)
# ---------------------------------------------------------------------------


def test_f5_t1_xray_query_endpoint_builds_linkedin_boolean_query(client):
    resp = post_json(
        client,
        "/api/xray/query",
        {
            "company_name": "Al Maya Group",
            "country": "United Arab Emirates",
            "platform": "linkedin",
        },
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert "site:linkedin.com/in/" in data["query"]
    assert "Al Maya Group" in data["query"]
    for engine in ("google", "bing", "duckduckgo"):
        assert engine in data["search_urls"]
        assert data["search_urls"][engine].startswith("https://")


def test_f5_t1_xray_search_returns_contract_schema_and_fallbacks(client, serp_server, monkeypatch):
    serp_server.mode = "bing_valid"
    serp_server.route_search_engines(monkeypatch)

    resp = post_json(
        client,
        "/api/xray/search",
        {
            "company_name": "Al Fazal Rice Trading LLC",
            "country": "United Arab Emirates",
            "platform": "linkedin",
            "website": "https://alfazalrice.ae",
        },
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    data = resp.get_json()
    required = {
        "success",
        "company_name",
        "country",
        "platform",
        "query",
        "engine_used",
        "status",
        "fallback_used",
        "count",
        "profiles",
        "persisted_contacts",
        "fallbacks",
    }
    assert required.issubset(data.keys())
    assert data["success"] is True
    assert data["status"] in ("live_results", "no_results", "rate_limited_or_offline")
    assert "linkedin_keyword_search_url" in data["fallbacks"]
    assert "search_urls" in data["fallbacks"]
    assert "corporate_contact_urls" in data["fallbacks"]


def test_f5_t1_xray_search_live_or_graceful_fallback_never_fabricates(
    client, serp_server, monkeypatch
):
    serp_server.mode = "bing_valid"
    serp_server.route_search_engines(monkeypatch)

    r_live = post_json(
        client,
        "/api/xray/search",
        {
            "company_name": "Al Fazal Rice Trading LLC",
            "country": "United Arab Emirates",
            "platform": "linkedin",
        },
    )
    assert r_live.status_code == 200
    live_data = r_live.get_json()
    assert live_data["status"] == "live_results"
    assert live_data["fallback_used"] is False
    assert live_data["count"] == 2
    urls = {p["profile_url"] for p in live_data["profiles"]}
    assert urls == {
        "https://www.linkedin.com/in/hassan-al-rashid-ae",
        "https://www.linkedin.com/in/priya-nair-dubai",
    }
    for p in live_data["profiles"]:
        assert p["name"] and p["title"] and "/in/" in p["profile_url"]

    serp_server.mode = "empty_serp"
    r_empty = post_json(
        client,
        "/api/xray/search",
        {
            "company_name": "Unknown Boutique Importer",
            "country": "Oman",
            "website": "https://unknownboutique.om",
        },
    )
    assert r_empty.status_code == 200
    assert_zero_mock_xray_response(r_empty.get_json(), expect_website_domain="unknownboutique.om")


def test_f5_t1_xray_search_persist_true_creates_m2m_contacts(
    client, create_lead, serp_server, monkeypatch
):
    serp_server.mode = "ddg_valid"
    serp_server.route_search_engines(monkeypatch)
    lead = create_lead(company_name="Al Fazal Rice Trading LLC", contact_person="")

    resp = post_json(
        client,
        "/api/xray/search",
        {
            "company_name": "Al Fazal Rice Trading LLC",
            "country": "United Arab Emirates",
            "lead_id": lead["id"],
            "persist": True,
        },
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["count"] == 2
    assert len(data["persisted_contacts"]) == 2

    status, company_contacts = get_json(client, f"/api/leads/{lead['id']}/contacts")
    assert status == 200
    assert len(company_contacts["contacts"]) == 2
    names = {c["full_name"] for c in company_contacts["contacts"]}
    assert names == {"Hassan Al Rashid", "Priya Nair"}


def test_f5_t1_xray_search_get_method_parity_and_website_corporate_links(
    client, serp_server, monkeypatch
):
    serp_server.mode = "empty_serp"
    serp_server.route_search_engines(monkeypatch)

    status, data = get_json(
        client,
        "/api/xray/search?company_name=Sonik+Industries&country=India&website=https://sonikmills.in",
    )
    assert status == 200
    assert_zero_mock_xray_response(data, expect_website_domain="sonikmills.in")
    assert any("sonikmills.in/contact" in u for u in data["fallbacks"]["corporate_contact_urls"])


def test_f5_t1_xray_search_parses_google_serp_profiles(client, serp_server, monkeypatch):
    serp_server.mode = "google_only"
    serp_server.route_search_engines(monkeypatch)

    resp = post_json(
        client,
        "/api/xray/search",
        {
            "company_name": "Al Fazal Rice Trading LLC",
            "country": "United Arab Emirates",
            "platform": "linkedin",
        },
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    data = resp.get_json()
    assert data["status"] == "live_results"
    assert data["fallback_used"] is False
    assert data["count"] == 2
    urls = {p["profile_url"] for p in data["profiles"]}
    assert urls == {
        "https://www.linkedin.com/in/hassan-al-rashid-ae",
        "https://www.linkedin.com/in/priya-nair-dubai",
    }


# ---------------------------------------------------------------------------
# Tier 2 — Boundary & Corner Cases (6 tests)
# ---------------------------------------------------------------------------


def test_f5_t2_xray_missing_company_name_returns_400(client):
    r_missing = post_json(client, "/api/xray/search", {})
    r_blank = post_json(client, "/api/xray/search", {"company_name": "   "})
    assert r_missing.status_code == 400
    assert r_blank.status_code == 400
    assert "error" in r_missing.get_json()


def test_f5_t2_xray_offline_or_network_error_zero_mock_invariant(
    client, serp_server, monkeypatch
):
    serp_server.route_search_engines(monkeypatch, closed_port=True)

    resp = post_json(
        client,
        "/api/xray/search",
        {
            "company_name": "Jeddah Grain Co",
            "country": "Saudi Arabia",
            "website": "https://jeddahgrain.sa",
        },
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert_zero_mock_xray_response(data, expect_website_domain="jeddahgrain.sa")
    assert data["status"] == "rate_limited_or_offline"


def test_f5_t2_xray_rate_limited_429_503_zero_mock_invariant(
    client, serp_server, monkeypatch
):
    serp_server.mode = "rate_limited_429"
    serp_server.route_search_engines(monkeypatch)

    r_429 = post_json(
        client,
        "/api/xray/search",
        {"company_name": "Kuwait Bulk Trading", "website": "https://kuwaitbulk.kw"},
    )
    assert r_429.status_code == 200
    d_429 = r_429.get_json()
    assert_zero_mock_xray_response(d_429, expect_website_domain="kuwaitbulk.kw")
    assert d_429["status"] == "rate_limited_or_offline"

    serp_server.mode = "unavailable_503"
    r_503 = post_json(
        client,
        "/api/xray/search",
        {"company_name": "Kuwait Bulk Trading", "website": "https://kuwaitbulk.kw"},
    )
    assert r_503.status_code == 200
    d_503 = r_503.get_json()
    assert_zero_mock_xray_response(d_503, expect_website_domain="kuwaitbulk.kw")
    assert d_503["status"] == "rate_limited_or_offline"


def test_f5_t2_xray_filters_non_profile_linkedin_urls(client, serp_server, monkeypatch):
    serp_server.mode = "non_profile_urls"
    serp_server.route_search_engines(monkeypatch)

    resp = post_json(
        client,
        "/api/xray/search",
        {"company_name": "Al Fazal Rice Trading LLC", "platform": "linkedin"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["profiles"] == []
    assert data["count"] == 0
    assert data["fallback_used"] is True


def test_f5_t2_xray_max_results_clamped_and_invalid_type_handled(
    client, serp_server, monkeypatch
):
    serp_server.mode = "many_profiles"
    serp_server.route_search_engines(monkeypatch)

    r_huge = post_json(
        client,
        "/api/xray/search",
        {"company_name": "Clamped Results Co", "max_results": 999},
    )
    assert r_huge.status_code == 200
    data_huge = r_huge.get_json()
    assert 1 <= len(data_huge["profiles"]) <= 20
    assert data_huge["count"] == len(data_huge["profiles"])

    r_bad = post_json(
        client,
        "/api/xray/search",
        {"company_name": "Invalid Type Co", "max_results": "not-an-int"},
    )
    assert r_bad.status_code == 200
    data_bad = r_bad.get_json()
    assert 1 <= len(data_bad["profiles"]) <= 10


def test_f5_t2_xray_persist_true_with_zero_live_results_creates_zero_contacts(
    client, create_lead, serp_server, monkeypatch
):
    serp_server.mode = "rate_limited_429"
    serp_server.route_search_engines(monkeypatch)
    lead = create_lead(company_name="Zero Persist Lead", contact_person="")

    resp = post_json(
        client,
        "/api/xray/search",
        {
            "company_name": "Zero Persist Lead",
            "lead_id": lead["id"],
            "persist": True,
        },
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["persisted_contacts"] == []

    status, company_contacts = get_json(client, f"/api/leads/{lead['id']}/contacts")
    assert status == 200
    assert company_contacts["contacts"] == []
