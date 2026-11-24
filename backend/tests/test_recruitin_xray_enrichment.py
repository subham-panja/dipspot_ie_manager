"""Tests for RecruitIn-style X-Ray search generator, SERP scraper, and multi-channel lead enrichment."""

import json
from unittest.mock import MagicMock
import pytest

from app.models import Lead, db
from app.routes.api_helpers import CSV_EXPORT_FIELDS, serialize_mongo_lead
from app.scraper.scraper_class import RealisticWebScraper
from app.scraper.xray_search import (
    DEFAULT_DECISION_MAKER_TITLES,
    XRaySearchMixin,
    build_xray_query,
    parse_xray_serp_title_and_snippet,
)


def test_default_decision_maker_titles():
    """Verifies standard industrial procurement and executive titles exist in defaults."""
    assert "Procurement Director" in DEFAULT_DECISION_MAKER_TITLES
    assert "Import Manager" in DEFAULT_DECISION_MAKER_TITLES
    assert "Purchasing Head" in DEFAULT_DECISION_MAKER_TITLES
    assert "Purchase Manager" in DEFAULT_DECISION_MAKER_TITLES
    assert "Head of Sourcing" in DEFAULT_DECISION_MAKER_TITLES
    assert "Chief Executive Officer" in DEFAULT_DECISION_MAKER_TITLES
    assert "Managing Director" in DEFAULT_DECISION_MAKER_TITLES
    assert "Commercial Director" in DEFAULT_DECISION_MAKER_TITLES
    assert "Buyer" in DEFAULT_DECISION_MAKER_TITLES


def test_build_xray_query_linkedin_defaults():
    """Verifies LinkedIn X-ray search query syntax conforms to RecruitIn Boolean specifications."""
    query = build_xray_query(
        company_name="Al Maya Group LLC",
        country="United Arab Emirates",
        platform="linkedin",
    )
    assert query.startswith("site:linkedin.com/in/")
    assert '"Procurement Director"' in query
    assert '"Al Maya Group LLC"' in query
    assert '"United Arab Emirates"' in query
    assert "-intitle:profiles" in query
    assert "-inurl:dir/" in query
    assert "-inurl:jobs" in query


def test_build_xray_query_custom_titles_and_keywords():
    """Verifies custom job titles, keywords, and exclusions are correctly structured."""
    query = build_xray_query(
        company_name="Emirates Grain Trading",
        job_titles=["Procurement Director", "Supply Chain Head"],
        country="Dubai",
        platform="linkedin",
        keywords=["Rice", "Basmati"],
        exclusions=["inurl:pulse", "-inurl:groups"],
    )
    assert '("Procurement Director" OR "Supply Chain Head")' in query
    assert '"Emirates Grain Trading"' in query
    assert '"Dubai"' in query
    assert "Rice" in query
    assert "Basmati" in query
    assert "-inurl:pulse" in query
    assert "-inurl:groups" in query


def test_build_xray_query_github_and_twitter():
    """Verifies X-ray query generation for GitHub and Twitter/X candidate sources."""
    gh_query = build_xray_query("Acme Grain Corp", platform="github")
    assert gh_query.startswith("site:github.com")
    assert '"Acme Grain Corp"' in gh_query
    assert "-inurl:topics" in gh_query

    tw_query = build_xray_query("Global Agri Export", platform="twitter")
    assert tw_query.startswith("(site:twitter.com OR site:x.com)")
    assert '"Global Agri Export"' in tw_query
    assert "-inurl:status" in tw_query


def test_parse_xray_serp_title_and_snippet_linkedin():
    """Verifies SERP parsing extracts name, title, company, and canonical LinkedIn profile URL."""
    title = "Johnathan Doe - Procurement Director - Al Maya Trading LLC | LinkedIn"
    snippet = "View Johnathan Doe's professional profile on LinkedIn. Experienced in food commodity sourcing."
    url = "https://ae.linkedin.com/in/johnathan-doe-12345?trk=public_profile"

    parsed = parse_xray_serp_title_and_snippet(title, snippet, url, platform="linkedin")
    assert parsed is not None
    assert parsed["name"] == "Johnathan Doe"
    assert parsed["title"] == "Procurement Director"
    assert parsed["company"] == "Al Maya Trading LLC"
    assert parsed["profile_url"] == "https://www.linkedin.com/in/johnathan-doe-12345"
    assert parsed["platform"] == "linkedin"


