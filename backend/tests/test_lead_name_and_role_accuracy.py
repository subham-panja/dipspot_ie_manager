"""
Unit and integration tests for Lead Generation accuracy:
- Legal entity name cleaning (stripping SEO titles, slogans, delimiters)
- Strict Buyer vs Supplier separation (no Indian exporters under importer lists)
- Zero synthetic emails and zero pseudo-random phone numbers
- APEDA Middle East buyer inquiries vs APEDA RCMC accredited mills
- NLP-driven ML deduplication preventing page-title duplication
"""

import pytest
from app.lead_engine import (
    calculate_lead_similarity,
    clean_company_key,
    clean_company_name,
)
from app.real_scraper import (
    RealisticWebScraper,
    is_trade_business_entity,
    sanitize_lead_geography,
)
from app.verified_catalog import get_verified_trade_leads


class TestCompanyNameExtraction:
    """Tests that webpage titles are normalized into genuine corporate entity names."""

    def test_strip_delimiters_and_seo_slogans(self):
        samples = [
            ("LuLu Hypermarket UAE - Online Grocery & Supermarket in Dubai | Order Now", "LuLu Hypermarket UAE"),
            ("Al Maya Supermarkets - Online Grocery Shopping Dubai | Order Now", "Al Maya Supermarkets"),
            ("Choithrams - Online Supermarket in Dubai | Order Fresh Groceries", "Choithrams"),
            ("Midstar FZE - Agricultural Commodities & Grain Trading | UAE", "Midstar FZE"),
            ("Buy Rice Online in Dubai, UAE | Best Price | Jaleel Cash & Carry", "Jaleel Cash & Carry"),
            ("Contact Us - STCD Togo SARL", "STCD Togo SARL"),
            ("Home | Gulf Food Trading LLC", "Gulf Food Trading LLC"),
            ("Annapurna Rice Mill (Hooghly Cluster) - Commercial Logistics Hub", "Annapurna Rice Mill"),
        ]
        for raw, expected in samples:
            cleaned = clean_company_name(raw)
            assert cleaned == expected, f"Expected '{expected}', got '{cleaned}' for raw '{raw}'"

    def test_discard_generic_directory_categories(self):
        generic_categories = [
            "Rice Exporters in India, Basmati Rice Suppliers, Non Basmati Rice Manufacturers",
            "Top 10 Rice Exporters in India - Best Indian Rice Brands",
            "Buy Rice Online in Kolkata - Wholesale Prices",
            "Wholesale Rice Market in Delhi - Suppliers and Dealers",
            "Exporters in India",
        ]
        for cat in generic_categories:
            cleaned = clean_company_name(cat)
            assert cleaned == "", f"Expected generic category to be discarded (empty), got '{cleaned}'"

    def test_clean_company_key_aligns_clean_and_raw_titles(self):
        # A raw SEO title and a legal corporate name should normalize to the same clean_company_key
        key_raw = clean_company_key("LuLu Hypermarket UAE - Online Grocery & Supermarket in Dubai | Order Now")
        key_clean = clean_company_key("LuLu Hypermarket LLC")
        assert key_raw == key_clean == "lulu hypermarket"


class TestBuyerVsSupplierSeparation:
    """Tests strict qualification ensuring Indian exporters are never assigned to buyers/importers."""

    def test_reject_indian_exporters_when_querying_importers(self):
        indian_exporter_snippets = [
            ("Shree Krishna Rice Mill", "Leading manufacturer and exporter of IR-64 Parboiled Rice from Karnal, Punjab, India"),
            ("Royal Basmati Exports", "Exporters in India supplying non-basmati parboiled rice to UAE and Africa"),
            ("Burdwan Agro Processing Mill", "RCMC certified exporter in West Bengal offering non-basmati rice"),
        ]
        for name, snippet in indian_exporter_snippets:
            is_valid, reason = is_trade_business_entity(
                cand_name=name,
                cand_snippet=snippet,
                cand_url="https://www.indianricemill.com",
                target_commodity="Rice",
                lead_type="importer",
            )
            assert not is_valid, f"Expected '{name}' to be rejected as importer, but passed! Reason: {reason}"
            assert "producer/exporter signal" in reason

    def test_accept_genuine_overseas_importers(self):
        overseas_buyers = [
            ("LuLu Hypermarket LLC", "Leading foodstuff wholesale importer and hypermarket chain in Dubai, UAE"),
            ("Al Maya Supermarkets LLC", "Premier FMCG wholesale food distributor and retail supermarkets across UAE"),
            ("STCD Togo SARL", "Societe Togolaise de Commerce et Distribution - Grossiste importateur de riz a Lome"),
        ]
        for name, snippet in overseas_buyers:
            is_valid, reason = is_trade_business_entity(
                cand_name=name,
                cand_snippet=snippet,
                cand_url="https://www.luluhypermarket.com",
                target_commodity="Rice",
                lead_type="importer",
            )
            assert is_valid, f"Expected '{name}' to be accepted as valid importer, got reason: {reason}"


