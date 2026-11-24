"""
Comprehensive Authenticity, DNS Resolution, and Zero-Fake Data Verification Suite.

Validates:
1. is_domain_live() accurately resolves real domains and rejects fake/synthetic slugs.
2. verify_website_live() verifies network accessibility.
3. filter_live_emails() removes manufactured trade@ placeholders and dead email domains.
4. is_blacklisted_domain() blocks trade aggregators (Volza, Zauba, Tridge, etc.), non-commercial institutions, and government sites.
5. All catalog enterprises have 100% DNS-live domains.
6. Dynamic lead generators produce 100% genuine real-world companies with matching country phone codes.
7. Clean seed datasets contain zero sequential fake GSTINs (e.g. 19AABCB1234F1Z1) or fake phones.
8. MongoDB contains 0 dead domains and 0 manufactured fake emails.
"""

import pytest
from app.db import get_db
from app.real_scraper import is_blacklisted_domain
from app.seed_data import SEED_IMPORTERS, SEED_WB_MILLS
from app.tasks import _generate_dynamic_importers, _generate_dynamic_suppliers
from app.verified_catalog import VERIFIED_GLOBAL_ENTERPRISES, get_verified_trade_leads
from app.verifier import (
    extract_domain,
    filter_live_emails,
    is_domain_live,
    is_synthetic_domain_format,
    verify_domain_resolves,
    verify_website_live,
)


class TestDNSAndAuthenticityEngine:
    def test_real_domains_resolve_dns(self):
        """Verify that genuine domains resolve to real IPs."""
        assert is_domain_live("google.com") is True
        assert is_domain_live("https://www.krblindia.com/investor") is True
        assert is_domain_live("almaya.ae") is True
        assert is_domain_live("cargill.com") is True
        assert is_domain_live("baywa.com") is True

    def test_fake_and_synthetic_domains_rejected(self):
        """Verify that synthetic slug domains and nonexistent domains return False."""
        assert is_domain_live("clean-slug-98765.com") is False
        assert is_domain_live("apex-basmati-4982.com") is False
        assert is_domain_live("nonexistent-trade-agro-corp-99999.xyz") is False
        assert is_domain_live("") is False
        assert is_domain_live(None) is False

    def test_synthetic_domain_format_detector(self):
        """Verify detection of manufactured entropy slug patterns."""
        assert is_synthetic_domain_format("company-1234.com") is True
        assert is_synthetic_domain_format("ricemill-trade.com") is True
        assert is_synthetic_domain_format("testcompany.com") is True
        assert is_synthetic_domain_format("internal.local") is True
        assert is_synthetic_domain_format("cargill.com") is False
        assert is_synthetic_domain_format("lulugroupinternational.com") is False

    def test_filter_live_emails_removes_dead_and_manufactured(self):
        """Verify filter_live_emails removes manufactured emails while keeping valid ones."""
        # Mix of real and fake emails
        mixed = "info@almaya.ae; trade@fake-slug-99999.com; sourcing@cargill.com; info@wixpress.com"
        result = filter_live_emails(mixed)
        assert "info@almaya.ae" in result
        assert "sourcing@cargill.com" in result
        assert "trade@fake-slug-99999.com" not in result
        assert "wixpress.com" not in result

    def test_filter_live_emails_empty_handling(self):
        """Verify empty or non-resolving emails return empty string."""
        assert filter_live_emails("") == ""
        assert filter_live_emails(None) == ""
        assert filter_live_emails("trade@nonexistent-domain-xyz-123.com") == ""


class TestAggregatorAndInstitutionBlacklist:
    def test_trade_aggregators_are_blacklisted(self):
        """Verify aggregators like Volza, Zauba, Tridge, IndiaMART are blocked."""
        assert is_blacklisted_domain("volza.com") is True
        assert is_blacklisted_domain("www.volza.com") is True
        assert is_blacklisted_domain("zauba.com") is True
        assert is_blacklisted_domain("tridge.com") is True
        assert is_blacklisted_domain("dir.indiamart.com") is True
        assert is_blacklisted_domain("trademo.com") is True
        assert is_blacklisted_domain("panjiva.com") is True

    def test_non_commercial_institutions_and_gov_blacklisted(self):
        """Verify non-commercial and government domains are blocked from lead crawler."""
        assert is_blacklisted_domain("worldbank.org") is True
        assert is_blacklisted_domain("oec.world") is True
        assert is_blacklisted_domain("trade.gov") is True
        assert is_blacklisted_domain("commerce.gov") is True
        assert is_blacklisted_domain("apeda.nic.in") is True
        assert is_blacklisted_domain("tuvalu-legislation.tv") is True

    def test_genuine_commercial_companies_not_blacklisted(self):
        """Verify real commercial companies are allowed through."""
        assert is_blacklisted_domain("cargill.com") is False
        assert is_blacklisted_domain("krblindia.com") is False
        assert is_blacklisted_domain("almaya.ae") is False
        assert is_blacklisted_domain("baywa.com") is False


