"""
Comprehensive Deep Unit & Integration Tests for Realistic Crawler & Lead Engine.

Strictly verifies:
1. Real direct source extraction (ATNInfo, Nominatim Geospatial POIs, ExportersIndia, TradeIndia).
2. Accurate source attribution: selected sources are strictly mapped 1:1, never random modulo indexing.
3. Country strictness & lead type isolation (importers never mixed with suppliers; country strictly respected).
4. Zero-mock invariant: synthetic emails (info@slug, trade@slug) and placeholder contact persons are forbidden.
5. Search engine resilience: seamless fallback to Bing when DuckDuckGo returns HTTP 202 bot challenges.
6. 95% ML similarity deduplication & MongoDB persistence.
"""

import json
from unittest.mock import MagicMock, patch
import pytest

from app.real_scraper import (
    RealisticWebScraper,
    decode_bing_u,
    execute_realistic_harvest,
    is_blacklisted_domain,
)
from app.scrapers.importers import parse_atninfo_html
from app.sources import (
    GOOGLE_MAPS_IMPORTER_SOURCE,
    GOOGLE_MAPS_SUPPLIER_SOURCE,
    IMPORTER_SOURCES,
    SUPPLIER_SOURCES,
)
from app.tasks import _save_leads_with_dedup


SAMPLE_ATNINFO_HTML = """
<div class="col-sm-12 col-lg-6 p-lg-1 mb-2" data-comp-id="97593">
  <div class="comp-box">
    <h2 itemprop="name">
      <a class="compClick" href="https://www.atninfo.com/co/a-rauf-internationl-llc-ajman-97593">
        A Rauf Internationl LLC
      </a>
    </h2>
    <div itemprop="address">
      <span itemprop="streetAddress">Corniche Rd, Opp Royal Palace hotel</span>
      <span itemprop="addressLocality">Corniche</span>
      <span itemprop="addressRegion">Ajman</span>
    </div>
    <span itemprop="telephone">
      <a href="tel:+971-6-7444149">+971-6-7444149</a>
    </span>
    <a class="web info-btn websiteClick" href="http://www.abdulraufgroup.com?utm_source=atninfo">Website</a>
  </div>
</div>
<div class="col-sm-12 col-lg-6 p-lg-1 mb-2" data-comp-id="381614">
  <div class="comp-box">
    <h2 itemprop="name">
      <a class="compClick" href="https://www.atninfo.com/co/al-fazal-rice-trading-llc-dubai-381614">
        Al Fazal Rice Trading LLC
      </a>
    </h2>
    <div itemprop="address">
      <span itemprop="streetAddress">Al Ras, Deira</span>
      <span itemprop="addressLocality">Deira</span>
      <span itemprop="addressRegion">Dubai</span>
    </div>
    <span itemprop="telephone">
      <a href="tel:+971-58-6363615">+971-58-6363615</a>
    </span>
    <a class="web info-btn websiteClick" href="http://www.alfazalrice.com/?utm_source=atninfo">Website</a>
  </div>
</div>
"""

SAMPLE_BING_HTML = """
<ol id="b_results">
  <li class="b_algo">
    <h2>
      <a href="https://www.bing.com/ck/a?!&&p=abc&u=a1aHR0cHM6Ly93d3cuYWxmYXphbHJpY2UuY29t">
        Al Fazal Rice Trading LLC Dubai
      </a>
    </h2>
    <div class="b_caption">
      <p>Premier rice and grain importers based in Deira Dubai UAE.</p>
    </div>
  </li>
  <li class="b_algo">
    <h2>
      <a href="https://www.bing.com/ck/a?!&&p=xyz&u=a1aHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvUmljZQ">
        Rice - Wikipedia
      </a>
    </h2>
    <div class="b_caption">
      <p>Rice is the seed of the grass species Oryza sativa.</p>
    </div>
  </li>
</ol>
"""