def test_parse_xray_serp_role_with_at_and_snippet_fallback():
    """Verifies SERP parsing splits 'Role at Company' patterns and falls back to snippet info."""
    title = "Fatima Al-Mansoor – Import Manager at Al Barakah Foodstuffs – United Arab Emirates | LinkedIn"
    snippet = "Import Manager at Al Barakah Foodstuffs. Managing bulk grain containers from India."
    url = "https://www.linkedin.com/in/fatima-almansoor"

    parsed = parse_xray_serp_title_and_snippet(title, snippet, url, platform="linkedin")
    assert parsed is not None
    assert parsed["name"] == "Fatima Al-Mansoor"
    assert parsed["title"] == "Import Manager"
    assert parsed["company"] == "Al Barakah Foodstuffs"
    assert parsed["profile_url"] == "https://www.linkedin.com/in/fatima-almansoor"


def test_parse_xray_serp_discards_non_profile_urls():
    """Verifies that company directory, jobs, or aggregator links are discarded."""
    assert parse_xray_serp_title_and_snippet(
        "Al Maya Group: Overview | LinkedIn", "", "https://www.linkedin.com/company/al-maya", platform="linkedin"
    ) is None
    assert parse_xray_serp_title_and_snippet(
        "Procurement Jobs in Dubai | LinkedIn", "", "https://www.linkedin.com/jobs/view/123", platform="linkedin"
    ) is None
    assert parse_xray_serp_title_and_snippet(
        "GitHub Trending | GitHub", "", "https://github.com/trending", platform="github"
    ) is None


def test_search_xray_profiles_with_mocked_results():
    """Verifies search_xray_profiles dispatches query and extracts valid profiles."""
    scraper = RealisticWebScraper(enable_proxy_shield=False)

    fake_html = """
    <html>
      <body>
        <div class="result">
          <a class="result__url" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fahmed-khalil-987">Link</a>
          <a class="result__title">Ahmed Khalil - Head of Sourcing - Gulf Commodities LLC | LinkedIn</a>
          <div class="result__snippet">Head of Sourcing at Gulf Commodities LLC. Dubai, UAE.</div>
        </div>
      </body>
    </html>
    """
    scraper.fetch_page = MagicMock(return_value=(fake_html, 200, 0.25))

    profiles = scraper.search_xray_profiles(
        company_name="Gulf Commodities LLC",
        country="United Arab Emirates",
        platform="linkedin",
        max_results=5,
    )

    assert len(profiles) == 1
    p = profiles[0]
    assert p["name"] == "Ahmed Khalil"
    assert p["title"] == "Head of Sourcing"
    assert p["company"] == "Gulf Commodities LLC"
    assert p["profile_url"] == "https://www.linkedin.com/in/ahmed-khalil-987"


def test_enrich_lead_multichannel_populates_all_seven_fields():
    """Verifies enrich_lead_multichannel populates all 7 communication sources."""
    scraper = RealisticWebScraper(enable_proxy_shield=False)
    fake_profile = {
        "name": "Tariq Mahmood",
        "title": "Procurement Director",
        "company": "Apex Food Trading",
        "profile_url": "https://www.linkedin.com/in/tariq-mahmood",
        "platform": "linkedin",
        "snippet": "Procurement Director at Apex Food Trading",
    }
    scraper.search_xray_profiles = MagicMock(return_value=[fake_profile])

    lead_input = {
        "company_name": "Apex Food Trading LLC",
        "country": "United Arab Emirates",
        "phones": "+971 4 223 4567; +971 50 123 4567",
        "emails": "procurement@apexfood.ae; sales@apexfood.ae",
        "website": "https://www.apexfood.ae",
        "address": "Al Ras, Deira, Dubai, UAE",
    }

    enriched = scraper.enrich_lead_multichannel(lead_input)

    assert enriched["primary_email"] == "procurement@apexfood.ae"
    assert enriched["secondary_email"] == "sales@apexfood.ae"
    assert enriched["direct_phone"] == "+971 4 223 4567"
    assert "wa.me/97142234567" in enriched["whatsapp_url"]
    assert enriched["linkedin_persona_url"] == "https://www.linkedin.com/in/tariq-mahmood"
    assert enriched["corporate_contact_page_url"] == "https://www.apexfood.ae/contact"
    assert enriched["address"] == "Al Ras, Deira, Dubai, UAE"
    assert "Tariq Mahmood" in enriched["contact_person"]