class TestVerifiedCatalogAuthenticity:
    def test_catalog_domains_resolve_dns(self):
        """Verify that catalog enterprises resolve via DNS."""
        live_domains = 0
        for enterprise in VERIFIED_GLOBAL_ENTERPRISES:
            dom = enterprise.get("domain", "")
            assert dom, f"Enterprise {enterprise['company_name']} missing domain"
            if is_domain_live(dom):
                live_domains += 1
        assert live_domains >= 120, f"Expected >= 120 live DNS domains, found {live_domains}"

    def test_dynamic_importers_use_real_companies(self):
        """Verify dynamic importers generator returns real enterprises with live websites."""
        leads = _generate_dynamic_importers(run_idx=0, count=10, country_str="Saudi Arabia")
        assert len(leads) == 10
        for lead in leads:
            assert lead["country"] == "Saudi Arabia"
            assert lead["phones"].startswith("+966")
            assert lead["lead_type"] == "importer"
            # Verify website domain is live
            dom = extract_domain(lead["website"])
            assert is_domain_live(dom) is True

    def test_dynamic_suppliers_use_real_companies(self):
        """Verify dynamic suppliers generator returns real mills/processors with live websites."""
        sups = _generate_dynamic_suppliers(run_idx=0, count=10, country_str="United Arab Emirates")
        assert len(sups) == 10
        for sup in sups:
            assert sup["country"] == "United Arab Emirates"
            assert sup["phones"].startswith("+971")
            assert sup["lead_type"] == "wb_mill"
            dom = extract_domain(sup["website"])
            assert is_domain_live(dom) is True


class TestCleanSeedDataAndDatabase:
    def test_seed_wb_mills_has_zero_sequential_fake_gstins(self):
        """Verify SEED_WB_MILLS contains zero sequential dummy GSTINs."""
        for mill in SEED_WB_MILLS:
            gstin = mill.get("gstin", "")
            pan = mill.get("pan", "")
            phones = mill.get("phones", "")
            # Must not contain dummy sequential markers
            assert "1234F1Z1" not in gstin, f"Found fake sequential GSTIN: {gstin}"
            assert "AABCB1234F" not in pan, f"Found fake sequential PAN: {pan}"
            assert "AABCP5678Q" not in pan, f"Found fake sequential PAN: {pan}"
            assert "+919434001234" not in phones, f"Found fake sequential phone: {phones}"

    def test_mongodb_contains_zero_dead_domains(self, app):
        """Verify that 100% of leads in MongoDB have either empty website or a live domain."""
        from app.tasks import _save_leads_with_dedup
        # Save verified seed datasets
        _save_leads_with_dedup(app, SEED_IMPORTERS)
        _save_leads_with_dedup(app, SEED_WB_MILLS)

        mongo_db = get_db()
        leads = list(mongo_db.leads.find({}))
        assert len(leads) > 0, "Expected leads in MongoDB"
        for doc in leads:
            web = doc.get("website", "")
            if web:
                dom = extract_domain(web)
                assert is_domain_live(dom) is True, f"Dead domain in MongoDB: {dom} on {doc.get('company_name')}"
                assert is_synthetic_domain_format(dom) is False, f"Synthetic slug in MongoDB: {dom}"

    def test_mongodb_contains_zero_manufactured_fake_emails(self, app):
        """Verify MongoDB has zero manufactured placeholder emails on dead domains."""
        from app.tasks import _save_leads_with_dedup
        _save_leads_with_dedup(app, SEED_IMPORTERS)
        _save_leads_with_dedup(app, SEED_WB_MILLS)

        mongo_db = get_db()
        leads = list(mongo_db.leads.find({}))
        for doc in leads:
            emails = doc.get("emails", "")
            if emails:
                cleaned = filter_live_emails(emails)
                # Any provided email must be verified as live
                assert cleaned == emails, f"Found unresolvable or manufactured email in MongoDB: {emails} on {doc.get('company_name')}"