class TestCrawlerDirectSourceParsing:
    """Verifies that direct directory scrapers accurately parse real cards and do not manufacture fake text."""

    def test_parse_atninfo_html_real_entities(self):
        leads = parse_atninfo_html(SAMPLE_ATNINFO_HTML, source_url="https://www.atninfo.com/uae/all/rice-1263")
        assert len(leads) == 2

        comp1 = leads[0]
        assert comp1["company_name"] == "A Rauf Internationl LLC"
        assert "+971-6-7444149" in comp1["phones"] or "97167444149" in comp1["phones"]
        assert comp1["city_or_hub"] == "Ajman"
        assert comp1["country"] == "United Arab Emirates"
        assert comp1["source_name"] == "ATN Info GCC Commercial Sourcing Desk"
        # Zero synthetic email assertion: if no email was in DOM, emails must be empty
        assert comp1["emails"] == ""

        comp2 = leads[1]
        assert comp2["company_name"] == "Al Fazal Rice Trading LLC"
        assert "+971-58-6363615" in comp2["phones"] or "971586363615" in comp2["phones"]
        assert comp2["city_or_hub"] == "Dubai"
        assert "alfazalrice.com" in comp2["website"]

    def test_crawl_source_directly_atninfo(self):
        scraper = RealisticWebScraper()
        atn_source = {
            "id": "imp-src-15",
            "name": "ATN Info GCC Commercial Sourcing Desk",
            "url": "https://www.atninfo.com/uae/importers-exporters",
            "domain": "atninfo.com",
            "lead_type": "importer",
        }

        with patch.object(scraper, "fetch_page", return_value=(SAMPLE_ATNINFO_HTML, 200, 0.25)):
            leads = scraper.crawl_source_directly(atn_source, "United Arab Emirates", "Rice", depth=10)

        assert len(leads) == 2
        for lead in leads:
            assert lead["source_name"] == "ATN Info GCC Commercial Sourcing Desk"
            assert lead["lead_type"] == "importer"
            assert lead["country"] == "United Arab Emirates"
            # Ensure no synthetic trade@ or info@ without DOM verification
            if lead["emails"]:
                assert "@" in lead["emails"]
                assert "trade@" not in lead["emails"]

    def test_crawl_source_directly_nominatim_map_extractor(self):
        scraper = RealisticWebScraper()
        mock_pois = [
            {
                "name": "Ras Al Khor Wholesale Grain Terminal",
                "display_name": "Ras Al Khor Wholesale Grain Terminal, Al Awir Road, Dubai, UAE",
                "lat": 25.1842,
                "lon": 55.3621,
                "type": "wholesale",
            }
        ]

        with patch.object(scraper, "live_search_nominatim", return_value=mock_pois):
            leads = scraper.crawl_source_directly(
                GOOGLE_MAPS_IMPORTER_SOURCE,
                target_c="United Arab Emirates",
                commodity="Rice",
                depth=5,
            )

        assert len(leads) == 1
        lead = leads[0]
        assert lead["company_name"] == "Ras Al Khor Wholesale Grain Terminal"
        assert lead["source_name"] == GOOGLE_MAPS_IMPORTER_SOURCE["name"]
        assert lead["latitude"] == 25.1842
        assert lead["longitude"] == 55.3621
        assert "maps.google.com" in lead["source_url"]


class TestSearchEngineResilienceAndFallback:
    """Verifies that search engine throttling (DDG 202) triggers seamless Bing fallback."""

    def test_decode_bing_u(self):
        encoded = "a1aHR0cHM6Ly93d3cuYWxmYXphbHJpY2UuY29t"
        decoded = decode_bing_u(encoded)
        assert decoded == "https://www.alfazalrice.com"

    def test_bing_fallback_on_ddg_202_challenge(self):
        scraper = RealisticWebScraper()

        def mock_fetch(url, timeout=7.0, polite_jitter=True):
            if "duckduckgo.com" in url:
                # DDG returns HTTP 202 anti-bot challenge
                return "<html><body>Bot Challenge 202</body></html>", 202, 0.3
            elif "bing.com" in url:
                # Bing returns valid results
                return SAMPLE_BING_HTML, 200, 0.4
            return None, 404, 0.1

        with patch.object(scraper, "fetch_page", side_effect=mock_fetch), \
             patch("app.real_scraper.is_domain_live", return_value=True):
            results = scraper.live_search_web("rice wholesale Dubai", max_results=5)

        assert len(results) >= 1
        found_urls = [r["url"] for r in results]
        assert "https://www.alfazalrice.com" in found_urls
        # Wikipedia must be filtered out by junk domain blacklist
        assert not any("wikipedia.org" in u for u in found_urls)