def test_enrich_lead_multichannel_fallback_to_search_url():
    """Verifies that if X-ray finds no profile, it gracefully falls back to 1-click LinkedIn search URL."""
    scraper = RealisticWebScraper(enable_proxy_shield=False)
    scraper.search_xray_profiles = MagicMock(return_value=[])

    lead_input = {
        "company_name": "Small Local Store LLC",
        "country": "Oman",
        "phones": "+968 24 123456",
        "emails": "contact@smallstore.om",
        "website": "https://www.smallstore.om",
    }

    enriched = scraper.enrich_lead_multichannel(lead_input)

    assert "linkedin.com/search/results/people" in enriched["linkedin_persona_url"]
    assert "Small+Local+Store" in enriched["linkedin_persona_url"]
    assert enriched["primary_email"] == "contact@smallstore.om"
    assert enriched["secondary_email"] == ""
    assert enriched["direct_phone"] == "+968 24 123456"
    assert "wa.me/96824123456" in enriched["whatsapp_url"]


def test_api_xray_query_endpoint(client):
    """Verifies GET and POST /api/xray/query construct Boolean search queries."""
    post_resp = client.post(
        "/api/xray/query",
        data=json.dumps({
            "company_name": "Al Maya Group",
            "country": "United Arab Emirates",
            "platform": "linkedin",
        }),
        content_type="application/json",
    )
    assert post_resp.status_code == 200
    post_data = post_resp.get_json()
    assert post_data["success"] is True
    assert "site:linkedin.com/in/" in post_data["query"]
    assert '"Al Maya Group"' in post_data["query"]
    assert "duckduckgo" in post_data["search_urls"]

    get_resp = client.get("/api/xray/query?company_name=Gulf+Foods&platform=github")
    assert get_resp.status_code == 200
    get_data = get_resp.get_json()
    assert get_data["success"] is True
    assert "site:github.com" in get_data["query"]


def test_api_xray_search_endpoint(client, monkeypatch):
    """Verifies /api/xray/search validation and execution."""
    resp_bad = client.post("/api/xray/search", data=json.dumps({}), content_type="application/json")
    assert resp_bad.status_code == 400

    def mock_search_xray(self, *args, **kwargs):
        return [{
            "name": "Rashid Al-Nuaimi",
            "title": "Purchasing Head",
            "company": "Emirates Rice Mills",
            "profile_url": "https://www.linkedin.com/in/rashid-alnuaimi",
            "platform": "linkedin",
            "snippet": "Purchasing Head at Emirates Rice Mills",
        }]

    monkeypatch.setattr(RealisticWebScraper, "search_xray_profiles", mock_search_xray)

    resp_ok = client.post(
        "/api/xray/search",
        data=json.dumps({"company_name": "Emirates Rice Mills", "platform": "linkedin"}),
        content_type="application/json",
    )
    assert resp_ok.status_code == 200
    data = resp_ok.get_json()
    assert data["success"] is True
    assert data["count"] == 1
    assert data["profiles"][0]["name"] == "Rashid Al-Nuaimi"


