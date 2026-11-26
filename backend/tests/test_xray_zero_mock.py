"""Unit and API tests for Live RecruitIn X-Ray Search and Zero-Mock Genuine Fallbacks."""

import base64
import json
from unittest.mock import patch

from app.contacts_service import ContactConflictError
from app.db import get_db, now_iso
from app.scraper.scraper_class import RealisticWebScraper
from app.scraper.xray_providers import (
    build_bing_xray_query,
    build_genuine_fallbacks,
    build_relaxed_xray_query,
    is_serp_rate_limited,
    parse_bing_serp_html,
    parse_ddg_serp_html,
    parse_google_serp_html,
    parse_xray_serp_title_and_snippet,
)
from app.scraper.xray_search import build_xray_query


def _encode_bing_u(target_url: str) -> str:
    b64 = base64.urlsafe_b64encode(target_url.encode("utf-8")).decode("ascii").rstrip("=")
    return f"https://www.bing.com/ck/a?!&&p=123&u=a1{b64}&ntb=1"


def _create_test_lead(mongo_db, lead_id: int, company_name: str, is_deleted: bool = False):
    doc = {
        "id": lead_id,
        "company_name": company_name,
        "country": "United Arab Emirates",
        "city_or_hub": "Dubai",
        "lead_type": "importer",
        "contact_person": "",
        "is_deleted": is_deleted,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    res = mongo_db.leads.insert_one(doc)
    return res.inserted_id


def test_bing_query_normalization_and_relaxed_variants():
    """Verifies Bing query strips trailing slash and relaxed builder strips legal suffixes cleanly."""
    strict = build_xray_query("Al Fazal Rice Trading LLC", country="UAE", platform="linkedin")
    assert strict.startswith("site:linkedin.com/in/")
    bing_q = build_bing_xray_query(strict)
    assert bing_q.startswith("site:linkedin.com/in ")
    assert "site:linkedin.com/in/" not in bing_q

    relaxed = build_relaxed_xray_query("Al Fazal Rice Trading LLC", country="UAE")
    assert relaxed.startswith('site:linkedin.com/in "Al Fazal Rice Trading"')
    assert "(Procurement OR Purchase OR Import OR Sourcing OR Director OR Manager)" in relaxed

    minimal = build_relaxed_xray_query("Al Fazal Rice Trading LLC", minimal=True)
    assert minimal == 'site:linkedin.com/in "Al Fazal Rice Trading"'

    # Preserves 2-word company when stripping would leave < 2 words
    short_co = build_relaxed_xray_query("Cargill Inc.", minimal=True)
    assert short_co == 'site:linkedin.com/in "Cargill Inc."'


def test_bing_serp_parser_decodes_ck_a_and_blocks_bing_urls():
    """Verifies Bing parser decodes u=a1... URLs and ignores non-decodable bing.com links."""
    ck_valid = _encode_bing_u("https://ae.linkedin.com/in/hassan-al-rashid-ae")
    html = f"""
    <html>
      <head><title>site:linkedin.com/in - Search</title></head>
      <body>
        <script>var cfg = {{"searchNoResult":"There are no results","challenge":"ok","blocked":false}};</script>
        <ol id="b_results">
          <li class="b_algo">
            <h2><a href="{ck_valid}">Hassan Al Rashid - Procurement Director - Al Fazal Rice Trading | LinkedIn</a></h2>
            <div class="b_caption"><p>Procurement Director at Al Fazal Rice Trading. Dubai, UAE.</p></div>
          </li>
          <li class="b_algo">
            <h2><a href="https://www.bing.com/ck/a?!&&p=bad_no_u">Undecodable Bing Link</a></h2>
            <div class="b_caption"><p>Should never leak bing.com URL</p></div>
          </li>
        </ol>
      </body>
    </html>
    """
    assert is_serp_rate_limited("bing", 200, html) is False
    parsed = parse_bing_serp_html(html, platform="linkedin", max_results=10)
    assert len(parsed) == 1
    assert parsed[0]["name"] == "Hassan Al Rashid"
    assert parsed[0]["title"] == "Procurement Director"
    assert parsed[0]["profile_url"] == "https://www.linkedin.com/in/hassan-al-rashid-ae"

    captcha_html = '<html><head><title>Verify - Challenge</title></head><body><div id="b_captcha"></div></body></html>'
    assert is_serp_rate_limited("bing", 200, captcha_html) is True


def test_google_serp_parser_unwraps_redirects_and_detects_429():
    """Verifies Google /url?q= unwrapping, h3/snippet parsing, and /sorry/index rate-limit detection."""
    html = """
    <html><body>
      <div class="MjjYud">
        <a href="/url?q=https%3A%2F%2Fin.linkedin.com%2Fin%2Fpriya-nair-dubai&sa=U">
          <h3>Priya Nair - Import Manager - Al Fazal Rice Trading | LinkedIn</h3>
        </a>
        <div class="VwiC3b">Import Manager at Al Fazal Rice Trading. Handling bulk Basmati imports.</div>
      </div>
      <div class="g">
        <a href="/url?url=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fvikram-mehta-99">
          <h3>Vikram Mehta - Head of Sourcing | LinkedIn</h3>
        </a>
        <span class="aCOpRe">Head of Sourcing at Al Fazal Rice Trading.</span>
      </div>
    </body></html>
    """
    assert is_serp_rate_limited("google", 200, html) is False
    parsed = parse_google_serp_html(html, platform="linkedin", max_results=10)
    assert len(parsed) == 2
    assert parsed[0]["profile_url"] == "https://www.linkedin.com/in/priya-nair-dubai"
    assert parsed[0]["title"] == "Import Manager"
    assert parsed[1]["profile_url"] == "https://www.linkedin.com/in/vikram-mehta-99"
    assert parsed[1]["company"] == "Al Fazal Rice Trading"

    sorry_html = "<html><body>Our systems have detected unusual traffic from your computer network. /sorry/index g-recaptcha</body></html>"
    assert is_serp_rate_limited("google", 200, sorry_html) is True
    assert is_serp_rate_limited("google", 429, "Too Many Requests") is True


def test_parse_xray_serp_validation_and_two_segment_edge_case():
    """Verifies non-person filtering, blocked slugs, direct /url?q=, and 2-segment company preservation."""
    assert parse_xray_serp_title_and_snippet("10+ Ahmed Khalil profiles | LinkedIn", "", "https://www.linkedin.com/in/ahmed-khalil") is None
    assert parse_xray_serp_title_and_snippet("Sign In | LinkedIn", "", "https://www.linkedin.com/in/login") is None
    assert parse_xray_serp_title_and_snippet("Some Page", "", "https://www.linkedin.com/in/unavailable") is None
    assert parse_xray_serp_title_and_snippet("Short", "", "https://www.linkedin.com/in/x") is None

    unwrapped = parse_xray_serp_title_and_snippet(
        "Samir Patel - Al Fazal Rice Trading LLC | LinkedIn",
        "Purchase Manager at Al Fazal Rice Trading LLC in Dubai.",
        "/url?q=https%3A%2F%2Fae.linkedin.com%2Fin%2Fsamir-patel-77&sa=U",
    )
    assert unwrapped is not None
    assert unwrapped["name"] == "Samir Patel"
    assert unwrapped["title"] == "Purchase Manager"
    assert unwrapped["company"] == "Al Fazal Rice Trading LLC"
    assert unwrapped["profile_url"] == "https://www.linkedin.com/in/samir-patel-77"

    co_with_role_word = parse_xray_serp_title_and_snippet(
        "Tariq Mansoor - Emirates Import Export | LinkedIn",
        "Procurement Director at Emirates Import Export in Dubai.",
        "https://www.linkedin.com/in/tariq-mansoor-uae",
    )
    assert co_with_role_word is not None
    assert co_with_role_word["name"] == "Tariq Mansoor"
    assert co_with_role_word["title"] == "Procurement Director"
    assert co_with_role_word["company"] == "Emirates Import Export"


def test_ddg_timeout_and_bing_relaxed_fallback_skips_rate_limited_google():
    """Verifies DDG uses 3.5s timeout, Bing runs relaxed fallback on 200 empty, and 429 Google is skipped."""
    scraper = RealisticWebScraper(enable_proxy_shield=False)
    calls = []
    ck_url = _encode_bing_u("https://www.linkedin.com/in/nadia-mansour-ae")
    bing_hit_html = f"""
    <html><body><ol id="b_results"><li class="b_algo">
      <h2><a href="{ck_url}">Nadia Mansour - Commercial Director - Gulf Rice Co | LinkedIn</a></h2>
      <div class="b_caption"><p>Commercial Director at Gulf Rice Co.</p></div>
    </li></ol></body></html>
    """

    def fake_fetch(url, timeout=6.0, polite_jitter=True):
        calls.append((url, timeout, polite_jitter))
        if "duckduckgo.com" in url:
            return None, 0, 3.5
        if "google.com" in url:
            return "<html>/sorry/index</html>", 429, 0.2
        if "bing.com" in url:
            if "Procurement+Director" in url:
                return "<html><body><ol id='b_results'></ol></body></html>", 200, 0.3
            return bing_hit_html, 200, 0.3
        return None, 0, 0.1

    scraper.fetch_page = fake_fetch
    profiles = scraper.search_xray_profiles("Gulf Rice Co LLC", country="UAE", max_results=5)
    assert len(profiles) == 1
    assert profiles[0]["name"] == "Nadia Mansour"
    assert scraper.last_xray_engine == "bing"
    assert scraper.last_xray_status == "live_results"

    ddg_calls = [c for c in calls if "duckduckgo.com" in c[0]]
    assert ddg_calls and ddg_calls[0][1] == 3.5
    google_calls = [c for c in calls if "google.com" in c[0]]
    assert len(google_calls) == 1  # Relaxed Google query was NOT retried after 429


def test_consecutive_calls_reset_scraper_state_and_zero_mock_on_errors():
    """Verifies scraper instance resets last_xray_engine/status and never fabricates on 429/503/0/empty."""
    scraper = RealisticWebScraper(enable_proxy_shield=False)
    ck_url = _encode_bing_u("https://www.linkedin.com/in/omar-farooq-ae")
    bing_ok = f"""
    <html><body><li class="b_algo">
      <h2><a href="{ck_url}">Omar Farooq - Buyer - Oasis Foods | LinkedIn</a></h2>
      <div class="b_caption"><p>Buyer at Oasis Foods.</p></div>
    </li></body></html>
    """

    scraper.fetch_page = lambda url, timeout=5.0, polite_jitter=False: (bing_ok, 200, 0.1) if "bing.com" in url else (None, 0, 0.1)
    first = scraper.search_xray_profiles("Oasis Foods", max_results=5)
    assert len(first) == 1
    assert scraper.last_xray_engine == "bing"
    assert scraper.last_xray_status == "live_results"

    # Second call: all engines rate-limited/503 -> must reset state and return []
    scraper.fetch_page = lambda url, timeout=5.0, polite_jitter=False: ("Rate limited", 429, 0.1) if "google.com" in url else ("Unavailable", 503, 0.1)
    second = scraper.search_xray_profiles("Desert Grains", max_results=5)
    assert second == []
    assert scraper.last_xray_engine == "fallback"
    assert scraper.last_xray_status == "rate_limited_or_offline"

    # Third call: clean empty 200 on all engines -> status == "no_results"
    scraper.fetch_page = lambda url, timeout=5.0, polite_jitter=False: ("<html><body>No results</body></html>", 200, 0.1)
    third = scraper.search_xray_profiles("Quiet Mill Co", max_results=5)
    assert third == []
    assert scraper.last_xray_engine == "fallback"
    assert scraper.last_xray_status == "no_results"


def test_api_xray_search_zero_mock_and_website_normalization(client, monkeypatch):
    """Verifies POST/GET /api/xray/search zero-mock invariant on 429/503/offline/empty & website URLs."""
    monkeypatch.setattr(
        RealisticWebScraper,
        "fetch_page",
        lambda self, url, timeout=5.0, polite_jitter=False: (
            '<html><div class="anomaly-modal">bots use DuckDuckGo</div></html>',
            200,
            0.1,
        ) if "duckduckgo" in url else ("Service Unavailable", 503, 0.1),
    )

    resp = client.post(
        "/api/xray/search",
        data=json.dumps({"company_name": "Al Fazal Rice Trading LLC", "country": "UAE", "website": "alfazalrice.ae"}),
        content_type="application/json",
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert data["profiles"] == []
    assert data["count"] == 0
    assert data["persisted_contacts"] == []
    assert data["fallback_used"] is True
    assert data["engine_used"] == "fallback"
    assert data["status"] == "rate_limited_or_offline"
    assert data["fallbacks"]["corporate_contact_urls"] == [
        "https://alfazalrice.ae/contact",
        "https://alfazalrice.ae/contact-us",
        "https://alfazalrice.ae/about",
    ]
    assert "linkedin.com/search/results/people/" in data["fallbacks"]["linkedin_keyword_search_url"]

    # Invalid placeholder website produces empty corporate_contact_urls
    fb_bad = build_genuine_fallbacks("Acme Co", website="N/A", strict_query="site:linkedin.com/in Acme")
    assert fb_bad["corporate_contact_urls"] == []


def test_api_xray_search_persist_and_get_persist_false_and_conflict_handling(client, monkeypatch):
    """Verifies GET ?persist=false skips DB writes, persist=True saves xray_linkedin, and handles conflicts/deleted leads."""
    mongo_db = get_db()
    lead_id_num = 882101
    deleted_lead_id = 882102
    _create_test_lead(mongo_db, lead_id_num, "Al Maya Grain LLC", is_deleted=False)
    _create_test_lead(mongo_db, deleted_lead_id, "Deleted Grain LLC", is_deleted=True)

    try:
        ck_one = _encode_bing_u("https://www.linkedin.com/in/karim-haddad-ae")
        ck_two = _encode_bing_u("https://www.linkedin.com/in/meera-kapoor-ae")
        bing_two = f"""
        <html><body><ol id="b_results">
          <li class="b_algo">
            <h2><a href="{ck_one}">Karim Haddad - Import Manager - Al Maya Grain LLC | LinkedIn</a></h2>
            <div class="b_caption"><p>Import Manager at Al Maya Grain LLC.</p></div>
          </li>
          <li class="b_algo">
            <h2><a href="{ck_two}">Meera Kapoor - Procurement Director - Al Maya Grain LLC | LinkedIn</a></h2>
            <div class="b_caption"><p>Procurement Director at Al Maya Grain LLC.</p></div>
          </li>
        </ol></body></html>
        """
        monkeypatch.setattr(
            RealisticWebScraper,
            "fetch_page",
            lambda self, url, timeout=5.0, polite_jitter=False: (bing_two, 200, 0.1) if "bing.com" in url else (None, 0, 0.1),
        )

        # GET with persist=false must NOT persist
        r_get = client.get(f"/api/xray/search?company_name=Al+Maya+Grain+LLC&lead_id={lead_id_num}&persist=false")
        assert r_get.status_code == 200
        d_get = r_get.get_json()
        assert d_get["count"] == 2
        assert d_get["persisted_contacts"] == []
        assert mongo_db.company_contacts.count_documents({"lead_id": {"$in": [lead_id_num, str(lead_id_num)]}}) == 0

        # POST with persist=True persists source="xray_linkedin" & verified=True
        r_post = client.post(
            "/api/xray/search",
            data=json.dumps({
                "company_name": "Al Maya Grain LLC",
                "country": "UAE",
                "lead_id": lead_id_num,
                "persist": True,
                "max_results": None,
            }),
            content_type="application/json",
        )
        assert r_post.status_code == 200
        d_post = r_post.get_json()
        assert d_post["count"] == 2
        assert len(d_post["persisted_contacts"]) == 2
        for c in d_post["persisted_contacts"]:
            assert c["source"] == "xray_linkedin"
            assert c["verified"] is True

        # Soft-deleted lead is skipped for persistence and returns 404 on /enrich
        r_del = client.post(
            "/api/xray/search",
            data=json.dumps({"company_name": "Deleted Grain LLC", "lead_id": deleted_lead_id, "persist": True}),
            content_type="application/json",
        )
        assert r_del.status_code == 200
        assert r_del.get_json()["persisted_contacts"] == []
        assert client.post(f"/api/leads/{deleted_lead_id}/enrich").status_code == 404

        # ContactConflictError during persist is caught cleanly without HTTP 500
        with patch("app.routes.api_xray.upsert_and_link_contact", side_effect=ContactConflictError("conflict")):
            r_conf = client.post(
                "/api/xray/search",
                data=json.dumps({"company_name": "Al Maya Grain LLC", "lead_id": lead_id_num, "persist": True}),
                content_type="application/json",
            )
            assert r_conf.status_code == 200
            assert r_conf.get_json()["persisted_contacts"] == []
    finally:
        cids = [lnk["contact_id"] for lnk in mongo_db.company_contacts.find({"lead_id": {"$in": [lead_id_num, str(lead_id_num), deleted_lead_id, str(deleted_lead_id)]}})]
        mongo_db.company_contacts.delete_many({"lead_id": {"$in": [lead_id_num, str(lead_id_num), deleted_lead_id, str(deleted_lead_id)]}})
        if cids:
            mongo_db.contacts.delete_many({"contact_id": {"$in": cids}})
        mongo_db.leads.delete_many({"id": {"$in": [lead_id_num, deleted_lead_id]}})


def test_unsafe_website_schemes_rejected_and_subpath_normalized():
    """Challenge 1 + Reviewer Note 2: blocks javascript/data/vbscript/ftp/userinfo URIs & normalizes bare/subpath URLs."""
    scraper = RealisticWebScraper(enable_proxy_shield=False)
    unsafe_inputs = [
        "javascript:alert(1)",
        "javascript:alert(document.cookie)",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
        "ftp://evil.com/files",
        "mailto:info@evil.com",
        "http://",
        "https://user:pass@example.ae",
        "N/A",
    ]
    for bad in unsafe_inputs:
        assert build_genuine_fallbacks("Acme", website=bad)["corporate_contact_urls"] == []
        enriched = scraper.enrich_lead_multichannel({"company_name": "Acme", "website": bad})
        assert enriched["corporate_contact_page_url"] == ""

    assert scraper.enrich_lead_multichannel({"company_name": "Al Fazal", "website": "alfazalrice.ae"})["corporate_contact_page_url"] == "https://alfazalrice.ae/contact"
    assert scraper.enrich_lead_multichannel({"company_name": "Acme", "website": "https://example.ae/index.html"})["corporate_contact_page_url"] == "https://example.ae/contact"
    assert build_genuine_fallbacks("Acme", website="https://example.ae/index.html")["corporate_contact_urls"] == [
        "https://example.ae/contact", "https://example.ae/contact-us", "https://example.ae/about"
    ]
    assert scraper.enrich_lead_multichannel({"company_name": "Acme", "corporate_contact_page_url": "javascript:alert(1)"})["corporate_contact_page_url"] == ""


def test_decoy_non_platform_domains_and_non_person_slugs_rejected():
    """Challenges 2 & 5: rejects decoy embedded URLs, 25+ profiles for..., and %2F encoded slugs."""
    assert parse_xray_serp_title_and_snippet("Evil Decoy - Manager | LinkedIn", "", "https://evil.com/?next=https://www.linkedin.com/in/evil-decoy") is None
    assert parse_xray_serp_title_and_snippet("Not LinkedIn - Manager | LinkedIn", "", "https://notlinkedin.com/in/decoy") is None
    assert parse_xray_serp_title_and_snippet("Decoy GH - Dev | GitHub", "", "https://evil.com/https://github.com/decoy", platform="github") is None
    assert parse_xray_serp_title_and_snippet("Decoy X / X", "", "https://evil.com/x.com/decoy", platform="twitter") is None
    assert parse_xray_serp_title_and_snippet("25+ profiles for John Doe | LinkedIn", "", "https://www.linkedin.com/in/john-doe-2") is None
    assert parse_xray_serp_title_and_snippet("Bad Slug | LinkedIn", "", "https://www.linkedin.com/in/john%2Fdoe") is None
    assert parse_xray_serp_title_and_snippet("Space Slug | LinkedIn", "", "https://www.linkedin.com/in/john%20doe") is None

    decoy_ck = _encode_bing_u("https://evil-tracker.com/redirect?next=https://www.linkedin.com/in/decoy-person")
    bing_html = f'<html><body><li class="b_algo"><h2><a href="{decoy_ck}">Decoy Person - Manager | LinkedIn</a></h2></li></body></html>'
    assert parse_bing_serp_html(bing_html) == []

    google_html = '<html><body><div class="g"><a href="/url?q=https%3A%2F%2Fevil.com%2F%3Fnext%3Dhttps%3A%2F%2Fwww.linkedin.com%2Fin%2Fevil-decoy"><h3>Evil Decoy - Manager | LinkedIn</h3></a></div></body></html>'
    assert parse_google_serp_html(google_html) == []


def test_api_xray_non_dict_json_returns_400(client):
    """Challenge 3 + Reviewer Note 1: non-dict JSON bodies return 400 cleanly instead of HTTP 500."""
    for endpoint in ("/api/xray/search", "/api/xray/query"):
        for payload in (["not", "a", "dict"], "string-body", 123):
            resp = client.post(endpoint, data=json.dumps(payload), content_type="application/json")
            assert resp.status_code == 400
            assert "error" in resp.get_json()


def test_ddg_result_a_priority_relative_bing_ck_and_title_snippet_edge_cases():
    """Challenges 4 & 6: DDG result__a/protocol-relative URL, relative Bing /ck/a, X Corp, Unicode & Co. snippets."""
    ddg_html = """
    <html><body><div class="result">
      <h2 class="result__title"><a class="result__a" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fomar-zeid-ae">Omar Zeid - Buyer | LinkedIn</a></h2>
      <a class="result__url" href="//www.linkedin.com/in/omar-zeid-ae">www.linkedin.com/in/omar-zeid-ae</a>
      <div class="result__snippet">Buyer at Oasis Grains</div>
    </div></body></html>
    """
    ddg_res = parse_ddg_serp_html(ddg_html)
    assert len(ddg_res) == 1
    assert ddg_res[0]["profile_url"] == "https://www.linkedin.com/in/omar-zeid-ae"

    ddg_proto_only = """
    <html><body><div class="result">
      <a class="result__url" href="//www.linkedin.com/in/omar-zeid-ae">Omar Zeid - Buyer | LinkedIn</a>
    </div></body></html>
    """
    assert parse_ddg_serp_html(ddg_proto_only)[0]["profile_url"] == "https://www.linkedin.com/in/omar-zeid-ae"

    rel_ck = _encode_bing_u("https://www.linkedin.com/in/layla-hassan-ae").replace("https://www.bing.com", "")
    rel_bing_html = f'<html><body><li class="b_algo"><h2><a href="{rel_ck}">Layla Hassan - Import Manager | LinkedIn</a></h2><div class="b_caption"><p>Import Manager at Nile Foods</p></div></li></body></html>'
    bing_res = parse_bing_serp_html(rel_bing_html)
    assert len(bing_res) == 1
    assert bing_res[0]["profile_url"] == "https://www.linkedin.com/in/layla-hassan-ae"

    x_corp = parse_xray_serp_title_and_snippet("John Doe - X Corp | LinkedIn", "", "https://www.linkedin.com/in/john-x1")
    assert x_corp and x_corp["name"] == "John Doe" and x_corp["company"] == "X Corp"

    non_def = parse_xray_serp_title_and_snippet("Samir Patel - Head of Project X | LinkedIn", "Head of Project X at Acme", "https://www.linkedin.com/in/samir-x")
    assert non_def and non_def["title"] == "Head of Project X" and non_def["company"] == "Acme"

    uni_co = parse_xray_serp_title_and_snippet("Marie Curie - Purchase Manager | LinkedIn", "Purchase Manager at Société Générale, Paris", "https://www.linkedin.com/in/marie-curie-1")
    assert uni_co and uni_co["company"] == "Société Générale"

    dot_co = parse_xray_serp_title_and_snippet("Ali Khan - Purchase Manager | LinkedIn", "Purchase Manager at Gulf Rice Co. Dubai", "https://www.linkedin.com/in/ali-khan-1")
    assert dot_co and dot_co["company"] == "Gulf Rice Co. Dubai"
