# -*- coding: utf-8 -*-
"""
Tests for The Reverse-Engineer Customs Data Trick (HS 100630):
- Sourcing 1-3 containers/month SME rice importers (25-75 MT)
- Discharge port routing (Jebel Ali, Khalifa Bin Salman, Dammam, Mombasa, Lome)
- Strict exclusion of giant conglomerates (Olam, LuLu, Al Ghurair, Savola, etc.)
- Automatic generation of decision-maker LinkedIn search and WhatsApp CIF pitch outreach links
- 100% strict geographic isolation per target country
"""
import pytest
import urllib.parse
from app.verified_catalog import (
    get_verified_trade_leads,
    GIANT_CONGLOMERATES,
    VERIFIED_GLOBAL_ENTERPRISES,
)
from app.real_scraper import RealisticWebScraper
from app.routes.api import serialize_mongo_lead


class TestCustomsManifestStrategy:

    def test_sme_catalog_structure(self):
        """Verify verified SME leads in catalog have proper customs attributes."""
        sme_leads = [
            e for e in VERIFIED_GLOBAL_ENTERPRISES
            if e.get("importer_tier") == "sme_importer"
        ]
        assert len(sme_leads) >= 30, f"Should have at least 30 verified SME leads, found {len(sme_leads)}"

        for lead in sme_leads:
            assert lead.get("importer_tier") == "sme_importer"
            vol = lead.get("shipment_volume", "")
            assert any(x in vol for x in ["Container", "Containers", "FCL", "MT"]), f"Invalid volume: {vol}"
            assert lead.get("nearest_port") is not None
            assert lead.get("country") in [
                "United Arab Emirates",
                "Bahrain",
                "Saudi Arabia",
                "Kenya",
                "Togo",
            ]
            # Verify no mock emails
            emails = lead.get("emails", "")
            if emails:
                assert not any(x in emails for x in ["example.com", "randomdomain.com", "trade@"]), \
                    f"Fabricated email found: {emails}"

    def test_conglomerate_exclusion(self):
        """Verify that giant conglomerates are strictly filtered out when requesting SME leads."""
        leads = get_verified_trade_leads(
            lead_type="importer",
            commodity="Rice",
            tier="sme",
        )
        assert len(leads) > 0, "Should return SME leads"

        conglomerate_lowers = [g.lower() for g in GIANT_CONGLOMERATES]
        for lead in leads:
            c_name = lead.get("company_name", "").lower()
            for cong in conglomerate_lowers:
                assert cong not in c_name, f"Conglomerate '{cong}' leaked into SME leads: {c_name}"

    def test_port_filtering(self):
        """Verify filtering by discharge port works accurately."""
        # Jebel Ali
        jebel_leads = get_verified_trade_leads(
            lead_type="importer",
            country="United Arab Emirates",
            port="Jebel Ali",
            tier="sme",
        )
        assert len(jebel_leads) > 0
        for l in jebel_leads:
            assert "Jebel Ali" in l.get("nearest_port", "")
            assert l.get("country") == "United Arab Emirates"

        # Khalifa Bin Salman (Bahrain)
        bahrain_leads = get_verified_trade_leads(
            lead_type="importer",
            country="Bahrain",
            port="Khalifa Bin Salman",
            tier="sme",
        )
        assert len(bahrain_leads) > 0
        for l in bahrain_leads:
            assert "Khalifa Bin Salman" in l.get("nearest_port", "")
            assert l.get("country") == "Bahrain"
            # Strict calling code +973
            assert "+973" in l.get("phones", "")

        # Mombasa (Kenya)
        kenya_leads = get_verified_trade_leads(
            lead_type="importer",
            country="Kenya",
            port="Mombasa",
            tier="sme",
        )
        assert len(kenya_leads) > 0
        for l in kenya_leads:
            assert "Mombasa" in l.get("nearest_port", "")
            assert l.get("country") == "Kenya"
            # Strict calling code +254
            assert "+254" in l.get("phones", "")

        # Dammam (Saudi Arabia)
        dammam_leads = get_verified_trade_leads(
            lead_type="importer",
            country="Saudi Arabia",
            port="Dammam",
            tier="sme",
        )
        assert len(dammam_leads) > 0
        for l in dammam_leads:
            assert "Dammam" in l.get("nearest_port", "") or "King Abdulaziz" in l.get("nearest_port", "")
            assert l.get("country") == "Saudi Arabia"
            # Strict calling code +966
            assert "+966" in l.get("phones", "")

    def test_customs_manifest_crawler_suite(self):
        """Test RealisticWebScraper's crawl_customs_manifest_suite execution."""
        scraper = RealisticWebScraper(strict_country_mode=True)
        results = scraper.crawl_customs_manifest_suite(
            commodity="Non-Basmati Rice HS 100630",
            target_country="Bahrain",
            lead_type="importer",
            depth=10,
            custom_dork=None,
            source_name="Volza Maritime Manifest Tracker",
        )
        assert len(results) > 0, "Customs manifest crawler should yield SME candidates"

        for lead in results:
            assert lead.get("country") == "Bahrain"
            assert lead.get("importer_tier") == "sme_importer"
            vol = lead.get("shipment_volume", "")
            assert any(x in vol for x in ["Container", "Containers", "FCL", "MT"]), f"Invalid shipment volume: {vol}"
            assert "+973" in lead.get("phones", "")

            # Verify outreach URLs
            wa_url = lead.get("whatsapp_outreach_url", "")
            assert wa_url.startswith("https://wa.me/973")
            assert "CIF" in urllib.parse.unquote(wa_url)
            assert "100630" in urllib.parse.unquote(wa_url) or "Rice" in urllib.parse.unquote(wa_url)

            li_url = lead.get("linkedin_search_url", "")
            assert "linkedin.com/search" in li_url
            assert "Purchase" in li_url or "Owner" in li_url

    def test_serialize_mongo_lead_with_customs_metadata(self):
        """Verify API serialization handles customs manifest fields smoothly."""
        sample_doc = {
            "_id": "507f1f77bcf86cd799439011",
            "id": 101,
            "company_name": "Bahrain Spices & Grains W.L.L.",
            "country": "Bahrain",
            "city_or_hub": "Manama",
            "phones": "+973 1721 4455",
            "contact_person": "Jasim Al-Mahmood (Purchase Manager)",
            "shipment_volume": "1-3 Containers / mo (25-75 MT)",
            "importer_tier": "sme_importer",
            "nearest_port": "Khalifa Bin Salman Port (BHKBS)",
            "whatsapp_outreach_url": "https://wa.me/97317214455?text=Hello",
            "linkedin_search_url": "https://www.linkedin.com/search/results/all/?keywords=Bahrain+Spices+Purchase+Manager",
            "google_maps_url": "https://www.google.com/maps/search/?api=1&query=Bahrain+Spices+Manama",
        }

        res = serialize_mongo_lead(sample_doc)
        assert res["shipment_volume"] == "1-3 Containers / mo (25-75 MT)"
        assert res["importer_tier"] == "sme_importer"
        assert res["nearest_port"] == "Khalifa Bin Salman Port (BHKBS)"
        assert res["whatsapp_outreach_url"] == "https://wa.me/97317214455?text=Hello"
        assert "linkedin.com" in res["linkedin_search_url"]
        assert "google.com/maps" in res["google_maps_url"]