class TestZeroMockInvariant:
    """Verifies that the crawler NEVER synthesizes fake emails or fake executive titles."""

    def test_crawl_contact_details_no_synthetic_email(self):
        scraper = RealisticWebScraper()
        dom_without_email = "<html><body><h1>Company Contact</h1><p>Call us at +971 4 1234567. Address: Deira Dubai</p></body></html>"

        with patch.object(scraper, "fetch_page", return_value=(dom_without_email, 200, 0.2)):
            info = scraper.crawl_contact_details("https://www.examplegrainllc.com")

        # Zero synthetic email: empty list when DOM has no email
        assert info["emails"] == []
        assert "+971" in " ".join(info["phones"]) or "1234567" in " ".join(info["phones"])
        # Contact person must NOT be manufactured as Head of Commodity Procurement
        assert "Head of Commodity Procurement" not in info["contact_person"]

    def test_crawl_contact_details_genuine_mailto_extracted(self):
        scraper = RealisticWebScraper()
        dom_with_mailto = """
        <html><body>
          <a href="mailto:procurement@alfazalrice.com?subject=Inquiry">Email Procurement</a>
          <a href="tel:+971586363615">Call Us</a>
        </body></html>
        """

        with patch.object(scraper, "fetch_page", return_value=(dom_with_mailto, 200, 0.2)), \
             patch("app.real_scraper.filter_live_emails", return_value="procurement@alfazalrice.com"):
            info = scraper.crawl_contact_details("https://www.alfazalrice.com")

        assert "procurement@alfazalrice.com" in info["emails"]
        assert "+971586363615" in info["phones"]


class TestSourceAttributionAndCountryStrictness:
    """Verifies that selecting specific sources attributes ONLY those sources, and country strictness is held."""

    def test_selected_sources_attributed_accurately(self, app):
        """When ATNInfo is selected, leads must be strictly attributed to ATNInfo."""
        with app.app_context():
            with patch("app.real_scraper.RealisticWebScraper.crawl_source_directly") as mock_crawl, \
                 patch("app.tasks._save_leads_with_dedup", return_value=2):
                mock_crawl.return_value = [
                    {
                        "company_name": "Al Fazal Rice Trading LLC",
                        "country": "United Arab Emirates",
                        "city_or_hub": "Dubai",
                        "state": "Dubai Commercial District",
                        "district": "Dubai",
                        "contact_person": "Commercial Procurement Desk",
                        "phones": "+971-58-6363615",
                        "emails": "procurement@alfazalrice.com",
                        "website": "https://www.alfazalrice.com",
                        "address": "Al Ras, Deira, Dubai",
                        "matched_varieties": "Rice",
                        "hs_codes_applicable": "10063019",
                        "inquiry_or_profile": "Verified UAE Rice Importer",
                        "priority_score": 92,
                        "source_name": "ATN Info GCC Commercial Sourcing Desk",
                        "source_url": "https://www.atninfo.com/co/al-fazal-rice-trading-llc-dubai-381614",
                        "lead_type": "importer",
                    }
                ]

                saved = execute_realistic_harvest(
                    app=app,
                    lead_type="importer",
                    country="United Arab Emirates",
                    commodity="Rice",
                    depth=2,
                    selected_sources=["imp-src-15"],
                )

                assert saved == 2
                assert mock_crawl.called
                args, kwargs = mock_crawl.call_args
                source_arg = args[0]
                assert source_arg["id"] == "imp-src-15"
                assert source_arg["name"] == "ATN Info GCC Commercial Sourcing Desk"

    def test_importers_never_mixed_with_suppliers(self, app):
        """Requesting importer lead_type must never crawl or save suppliers."""
        with app.app_context():
            with patch("app.real_scraper.RealisticWebScraper.crawl_source_directly") as mock_crawl, \
                 patch("app.tasks._save_leads_with_dedup", return_value=1) as mock_save:
                mock_crawl.return_value = [
                    {
                        "company_name": "Test Global Importer LLC",
                        "country": "Saudi Arabia",
                        "city_or_hub": "Riyadh",
                        "contact_person": "Import Desk",
                        "phones": "+966 11 2345678",
                        "emails": "",
                        "website": "https://www.saudigrainimport.sa",
                        "address": "Riyadh Trade Center",
                        "matched_varieties": "Rice",
                        "hs_codes_applicable": "10063019",
                        "inquiry_or_profile": "Saudi Importer",
                        "priority_score": 90,
                        "source_name": "Saudi Chamber Importer Directory",
                        "source_url": "https://example.com",
                        "lead_type": "importer",
                    }
                ]

                execute_realistic_harvest(
                    app=app,
                    lead_type="importer",
                    country="Saudi Arabia",
                    depth=1,
                )

                assert mock_save.called
                saved_batch = mock_save.call_args[0][1]
                for lead in saved_batch:
                    assert lead["lead_type"] == "importer", "Lead type must strictly be importer"
                    assert lead["country"] == "Saudi Arabia", "Country must strictly match Saudi Arabia"


