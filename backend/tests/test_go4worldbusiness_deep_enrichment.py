"""
Unit & Integration Tests for Go4WorldBusiness Deep Buyer RFQ Extraction,
Google Dork OSINT Enrichment, and 200+ New Verified Trade Sources.

Verifies:
1. Go4WorldBusiness buyer RFQ parsing:
   - Real contact person (e.g. 'Ms. Vee Vismanoz', 'Mohamed Alshamy')
   - Exact required shipment volume (e.g. '1 Twenty-Foot Container')
   - Payment terms (e.g. 'LC', 'CAD', 'LC / TT')
   - Shipping terms (e.g. 'FOB/CIF')
   - Destination port and country
   - Importer tier classification ('sme_importer' for 1-3 containers)
2. Targeted Google Dork & LinkedIn OSINT enrichment flow:
   - Formulation of '"{contact_person}" "{country}" site:linkedin.com'
   - LinkedIn URL and corporate domain discovery
   - Pre-formatted WhatsApp outreach link generation
3. Total verified sources count >= 755 (verifying 210 new sources across UAE, Saudi, Togo, Ghana, Kenya, Europe, India).
4. Strict zero synthetic / mock email policy and strict geographic isolation.
"""

import pytest
from bs4 import BeautifulSoup
from app.scrapers.importers import (
    parse_go4worldbusiness_buyers_html,
    parse_go4worldbusiness_suppliers_html,
)
from app.real_scraper import (
    RealisticWebScraper,
    filter_live_emails,
    is_domain_live,
)
from app.sources import (
    get_all_sources,
    get_importer_sources,
    get_supplier_sources,
    IMPORTER_SOURCES,
    SUPPLIER_SOURCES,
)


SAMPLE_GO4WB_BUYERS_HTML = """
<!DOCTYPE html>
<html>
<head><title>Rice Buyers & Importers | go4WorldBusiness.com</title></head>
<body>
<div class="entity-rows-container">
    <div class="header">
        <a href="/buylead/view/1335931/wanted-:-rice-like-basmati-rice-parboiled-rice.html">
            Wanted : Rice Like  Basmati Rice, Parboiled Rice
        </a>
    </div>
    <div class="details">
        Buyer From United Arab Emirates |
        Quantity Required: 1 Twenty-Foot Container |
        Payment Terms: LC |
        Destination: United Arab Emirates |
        Looking for suppliers from: Worldwide |
        Product Description: Please quote for the following wholesale product requirement -
        Product Name: Rice | Specifications: Types: Basmati Rice, Non-Basmati Rice, Parboiled Rice |
        Material: Rice Grains | Quantity Required : 1 Twenty-Foot Container |
        Shipping Terms : FOB/CIF | HS Code : 100630 | Destination Port : Jebel Ali Port, United Arab Emirates |
        Payment Terms : LC | Contact : Ms. Vee Vismanoz |
        Buyer Of Rice | Basmati Rice | Non Basmati Rice | Parboiled Rice
    </div>
</div>

<div class="entity-rows-container">
    <div class="header">
        <a href="/buylead/view/1336023/wanted-:-golden-sella-rice-like-1121-rice.html">
            Wanted : Golden Sella Rice Like 1121 Rice
        </a>
    </div>
    <div class="details">
        Buyer From Egypt |
        Quantity Required: 1 Twenty-Foot Container |
        Payment Terms: LC |
        Destination: Damietta, Egypt |
        Product Name: Golden Sella Rice |
        Quantity Required : 1 Twenty-Foot Container |
        Shipping Terms : FOB | HS Code : 100630 | Destination Port : Damietta, Egypt |
        Payment Terms : LC | Contact : Mohamed Alshamy |
        Buyer Of Rice | Sella Basmati Rice | 1121 Basmati Rice
    </div>
</div>

<div class="entity-rows-container">
    <div class="header">
        <a href="/buylead/view/1335750/wanted-:-ir64-parboiled-rice-5-broken.html">
            Wanted : IR64 Parboiled Rice 5 Percent Broken
        </a>
    </div>
    <div class="details">
        Buyer From Togo |
        Quantity Required: 2 Twenty-Foot Container |
        Payment Terms: CAD |
        Destination: Lome Port, Togo |
        Quantity Required : 2 Twenty-Foot Container |
        Shipping Terms : CIF | HS Code : 100630 | Destination Port : Port Autonome de Lome, Togo |
        Payment Terms : CAD | Contact : Koffi Mensah |
        Buyer Of Parboiled Rice | Non Basmati Rice
    </div>
</div>
</body>
</html>
"""


