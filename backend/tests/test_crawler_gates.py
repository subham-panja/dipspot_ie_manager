"""Tests for search engine shield, dorks, and relevance filtering gates."""

from unittest.mock import MagicMock, patch
import pytest

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

    def test_direct_b2b_directories_routing(self, app):
        from app.real_scraper import RealisticWebScraper
        scraper = RealisticWebScraper(enable_proxy_shield=False)

        # 1. APEDA Exporter Registry
        apeda_sup = {"id": "sup-src-01", "name": "APEDA Verified Indian Exporters", "url": "https://apeda.gov.in/apedawebsite/", "lead_type": "supplier"}
        sup_leads = scraper.crawl_source_directly(apeda_sup, "India", "Basmati Rice", depth=3)
        assert len(sup_leads) == 3
        assert sup_leads[0]["country"] == "India"
        assert sup_leads[0]["lead_type"] == "supplier"

        # 2. Kompass International Directory
        kompass_imp = {"id": "imp-src-06", "name": "Kompass International Buyer Directory", "url": "https://us.kompass.com/", "lead_type": "importer"}
        k_leads = scraper.crawl_source_directly(kompass_imp, "United Arab Emirates", "Rice", depth=2)
        assert len(k_leads) == 2
        assert k_leads[0]["country"] == "United Arab Emirates"
        assert k_leads[0]["lead_type"] == "importer"

        # 3. Europages Directory
        europages_imp = {"id": "imp-src-05", "name": "Europages European B2B Wholesale Buyers", "url": "https://www.europages.co.uk/", "lead_type": "importer"}
        euro_leads = scraper.crawl_source_directly(europages_imp, "United Kingdom", "Rice", depth=2)
        assert len(euro_leads) == 2
        assert euro_leads[0]["lead_type"] == "importer"

        # 4. TradeKey Directory
        tradekey_sup = {"id": "sup-src-05", "name": "TradeKey Global Exporters", "url": "https://www.tradekey.com/", "lead_type": "supplier"}
        tk_leads = scraper.crawl_source_directly(tradekey_sup, "India", "Rice", depth=2)
        assert len(tk_leads) == 2
        assert tk_leads[0]["lead_type"] == "supplier"

    def test_verified_catalog_scale_and_quality(self):
        from app.verified_catalog import VERIFIED_GLOBAL_ENTERPRISES
        from app.real_scraper import is_blacklisted_domain

        assert len(VERIFIED_GLOBAL_ENTERPRISES) >= 120
        for ent in VERIFIED_GLOBAL_ENTERPRISES:
            assert ent.get("company_name") and len(ent["company_name"]) > 3
            assert ent.get("country")
            assert ent.get("lead_type") in ("importer", "wb_mill")
            assert ent.get("phones") and len(ent["phones"]) > 5
            assert ent.get("domain")
            assert not is_blacklisted_domain(ent["domain"])
            assert "gaming" not in ent["company_name"].lower()
            assert "solitaire" not in ent["company_name"].lower()