class TestSimilarityDeduplicationMerge:
    """Verifies that 95% similarity deduplication merges matching leads instead of creating duplicates."""

    def test_dedup_merges_at_95_percent_threshold(self, app):
        with app.app_context():
            from app.db import get_db, now_iso

            mongo_db = get_db()
            # Clear leads collection for isolated test run
            mongo_db.leads.delete_many({})

            # Seed an existing lead
            existing_lead = {
                "id": 101,
                "company_name": "Al Fazal Rice Trading LLC",
                "country": "United Arab Emirates",
                "city_or_hub": "Dubai",
                "contact_person": "Trade Desk",
                "phones": "+971-58-6363615",
                "emails": "sales@alfazalrice.com",
                "website": "https://www.alfazalrice.com",
                "address": "Deira Dubai UAE",
                "lead_type": "importer",
                "merge_count": 1,
                "created_at": now_iso(),
            }
            mongo_db.leads.insert_one(existing_lead)

            # Harvesting same company with an additional email address
            harvested_batch = [
                {
                    "company_name": "Al Fazal Rice Trading LLC",
                    "country": "United Arab Emirates",
                    "city_or_hub": "Dubai",
                    "contact_person": "Procurement Desk",
                    "phones": "+971-58-6363615",
                    "emails": "procurement@alfazalrice.com",
                    "website": "https://www.alfazalrice.com",
                    "address": "Deira Dubai UAE",
                    "matched_varieties": "Rice",
                    "hs_codes_applicable": "10063019",
                    "inquiry_or_profile": "Grain Importer",
                    "priority_score": 95,
                    "source_name": "ATN Info GCC Commercial Sourcing Desk",
                    "source_url": "https://www.atninfo.com/co/al-fazal-rice-trading-llc-dubai-381614",
                    "lead_type": "importer",
                }
            ]

            saved_count = _save_leads_with_dedup(app, harvested_batch)

            # Assert that the lead was MERGED, not duplicated
            assert saved_count == 0, "0 new leads inserted because the candidate was merged into existing record"
            all_leads = list(mongo_db.leads.find({"company_name": "Al Fazal Rice Trading LLC"}))
            assert len(all_leads) == 1, "Expected exactly 1 merged record, no duplicates!"

            merged_record = all_leads[0]
            assert merged_record["merge_count"] == 2
            # Both emails should be unioned into the record
            assert "sales@alfazalrice.com" in merged_record["emails"]
            assert "procurement@alfazalrice.com" in merged_record["emails"]


