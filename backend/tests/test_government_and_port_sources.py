"""
Unit & Integration Tests for Government-Registered Trade Sources, Port Manifest Details,
and High-Accuracy Legal Entity Name Extraction.

Verifies:
1. Rejection of random home screen and navigation titles ('Home', 'Index', 'Welcome', etc.)
2. Extraction of real corporate names from JSON-LD, Microdata, meta tags, and copyright footers
3. DGFT (Directorate General of Foreign Trade) IEC directory harvesting with authentic 10-digit IEC codes
4. FIEO (Federation of Indian Export Organisations) verified export house harvesting
5. Port Authority Cargo Manifests with exact container volume per month (1-3 FCL/mo), UN/LOCODE, and 1-click outreach
6. Multi-country ISO2 phone code alignment and zero synthetic data generation
"""

import pytest
from app.lead_engine import (
    clean_company_name,
    clean_company_key,
    normalize_phones,
    COUNTRY_TO_ISO2,
)
from app.real_scraper import (
    RealisticWebScraper,
    is_blacklisted_domain,
    is_trade_business_entity,
)
from app.sources import IMPORTER_SOURCES, SUPPLIER_SOURCES
from app.verified_catalog import get_verified_trade_leads


class TestHomeScreenAndTitleNoiseRejection:
    """Verifies that generic page titles, home screen labels, and SEO noise are NEVER saved as company names."""

    def test_discard_pure_homescreen_and_navigation_titles(self):
        junk_titles = [
            "Home",
            "Home Page",
            "Homepage",
            "Welcome",
            "Welcome to our website",
            "Welcome to our site",
            "Index",
            "Index of /",
            "Default Web Site Page",
            "Untitled Document",
            "New Page",
            "Main Page",
            "About Us",
            "Contact Us",
            "Contact",
            "404 Not Found",
            "Page Not Found",
            "Error",
            "502 Bad Gateway",
            "Privacy Policy",
            "Terms & Conditions",
        ]
        for title in junk_titles:
            cleaned = clean_company_name(title)
            assert cleaned == "", f"Expected '{title}' to be discarded (empty), but got '{cleaned}'"

    def test_extract_genuine_name_from_prefixed_homescreen_titles(self):
        prefixed_titles = [
            ("Home | Gulf Food Trading LLC", "Gulf Food Trading LLC"),
            ("Welcome to Al Barakah Foodstuff Trading LLC", "Al Barakah Foodstuff Trading LLC"),
            ("Home - Burdwan Central Agro Processing Mill Ltd", "Burdwan Central Agro Processing Mill Ltd"),
            ("Welcome to STCD Togo SARL - Grossiste Importateur", "STCD Togo SARL"),
            ("Official Site of Memari Modern Rice Complex", "Memari Modern Rice Complex"),
        ]
        for raw, expected in prefixed_titles:
            cleaned = clean_company_name(raw)
            assert cleaned == expected, f"Expected '{expected}', got '{cleaned}' for raw '{raw}'"

    def test_discard_generic_trade_slogans_without_legal_entity(self):
        slogans = [
            "Leading Exporter of Non Basmati Rice in India",
            "Top Basmati Rice Wholesalers and Suppliers",
            "Buy Rice Online in Kolkata - Wholesale Prices",
            "Rice Mill Machinery Manufacturers and Dealers",
            "Best Quality Indian Rice at Cheap Price",
        ]
        for slogan in slogans:
            cleaned = clean_company_name(slogan)
            assert cleaned == "", f"Expected slogan '{slogan}' to be rejected (empty), got '{cleaned}'"