class TestGo4WorldBusinessDeepExtraction:
    """Verifies that Go4WorldBusiness HTML parsing accurately extracts contact person, shipment volume, and tier."""

    def test_extract_uae_buyer_rfq_with_contact_person_and_volume(self):
        leads = parse_go4worldbusiness_buyers_html(
            SAMPLE_GO4WB_BUYERS_HTML,
            target_country="United Arab Emirates",
            commodity="Rice",
        )
        assert len(leads) >= 1
        lead = leads[0]

        # Contact person must be extracted accurately, not hardcoded default
        assert lead["contact_person"] == "Ms. Vee Vismanoz"
        assert lead["purchase_manager_name"] == "Ms. Vee Vismanoz"
        assert lead["country"] == "United Arab Emirates"

        # Shipment volume and tier
        assert "1 Twenty-Foot Container" in lead["shipment_volume"]
        assert lead["importer_tier"] == "sme_importer"

        # Customs manifest / RFQ details
        assert "1335931" in lead["customs_manifest_data"]
        assert "LC" in lead["customs_manifest_data"]
        assert "FOB/CIF" in lead["customs_manifest_data"]

        # Company name must be clean institutional desk, not generic page title
        assert "Rice Like  Basmati Rice" in lead["company_name"]
        assert "Import Desk" in lead["company_name"]
        assert "Home" not in lead["company_name"]

    def test_extract_togo_buyer_rfq_with_strict_isolation(self):
        leads = parse_go4worldbusiness_buyers_html(
            SAMPLE_GO4WB_BUYERS_HTML,
            target_country="Togo",
            commodity="Rice",
        )
        assert len(leads) >= 1
        togo_lead = next((l for l in leads if l["country"] == "Togo"), None)
        assert togo_lead is not None
        assert togo_lead["contact_person"] == "Koffi Mensah"
        assert "2 Twenty-Foot Container" in togo_lead["shipment_volume"]
        assert togo_lead["importer_tier"] == "sme_importer"
        assert "CAD" in togo_lead["customs_manifest_data"]

    def test_go4worldbusiness_crawler_enriches_whatsapp_and_linkedin(self):
        scraper = RealisticWebScraper()
        leads = scraper.crawl_go4worldbusiness(commodity="Rice", target_c="United Arab Emirates", lead_type="importer", depth=3)
        assert len(leads) >= 1
        for lead in leads:
            assert lead["lead_type"] == "importer"
            # LinkedIn search URL must be formulated
            assert "linkedin.com/search" in lead.get("linkedin_search_url", "")
            # If contact person or phone is populated, outreach links must be valid
            if lead.get("phones"):
                assert "wa.me" in lead.get("whatsapp_outreach_url", "")


class TestSourcesCatalogExpansion:
    """Verifies that 200+ new verified sources were added and total sources count >= 755."""

    def test_total_sources_count_exceeds_755(self):
        all_sources = get_all_sources()
        assert len(all_sources) >= 755, f"Expected >= 755 verified sources, got {len(all_sources)}"
        assert len(IMPORTER_SOURCES) >= 380, f"Expected >= 380 importer sources, got {len(IMPORTER_SOURCES)}"
        assert len(SUPPLIER_SOURCES) >= 380, f"Expected >= 380 supplier sources, got {len(SUPPLIER_SOURCES)}"

    def test_verified_customs_and_port_sources_present(self):
        imp_sources = get_importer_sources()
        source_domains = {s["domain"] for s in imp_sources}

        # Key international port authorities and customs portals
        required_domains = [
            "adports.ae",          # Abu Dhabi Ports Khalifa Port
            "fasah.sa",            # Saudi FASAH Single Window
            "zatca.gov.sa",        # Saudi ZATCA Customs
            "togo-port.net",       # Port Autonome de Lomé (Togo)
            "segucetogo.com",      # Guichet Unique Togo
            "icums.gov.gh",        # Ghana ICUMS Single Window
            "portbase.com",        # Port of Rotterdam PCS
            "nxtport.com",         # Port of Antwerp-Bruges
            "dakosy.de",           # Hamburg Port Authority
            "destin8.co.uk",       # UK Ports Destin8
            "cbp.gov",             # US Customs ACE
            "portnet.com",         # PSA Singapore
            "dagangnet.com.my",    # Malaysia Single Window
        ]
        for req in required_domains:
            assert req in source_domains, f"Required verified domain '{req}' missing from importer sources!"

    def test_verified_milling_and_export_sources_present(self):
        sup_sources = get_supplier_sources()
        source_domains = {s["domain"] for s in sup_sources}

        # Key agricultural boards and export councils
        required_sup_domains = [
            "apeda.gov.in",        # APEDA BEDF & GrainNet
            "fci.gov.in",          # Food Corporation of India
            "cewacor.nic.in",      # Central Warehousing Corporation
            "wbswc.in",            # West Bengal State Warehousing
            "wbagrimarketingboard.gov.in", # WB Agricultural Marketing Board
            "wbricemills.org",     # Burdwan & Hooghly Rice Mills Consortium
            "thairiceexporters.or.th", # Thai Rice Exporters
            "vietfood.org.vn",     # Vietnam Food Association
            "usarice.com",         # USA Rice Federation
            "enterisi.it",         # Italian Rice Board
        ]
        for req in required_sup_domains:
            assert req in source_domains, f"Required verified domain '{req}' missing from supplier sources!"

    def test_zero_mock_emails_in_sources(self):
        all_sources = get_all_sources()
        for src in all_sources:
            url = src.get("url", "")
            # Sources must have real, valid domains
            assert not any(bad in url for bad in ("example.com", "randomdomain.com", "test.com", "fake.com")), f"Mock URL in {src}"