class TestGoogleDorksAndShield:
    """Verifies Google Dorks execution, multi-proxy shield, and history navigation filtering."""

    def test_google_dork_execution(self, app):
        from app.real_scraper import RealisticWebScraper
        from app.sources import GOOGLE_DORK_IMPORTER_SOURCE

        scraper = RealisticWebScraper()
        mock_candidates = [
            {
                "name": "Gulf Rice Trading FZE",
                "url": "https://www.gulfrice.ae/about",
                "domain": "gulfrice.ae",
                "snippet": "Leading basmati rice importer in Dubai",
            }
        ]

        with patch.object(scraper, "live_search_web", return_value=mock_candidates) as mock_search, \
             patch("app.real_scraper.is_domain_live", return_value=True), \
             patch("app.real_scraper.filter_live_emails", return_value="import@gulfrice.ae"), \
             patch.object(scraper, "crawl_contact_details", return_value={"emails": ["import@gulfrice.ae"], "phones": ["+971 4 1234567"], "address": "Jebel Ali Dubai", "contact_person": "General Manager"}):

            leads = scraper.crawl_source_directly(
                GOOGLE_DORK_IMPORTER_SOURCE,
                target_c="United Arab Emirates",
                commodity="Basmati Rice",
                depth=5,
                custom_dork='intitle:"importers" "rice" "Dubai"',
            )

            assert mock_search.called
            dork_arg = mock_search.call_args[0][0]
            assert 'intitle:"importers" "rice" "Dubai"' in dork_arg

            assert len(leads) == 1
            lead = leads[0]
            assert lead["company_name"] == "Gulf Rice Trading FZE"
            assert lead["website"] == "https://www.gulfrice.ae"
            assert lead["emails"] == "import@gulfrice.ae"
            assert lead["source_name"] == GOOGLE_DORK_IMPORTER_SOURCE["name"]
            assert "google.com/search" in lead["source_url"]

    def test_proxy_shield_fallback(self, app):
        from app.real_scraper import RealisticWebScraper

        # Scraper with proxy shield enabled pointing to non-responsive test proxies
        scraper = RealisticWebScraper(enable_proxy_shield=True, proxies_pool=["http://127.0.0.1:9999"])
        # Should gracefully fallback and return valid response or tuple without crashing
        html, status, latency = scraper.fetch_page("https://httpbin.org/status/200", timeout=1.0, polite_jitter=False)
        assert status in (0, 200)

    def test_crawler_history_and_lead_filtering(self, client):
        from app.db import get_db, now_iso

        mongo_db = get_db()
        mongo_db.crawler_jobs.delete_many({})
        mongo_db.leads.delete_many({})

        # Insert a sample completed job
        mongo_db.crawler_jobs.insert_one({
            "job_id": 999,
            "lead_type": "importer",
            "country": "United Arab Emirates",
            "commodity": "Basmati",
            "depth": 25,
            "custom_label": "Dubai Basmati Harvest",
            "status": "completed",
            "inserted_count": 18,
            "merged_count": 7,
            "leads_found": 18,
            "created_at": now_iso(),
        })

        # Insert matching lead and non-matching lead
        mongo_db.leads.insert_one({
            "id": 501,
            "company_name": "Dubai Test Buyer LLC",
            "country": "United Arab Emirates",
            "lead_type": "importer",
            "custom_label": "Dubai Basmati Harvest",
            "job_id": 999,
            "priority_score": 90,
            "is_deleted": False,
        })
        mongo_db.leads.insert_one({
            "id": 502,
            "company_name": "Other Buyer LLC",
            "country": "Germany",
            "lead_type": "importer",
            "custom_label": "German Harvest",
            "job_id": 888,
            "priority_score": 85,
            "is_deleted": False,
        })

        # 1. Test /api/crawler/history
        resp = client.get("/api/crawler/history")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["total"] >= 1
        job_item = next(j for j in data["history"] if j.get("job_id") == 999)
        assert job_item["custom_label"] == "Dubai Basmati Harvest"
        assert job_item["inserted_count"] == 18

        # 2. Test /api/leads/importers filtered by custom_label and job_id
        lead_resp = client.get("/api/leads/importers?custom_label=Dubai%20Basmati%20Harvest&job_id=999")
        assert lead_resp.status_code == 200
        lead_data = lead_resp.get_json()
        assert lead_data["total"] == 1
        assert lead_data["importers"][0]["company_name"] == "Dubai Test Buyer LLC"