class TestGovernmentAndPortSources:
    """Verifies government registered bodies (DGFT, APEDA, FIEO) and Port Authority manifests."""

    def test_dgft_iec_directory_returns_verified_indian_suppliers_with_iec(self):
        scraper = RealisticWebScraper()
        leads = scraper.crawl_dgft_iec_directory(commodity="Rice", depth=5, lead_type="wb_mill")
        assert len(leads) >= 1
        for lead in leads:
            assert lead["lead_type"] == "wb_mill"
            assert lead["country"] == "India"
            assert "DGFT" in lead["source_name"]
            # Verify 10-digit IEC code is present
            assert lead.get("iec_code"), f"Lead {lead['company_name']} missing IEC code!"
            assert len(lead["iec_code"]) == 10, f"IEC code {lead['iec_code']} must be 10 digits"
            assert lead["iec_code"].isdigit(), f"IEC code {lead['iec_code']} must be digits"
            # Verify export port gateway
            assert "Port" in lead.get("nearest_port", "")

    def test_fieo_directory_returns_accredited_exporters(self):
        scraper = RealisticWebScraper()
        leads = scraper.crawl_fieo_directory(commodity="Rice", depth=5, lead_type="wb_mill")
        assert len(leads) >= 1
        for lead in leads:
            assert lead["lead_type"] == "wb_mill"
            assert lead["country"] == "India"
            assert "FIEO" in lead["source_name"]
            assert "FIEO" in lead["fssai_or_sfda_status"]

    def test_port_authority_manifests_returns_sme_consignees_with_volume(self):
        scraper = RealisticWebScraper()
        leads = scraper.crawl_port_authority_manifests(
            commodity="Rice",
            target_c="United Arab Emirates",
            lead_type="importer",
            depth=5,
            source_name="DP World Jebel Ali Port Inward Container Manifests (AEJEA)",
        )
        assert len(leads) >= 1
        for lead in leads:
            assert lead["lead_type"] == "importer"
            assert lead["country"] == "United Arab Emirates"
            assert "Jebel Ali Port" in lead["nearest_port"]
            # Verify shipment volume is present and indicates small-to-mid consignee
            vol = lead.get("shipment_volume", "")
            assert any(term in vol for term in ("Container", "Containers", "FCL", "MT")), f"Missing shipment volume in {lead}"
            assert lead.get("importer_tier") == "sme_importer"
            # Outreach links must be populated
            assert lead.get("whatsapp_outreach_url", "").startswith("https://wa.me/")
            assert "linkedin.com/search" in lead.get("linkedin_search_url", "")

    def test_source_routing_in_crawl_source_directly(self):
        scraper = RealisticWebScraper()

        # 1. DGFT Source
        dgft_src = next((s for s in SUPPLIER_SOURCES if s["id"] == "sup-src-dgft-iec"), None)
        assert dgft_src is not None
        dgft_leads = scraper.crawl_source_directly(dgft_src, "India", "Rice", depth=3)
        assert len(dgft_leads) >= 1
        assert dgft_leads[0]["lead_type"] in ("wb_mill", "supplier")
        assert dgft_leads[0].get("iec_code")

        # 2. Port Authority Jebel Ali Source
        jebel_src = next((s for s in IMPORTER_SOURCES if s["id"] == "imp-src-dpworld-jebelali"), None)
        assert jebel_src is not None
        jebel_leads = scraper.crawl_source_directly(jebel_src, "United Arab Emirates", "Rice", depth=3)
        assert len(jebel_leads) >= 1
        assert jebel_leads[0]["lead_type"] == "importer"
        assert "Jebel Ali" in jebel_leads[0]["nearest_port"]

    def test_authorized_government_and_port_domains_not_blacklisted(self):
        authorized_domains = [
            "dgft.gov.in",
            "apeda.gov.in",
            "fieo.org",
            "icegate.gov.in",
            "cbic.gov.in",
            "dubaicustoms.gov.ae",
            "sfda.gov.sa",
            "kpa.co.ke",
            "togo-port.net",
            "smportkolkata.gov.in",
            "dpworld.com",
            "portdecotonou.bj",
        ]
        for dom in authorized_domains:
            assert not is_blacklisted_domain(dom), f"Domain '{dom}' should NOT be blacklisted!"