def test_api_lead_enrich_endpoint(client, monkeypatch):
    """Verifies /api/leads/<id>/enrich enriches an existing lead and returns multi-channel fields."""
    resp_404 = client.post("/api/leads/nonexistent_id_99999/enrich")
    assert resp_404.status_code == 404

    # Create lead in Mongo
    from app.db import get_db, now_iso
    mongo_db = get_db()
    lead_doc = {
        "id": 999123,
        "company_name": "Global Grain Hub FZE",
        "country": "United Arab Emirates",
        "city_or_hub": "Dubai",
        "phones": "+971 4 888 1234; +971 50 999 8888",
        "emails": "procurement@globalgrainhub.ae; info@globalgrainhub.ae",
        "website": "https://www.globalgrainhub.ae",
        "address": "JAFZA, Dubai, UAE",
        "lead_type": "importer",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    insert_res = mongo_db.leads.insert_one(lead_doc)

    def mock_enrich_multichannel(self, lead_data, target_country=""):
        res = dict(lead_data)
        res["primary_email"] = "procurement@globalgrainhub.ae"
        res["secondary_email"] = "info@globalgrainhub.ae"
        res["direct_phone"] = "+971 4 888 1234"
        res["whatsapp_url"] = "https://wa.me/97148881234"
        res["linkedin_persona_url"] = "https://www.linkedin.com/in/globalgrain-buyer"
        res["corporate_contact_page_url"] = "https://www.globalgrainhub.ae/contact"
        res["contact_person"] = "Mansoor Ali (Procurement Director)"
        return res

    monkeypatch.setattr(RealisticWebScraper, "enrich_lead_multichannel", mock_enrich_multichannel)

    enrich_resp = client.post(f"/api/leads/{insert_res.inserted_id}/enrich")
    assert enrich_resp.status_code == 200
    res_data = enrich_resp.get_json()
    assert res_data["success"] is True
    lead_obj = res_data["lead"]
    assert lead_obj["primary_email"] == "procurement@globalgrainhub.ae"
    assert lead_obj["secondary_email"] == "info@globalgrainhub.ae"
    assert lead_obj["direct_phone"] == "+971 4 888 1234"
    assert lead_obj["whatsapp_url"] == "https://wa.me/97148881234"
    assert lead_obj["linkedin_persona_url"] == "https://www.linkedin.com/in/globalgrain-buyer"
    assert lead_obj["corporate_contact_page_url"] == "https://www.globalgrainhub.ae/contact"

    # Cleanup
    mongo_db.leads.delete_one({"_id": insert_res.inserted_id})


def test_csv_export_and_lead_dict_multichannel_fields(app):
    """Verifies that CSV_EXPORT_FIELDS, serialize_mongo_lead, and Lead.to_dict export all channels."""
    required_channels = [
        "primary_email",
        "secondary_email",
        "direct_phone",
        "whatsapp_url",
        "linkedin_persona_url",
        "corporate_contact_page_url",
        "address",
    ]
    for ch in required_channels:
        assert ch in CSV_EXPORT_FIELDS

    doc = {
        "id": 1001,
        "company_name": "Orient Star Trading LLC",
        "country": "United Arab Emirates",
        "city_or_hub": "Dubai",
        "emails": "head.buyer@orientstar.ae; desk@orientstar.ae",
        "phones": "+971 4 333 4444",
        "website": "https://orientstar.ae",
        "address": "Deira Market, Dubai",
        "lead_type": "importer",
    }
    serialized = serialize_mongo_lead(doc)
    assert serialized["primary_email"] == "head.buyer@orientstar.ae"
    assert serialized["secondary_email"] == "desk@orientstar.ae"
    assert serialized["direct_phone"] == "+971 4 333 4444"
    assert "wa.me/97143334444" in serialized["whatsapp_url"]
    assert "linkedin.com" in serialized["linkedin_persona_url"]
    assert serialized["corporate_contact_page_url"] == "https://orientstar.ae/contact"
    assert serialized["address"] == "Deira Market, Dubai"

    with app.app_context():
        sqlite_lead = Lead(
            id=1001,
            company_name="Orient Star Trading LLC",
            country="United Arab Emirates",
            city_or_hub="Dubai",
            emails="head.buyer@orientstar.ae; desk@orientstar.ae",
            phones="+971 4 333 4444",
            website="https://orientstar.ae",
            address="Deira Market, Dubai",
            lead_type="importer",
        )
        dict_rep = sqlite_lead.to_dict()
        assert dict_rep["primary_email"] == "head.buyer@orientstar.ae"
        assert dict_rep["secondary_email"] == "desk@orientstar.ae"
        assert dict_rep["direct_phone"] == "+971 4 333 4444"
        assert "wa.me/97143334444" in dict_rep["whatsapp_url"]
        assert "linkedin.com" in dict_rep["linkedin_persona_url"]
        assert dict_rep["corporate_contact_page_url"] == "https://orientstar.ae/contact"


def test_enrich_lead_multichannel_handles_none_and_null_fields():
    """Regression test: verifies None values in lead dict do not raise AttributeError."""
    scraper = RealisticWebScraper(enable_proxy_shield=False)
    lead_input = {
        "company_name": None,
        "country": None,
        "contact_person": None,
        "phones": "+971 4 123 4567",
        "emails": None,
        "website": None,
        "address": None,
    }
    enriched = scraper.enrich_lead_multichannel(lead_input)
    assert enriched["primary_email"] == ""
    assert enriched["secondary_email"] == ""
    assert enriched["direct_phone"] == "+971 4 123 4567"
    assert "wa.me/97141234567" in enriched["whatsapp_url"]
    assert "linkedin.com" in enriched["linkedin_persona_url"]
    assert enriched["corporate_contact_page_url"] == ""
    assert enriched["address"] == ""


def test_build_xray_query_handles_null_elements_and_none_arguments():
    """Regression test: verifies None elements in lists and None args do not raise AttributeError."""
    q1 = build_xray_query(
        company_name="Acme",
        job_titles=["Buyer", None, ""],
        keywords=["Rice", None],
        exclusions=["inurl:jobs", None],
    )
    assert "Buyer" in q1
    assert "Rice" in q1
    assert "-inurl:jobs" in q1

    q2 = build_xray_query(company_name=None, country=None, platform=None, job_titles=[None])
    assert q2.startswith("site:linkedin.com/in/")
    assert "Procurement Director" in q2


def test_parse_xray_serp_title_delimiters_middle_dot_bullet_slash():
    """Regression test: verifies SERP parsing handles middle dots, bullets, and Twitter / X."""
    p1 = parse_xray_serp_title_and_snippet(
        "Jane Smith · Procurement Head · Apex Grain Ltd · LinkedIn", "", "https://www.linkedin.com/in/jane-smith"
    )
    assert p1 is not None
    assert p1["name"] == "Jane Smith"
    assert p1["title"] == "Procurement Head"
    assert p1["company"] == "Apex Grain Ltd"

    p2 = parse_xray_serp_title_and_snippet(
        "Carlos Silva • Purchase Manager • Brasil Grain • LinkedIn", "", "https://www.linkedin.com/in/carlos-silva"
    )
    assert p2 is not None
    assert p2["name"] == "Carlos Silva"
    assert p2["title"] == "Purchase Manager"
    assert p2["company"] == "Brasil Grain"

    p3 = parse_xray_serp_title_and_snippet("Elon Musk (@elonmusk) / X", "", "https://x.com/elonmusk", platform="x")
    assert p3 is not None
    assert p3["name"] == "Elon Musk"

    p4 = parse_xray_serp_title_and_snippet(
        "Jean-Claude Al-Mansoor - Purchase Manager - Apex A/S | LinkedIn", "", "https://www.linkedin.com/in/jean-claude"
    )
    assert p4 is not None
    assert p4["name"] == "Jean-Claude Al-Mansoor"
    assert p4["company"] == "Apex A/S"


def test_api_xray_null_element_resilience(client, monkeypatch):
    """Regression test: verifies API routes safely handle null fields and elements in JSON payloads."""
    resp = client.post(
        "/api/xray/query",
        data=json.dumps({"company_name": "Acme", "keywords": ["Rice", None], "job_titles": ["Buyer", None]}),
        content_type="application/json",
    )
    assert resp.status_code == 200
    assert "Rice" in resp.get_json()["query"]

    monkeypatch.setattr(RealisticWebScraper, "search_xray_profiles", lambda *args, **kwargs: [])
    resp_search = client.post(
        "/api/xray/search",
        data=json.dumps({"company_name": "Acme", "keywords": ["Rice", None]}),
        content_type="application/json",
    )
    assert resp_search.status_code == 200
    assert resp_search.get_json()["success"] is True