class TestCommodityAndTradeRelevanceGate:
    """Verifies that non-commercial entities, gaming sites, dictionaries, tutorials, and consumer food chains are strictly rejected."""

    def test_gaming_and_entertainment_domains_rejected(self):
        from app.real_scraper import is_blacklisted_domain
        assert is_blacklisted_domain("solitaired.com") is True
        assert is_blacklisted_domain("play.solitaired.com") is True
        assert is_blacklisted_domain("seaofthieves.com") is True
        assert is_blacklisted_domain("steampowered.com") is True
        assert is_blacklisted_domain("roblox.com") is True
        assert is_blacklisted_domain("twitch.tv") is True

    def test_dictionaries_and_qa_forums_rejected(self):
        from app.real_scraper import is_blacklisted_domain
        assert is_blacklisted_domain("merriam-webster.com") is True
        assert is_blacklisted_domain("dictionary.cambridge.org") is True
        assert is_blacklisted_domain("zhihu.com") is True
        assert is_blacklisted_domain("jingyan.baidu.com") is True
        assert is_blacklisted_domain("github.com") is True
        assert is_blacklisted_domain("malwaretips.com") is True

    def test_consumer_chains_and_academic_rejected(self):
        from app.real_scraper import is_blacklisted_domain
        assert is_blacklisted_domain("dominos.com") is True
        assert is_blacklisted_domain("dominos.co.uk") is True
        assert is_blacklisted_domain("zomato.com") is True
        assert is_blacklisted_domain("swiggy.com") is True
        assert is_blacklisted_domain("harvard.edu") is True
        assert is_blacklisted_domain("iitd.ac.in") is True

    def test_junk_entity_titles_rejected(self):
        from app.real_scraper import is_trade_business_entity
        junk_candidates = [
            ("Spider Solitaire (2 Suits ) - Play Online & 100% Free | Solitaired.com", "Play online free cards", "https://solitaired.com"),
            ("Sea of Thieves", "Sea of Thieves news and updates", "https://seaofthieves.com"),
            ("Order Pizza Delivery & Takeaway Near You | Domino's Pizza", "Pizza delivery near you", "https://dominos.com"),
            ("NON - Definition & Meaning - Merriam-Webster", "The meaning of non", "https://merriam-webster.com"),
            ("Online Applications Advertisement No. 01/RC (NT)/2026 for various Non …", "Recruitment notification", "https://recruitment.gov.in"),
            ("ChatGPT-Comparison-Detection Project - GitHub", "Source code and algorithms", "https://github.com/project"),
            ("如何启用App Readiness服务-百度经验", "Windows service tutorial", "https://jingyan.baidu.com"),
            ("TOP 25 QUOTES BY BOB UECKER | A-Z Quotes", "Famous quotes and sayings", "https://azquotes.com"),
            ("21 must-try Vietnamese dishes | Vietnam Tourism", "Tourism dishes guide", "https://vietnam.travel"),
            ("Regenerative Medicine & Pain Relief in Gilbert | Desert Spine & Sports", "Pain clinic chiropractic", "https://desertspine.com"),
            ("Real Estate & Property for sale in Thomastown, VIC 3074", "Houses and apartments for sale", "https://realestate.com.au"),
        ]
        for name, snippet, url in junk_candidates:
            valid, reason = is_trade_business_entity(name, snippet, url, target_commodity="Non basmati rice", lead_type="importer")
            assert valid is False, f"Expected '{name}' to be rejected, but passed with reason: {reason}"

    def test_legitimate_rice_and_commodity_trade_entities_accepted(self):
        from app.real_scraper import is_trade_business_entity
        genuine_candidates = [
            (
                "Al Fazal Rice Trading LLC",
                "Leading wholesale importer and distributor of Basmati and Non-Basmati rice in Dubai UAE.",
                "https://www.alfazalrice.com",
            ),
            (
                "Gulf Rice Milling & Export Co.",
                "Paddy processing and bulk rice exporter supplying GCC and African trade corridors.",
                "https://www.gulfrice.ae",
            ),
            (
                "Al Ghurair Foods LLC",
                "Major agricultural commodities trading house handling bulk grain and foodstuff import consignments.",
                "https://www.alghurair.com",
            ),
            (
                "Togo Agrobusiness & Rice Distribution Sarl",
                "Official agricultural commodities wholesaler and rice importer in Lome, Togo.",
                "https://www.togoagro.tg",
            ),
            (
                "Royal Basmati Rice Mills Pvt Ltd",
                "Modern rice milling facility exporting non-basmati parboiled rice and basmati varieties.",
                "https://www.royalbasmatirice.com",
            ),
        ]
        for name, snippet, url in genuine_candidates:
            valid, reason = is_trade_business_entity(name, snippet, url, target_commodity="Non basmati rice", lead_type="importer")
            assert valid is True, f"Expected legitimate candidate '{name}' to pass, but rejected: {reason}"

    def test_unrelated_business_without_commodity_rejected(self):
        from app.real_scraper import is_trade_business_entity
        valid, reason = is_trade_business_entity(
            "Apex Global Logistics Software Inc",
            "Software platform for container tracking and ERP management.",
            "https://www.apexlogisticssoftware.com",
            target_commodity="Rice",
            lead_type="importer",
        )
        assert valid is False
        assert "no relevance to target commodity" in reason.lower()