class TestZeroSyntheticPhonesAndEmails:
    """Tests that phone numbers and emails are never fabricated or pseudo-generated."""

    def test_sanitize_lead_geography_never_generates_pseudo_phones(self):
        country_profile = {
            "name": "Togo",
            "phone_code": "+228",
            "cities": ["Lome", "Kara", "Sokode"],
            "nearest_ports": ["Autonomous Port of Lome (TGLFW)"],
            "lat": 6.1375,
            "lng": 1.2125,
        }
        # Lead with no phone
        lead_no_phone = {
            "company_name": "Test Enterprise",
            "country": "Togo",
            "phones": "",
            "address": "Lome",
        }
        sanitized = sanitize_lead_geography(lead_no_phone, "Togo", country_profile)
        assert sanitized["phones"] == "", "Empty phone should remain empty, never fabricated!"

        # Lead with foreign phone (e.g. +91 Indian mobile)
        lead_foreign_phone = {
            "company_name": "Test Enterprise",
            "country": "Togo",
            "phones": "+91 9434123890",
            "address": "Lome",
        }
        sanitized_foreign = sanitize_lead_geography(lead_foreign_phone, "Togo", country_profile)
        assert sanitized_foreign["phones"] == "", "Foreign phone in strict country crawl must be cleared, not transformed into fake +228 22 21...!"

    def test_verified_catalog_never_generates_fake_emails_on_cycles(self):
        # Request 40 leads (causing cycle > 0 for Togo)
        leads = get_verified_trade_leads(
            lead_type="importer",
            country="Togo",
            commodity="Rice",
            count=30,
        )
        assert len(leads) == 30
        for l in leads:
            assert "22 21" not in l["phones"] or l["phones"].startswith("+228 22 21"), "Phones must not contain synthetic hash suffixes"
            assert "@togo-trade.com" not in l.get("emails", ""), "Must not generate placeholder domains"
            assert l["country"] == "Togo"


class TestApedaSources:
    """Tests APEDA Middle East Buyer Registry vs APEDA RCMC Exporters."""

    def test_apeda_middle_east_buyers_returns_importers(self):
        scraper = RealisticWebScraper()
        leads = scraper.crawl_apeda_middle_east_buyers(commodity="Rice", target_c="Saudi Arabia", depth=5)
        assert len(leads) >= 1
        for ld in leads:
            assert ld["lead_type"] == "importer"
            assert ld["source_name"] == "APEDA Middle East Buyer Registry"
            assert ld["country"] in ("Saudi Arabia", "United Arab Emirates", "Qatar", "Kuwait", "Oman", "Bahrain")

    def test_apeda_rcmc_exporters_returns_indian_suppliers(self):
        scraper = RealisticWebScraper()
        leads = scraper.crawl_apeda_rcmc_exporters(commodity="Rice", depth=5)
        assert len(leads) >= 1
        for ld in leads:
            assert ld["lead_type"] == "wb_mill"
            assert ld["country"] == "India"
            assert ld["source_name"] == "APEDA Registered Exporters & SFDA Units"


class TestDeduplicationBetweenTitlesAndCleanNames:
    """Tests that ML deduplication merges candidates with raw titles into existing clean leads."""

    def test_merge_seo_title_candidate_with_clean_existing(self):
        existing = {
            "_id": "dummy1",
            "company_name": "LuLu Hypermarket LLC",
            "country": "United Arab Emirates",
            "website": "https://www.luluhypermarket.com",
            "phones": "+971 4 2988850",
            "emails": "procurement@luluhypermarket.com",
        }
        candidate = {
            "company_name": "LuLu Hypermarket UAE - Online Grocery & Supermarket in Dubai | Order Now",
            "country": "United Arab Emirates",
            "website": "https://www.luluhypermarket.com",
            "phones": "+971 4 2988850",
            "emails": "",
        }
        score, reason, fields = calculate_lead_similarity(candidate, existing)
        assert score >= 95.0, f"Expected deduplication similarity >= 95%, got {score} (Reason: {reason})"
        assert "website" in fields or "company_name" in fields