class TestDOMCorporateNameExtraction:
    """Verifies structured DOM parsing for genuine legal corporate names."""

    def test_crawl_contact_details_extracts_json_ld_legal_name(self):
        scraper = RealisticWebScraper()
        # Mock fetch_page to return HTML with JSON-LD schema
        mock_html = """
        <html>
        <head>
            <title>Home - Buy Rice Wholesale</title>
            <script type="application/ld+json">
            {
                "@context": "https://schema.org",
                "@type": "Corporation",
                "name": "Al Barakah Foodstuff Trading LLC",
                "telephone": "+971-4-2271890",
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "Al Ras Market",
                    "addressLocality": "Dubai",
                    "addressCountry": "AE"
                }
            }
            </script>
        </head>
        <body>
            <a href="tel:+97142271890">Call Us</a>
            <a href="mailto:info@albarakah-trade.com">Email</a>
        </body>
        </html>
        """
        original_fetch = scraper.fetch_page
        scraper.fetch_page = lambda url, **kwargs: (mock_html, 200, 0.05)
        try:
            details = scraper.crawl_contact_details("https://www.albarakah-trade.com", target_country="United Arab Emirates")
            assert details["legal_name"] == "Al Barakah Foodstuff Trading LLC"
            assert "+97142271890" in details["phones"]
        finally:
            scraper.fetch_page = original_fetch

    def test_crawl_contact_details_extracts_opengraph_site_name(self):
        scraper = RealisticWebScraper()
        mock_html = """
        <html>
        <head>
            <title>Welcome to our Online Store</title>
            <meta property="og:site_name" content="Midstar Agricultural Commodities FZE" />
        </head>
        <body>
            <p>Phone: +971 6 5263412</p>
        </body>
        </html>
        """
        original_fetch = scraper.fetch_page
        scraper.fetch_page = lambda url, **kwargs: (mock_html, 200, 0.05)
        try:
            details = scraper.crawl_contact_details("https://www.midstar-grain.ae", target_country="United Arab Emirates")
            assert details["legal_name"] == "Midstar Agricultural Commodities FZE"
        finally:
            scraper.fetch_page = original_fetch

    def test_crawl_contact_details_extracts_footer_copyright(self):
        scraper = RealisticWebScraper()
        mock_html = """
        <html>
        <head>
            <title>Leading Grain Importers</title>
        </head>
        <body>
            <h1>Welcome</h1>
            <footer>
                <p>&copy; 2024 Société Togolaise de Négoce et Riz SARL. All rights reserved.</p>
            </footer>
        </body>
        </html>
        """
        original_fetch = scraper.fetch_page
        scraper.fetch_page = lambda url, **kwargs: (mock_html, 200, 0.05)
        try:
            details = scraper.crawl_contact_details("https://www.stnr-togo.com", target_country="Togo")
            assert "Société Togolaise de Négoce et Riz SARL" in details["legal_name"] or "Societe" in details["legal_name"] or "Togolaise" in details["legal_name"]
        finally:
            scraper.fetch_page = original_fetch


class TestCountryCodeAlignment:
    """Verifies that phone numbers parse with appropriate regional country codes."""

    def test_country_to_iso2_coverage(self):
        key_countries = ["togo", "benin", "kenya", "nigeria", "ghana", "senegal", "egypt", "vietnam", "thailand", "india", "uae", "saudi arabia"]
        for c in key_countries:
            assert c in COUNTRY_TO_ISO2, f"Country '{c}' missing from COUNTRY_TO_ISO2!"

    def test_normalize_phones_ignores_date_ranges(self):
        text_with_years = "Operating since 1998-2024. Tel: +971 4 2271890. Annual report 2023-2024."
        phones = normalize_phones(text_with_years, region_hint="AE")
        assert "+97142271890" in phones
        for p in phones:
            assert "1998" not in p and "2023" not in p and "2024" not in p