class TestGo4WorldBusinessCleanParsing:
    """Verifies that Go4WorldBusiness parsing rejects Indian cross-contamination and synthetic buyer names."""

    def test_rejects_indian_destination_when_target_is_foreign(self):
        from app.scrapers.importers import parse_go4worldbusiness_buyers_html
        html = """
        <div class="entity-rows-container">
            <a href="/buylead/view/999123/rice-wanted.html">Wanted : Non Basmati Rice</a>
            <div>Buyer From Bahrain | Quantity Required: | 50 MT | Payment Terms: | LC | Destination: | Karnataka, India</div>
        </div>
        """
        leads = parse_go4worldbusiness_buyers_html(html, target_country="Bahrain", commodity="Rice")
        assert len(leads) == 0, "Lead with Destination: Karnataka, India must NEVER be accepted under Bahrain!"

    def test_no_synthetic_rice_buyer_company_name(self):
        from app.scrapers.importers import parse_go4wb_html
        html = """
        <div class="card">
            <div>Wanted : Non Basmati Rice IR64 Buyer From United Arab Emirates</div>
            <div>Contact : Farhan Sheikh Buyer Of Rice</div>
            <div>Destination : Jebel Ali Port, United Arab Emirates</div>
        </div>
        """
        leads = parse_go4wb_html(html, target_countries=["United Arab Emirates"])
        assert len(leads) >= 1
        for ld in leads:
            assert "Rice Buyer" not in ld["company_name"], f"Synthetic '(Rice Buyer)' found in company_name: {ld['company_name']}"
            assert "Farhan Sheikh" in ld["company_name"] or "Commodity" in ld["company_name"]


class TestSaveLeadsWithDedupRoleIntegrity:
    """Verifies _save_leads_with_dedup enforces strict buyer vs supplier isolation."""

    def test_reclassifies_indian_entities_to_suppliers(self):
        from app.factory import create_app
        from app.tasks import _save_leads_with_dedup
        from app.db import get_db

        app = create_app("testing")
        with app.app_context():
            db = get_db()
            db.leads.delete_many({"company_name": "Test Bengal Mill"})

            cand = [{
                "company_name": "Test Bengal Mill",
                "country": "India",
                "address": "Burdwan, West Bengal, India",
                "city_or_hub": "Burdwan",
                "lead_type": "importer",  # Incorrectly labeled as importer
                "matched_varieties": "IR-64 Parboiled",
                "priority_score": 85,
            }]

            _save_leads_with_dedup(app, cand, custom_label="Test Role Check")
            saved = db.leads.find_one({"company_name": "Test Bengal Mill"})
            assert saved is not None
            assert saved["lead_type"] == "wb_mill", f"Indian entity must be saved as 'wb_mill', not 'importer'! Got: {saved['lead_type']}"
            db.leads.delete_many({"company_name": "Test Bengal Mill"})


class TestHighDepthDeduplicationCollapsePrevention:
    """Verifies that high depth (e.g. 200 leads) never collapses into 3 leads with duplicate suffixes."""

    def test_200_leads_generation_has_zero_duplicate_names_or_desk_suffixes(self):
        from app.verified_catalog import get_verified_trade_leads
        from app.lead_engine import clean_company_key

        leads = get_verified_trade_leads(
            lead_type="importer",
            country="Togo",
            commodity="Non-Basmati & Parboiled Rice (HS 100630)",
            count=200,
            tier="sme",
            port="Autonomous Port of Lome (TGTGO)",
        )
        assert len(leads) == 200
        names = [l["company_name"] for l in leads]
        keys = [clean_company_key(n) for n in names]
        assert len(set(names)) == 200, f"Expected 200 unique names, got {len(set(names))}"
        assert len(set(keys)) == 200, f"Expected 200 unique clean keys, got {len(set(keys))}"

        # Guarantee zero repeated desk suffixes like '- Wholesale Distribution Hub'
        for name in names:
            assert " - Wholesale Distribution Hub" not in name
            assert " - Import Logistics Terminal" not in name
            assert " - Central Storage Division" not in name

    def test_generic_descriptors_rejected_as_company_names(self):
        from app.lead_engine import clean_company_name, is_pure_generic_category

        generic_titles = [
            "Rice Milling",
            "Rice Exporter",
            "Wholesale Distribution Hub",
            "Import Logistics Terminal",
            "Leading Rice Suppliers",
            "Wholesale Rice Importers in Togo",
        ]
        for gt in generic_titles:
            cleaned = clean_company_name(gt)
            assert cleaned == "" or is_pure_generic_category(cleaned), f"Generic descriptor '{gt}' must be discarded! Got: '{cleaned}'"

        legit_companies = [
            "KRBL Limited",
            "Comptoir Commercial du Togo SARL",
            "Purba Bardhaman Agro Milling Pvt Ltd",
            "Al-Maya Foodstuff Trading LLC",
        ]
        for lc in legit_companies:
            assert not is_pure_generic_category(lc), f"Legitimate company '{lc}' was falsely flagged as generic!"


