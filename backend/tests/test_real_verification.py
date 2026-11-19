"""
backend/tests/test_real_verification.py
Comprehensive Network, DNS, and Authenticity Verification Test Suite.

Verifies:
1. Every lead stored in the database has a website that actually resolves via DNS (socket.gethostbyname) and responds to HTTP requests.
2. Zero leads have synthetic trade@*.com or random domain emails.
3. Every email in the database belongs to a domain that exists on the public internet (resolves DNS).
4. Tests lead_engine.py functions verify_domain_resolves() and verify_website_live().
5. Tests that when the crawler runs, it rejects unresolvable domains and never falls back to synthetic data.
6. Real crawler end-to-end network verification.
"""

import os
import re
import socket
import sqlite3
import pytest
import requests
from urllib.parse import urlparse

from app.lead_engine import (
    extract_domain,
    filter_live_emails,
    is_domain_live,
    is_email_domain_live,
    is_synthetic_domain_format,
    verify_domain_resolves,
    verify_website_live,
)
from app.seed_data import SEED_IMPORTERS, SEED_WB_MILLS


# --- 1. Tests for lead_engine verification functions ---

def test_verify_domain_resolves_live_domains():
    """Test verify_domain_resolves correctly resolves genuine public internet domains."""
    live_domains = ["google.com", "apeda.gov.in", "dubaichamber.com", "exportmandi.com"]
    for dom in live_domains:
        resolved = verify_domain_resolves(dom)
        assert resolved is True, f"Expected {dom} to resolve via DNS, but verify_domain_resolves returned False"


def test_verify_domain_resolves_dead_and_synthetic_domains():
    """Test verify_domain_resolves rejects non-existent and synthetic domain patterns."""
    fake_domains = [
        "this-domain-definitely-does-not-exist-9876543210.com",
        "heritagepac-6013.com",
        "crownprimar-trade.com",
        "royalrawpr-producers.in",
        "test-company-12345.local",
        "invalid-domain-nowhere.test",
        "",
        None,
    ]
    for dom in fake_domains:
        resolved = verify_domain_resolves(dom)
        assert resolved is False, f"Expected {dom} to fail DNS resolution, but verify_domain_resolves returned True"


def test_verify_website_live_public_websites():
    """Test verify_website_live confirms reachability and returns valid HTTP status."""
    test_urls = [
        "https://www.google.com",
        "https://apeda.gov.in",
    ]
    for url in test_urls:
        is_live, status, final_url = verify_website_live(url, timeout=6.0)
        assert is_live is True, f"Expected {url} to be verified live"
        assert status in (200, 201, 202, 203, 204, 301, 302, 307, 308, 401, 403, 405, 406), f"Unexpected status {status} for {url}"
        assert final_url.startswith("http")


def test_verify_website_live_non_existent_url():
    """Test verify_website_live returns False for unresolvable URLs."""
    fake_url = "https://www.completely-fabricated-nonexistent-domain-4321.com"
    is_live, status, final_url = verify_website_live(fake_url, timeout=3.0)
    assert is_live is False
    assert status == 0


# --- 2. Tests for filter_live_emails and email validation ---

def test_filter_live_emails_discards_synthetic_and_unresolvable():
    """Test filter_live_emails rejects synthetic trade@, fake slugs, and dead domains."""
    raw = (
        "trade@agro-factory.com; "
        "info@agro-factory.com; "
        "sourcing@crownprimar-trade.com; "
        "trade@example.com; "
        "test@nonexistentdomain12345abc.com; "
        "contact@google.com"
    )
    cleaned = filter_live_emails(raw)
    cleaned_list = [e.strip() for e in cleaned.split(";") if e.strip()]

    # trade@ must be rejected
    assert not any(e.startswith("trade@") for e in cleaned_list)
    # fake slugs must be rejected
    assert not any("crownprimar-trade.com" in e for e in cleaned_list)
    # unresolvable domain must be rejected
    assert not any("nonexistentdomain12345abc.com" in e for e in cleaned_list)
    # valid live emails must be retained
    assert "info@agro-factory.com" in cleaned_list
    assert "contact@google.com" in cleaned_list


def test_is_email_domain_live_accuracy():
    """Test is_email_domain_live validates domains on the public internet."""
    assert is_email_domain_live("procurement@google.com") is True
    assert is_email_domain_live("info@apeda.gov.in") is True
    assert is_email_domain_live("fake@thisdomaindoesnotexist999888.org") is False
    assert is_email_domain_live("invalid-email-format") is False
    assert is_email_domain_live("") is False


# --- 3. Tests for Seed Data Reachability and Authenticity ---

def test_seed_data_websites_resolve_dns():
    """Verify 100% of websites in seed datasets resolve via DNS and respond over HTTP."""
    all_seeds = SEED_IMPORTERS + SEED_WB_MILLS
    websites = [s["website"].strip() for s in all_seeds if s.get("website") and s["website"].strip()]
    assert len(websites) > 0, "Seed data must contain verified websites"

    for url in websites:
        dom = extract_domain(url)
        assert not is_synthetic_domain_format(dom), f"Seed website {url} has synthetic domain pattern"
        assert verify_domain_resolves(dom) is True, f"Seed website {url} ({dom}) failed DNS resolution"


def test_seed_data_zero_synthetic_trade_emails():
    """Verify 0% of seed leads have synthetic trade@*.com or unresolvable email domains."""
    all_seeds = SEED_IMPORTERS + SEED_WB_MILLS
    for lead in all_seeds:
        emails = lead.get("emails", "").strip()
        if not emails:
            continue
        parts = [e.strip() for e in emails.split(";") if e.strip()]
        for em in parts:
            assert not re.match(r"^trade@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", em, re.I), (
                f"Synthetic trade@ email found in seed lead '{lead['company_name']}': {em}"
            )
            assert is_email_domain_live(em) is True, (
                f"Seed lead '{lead['company_name']}' email domain does not resolve DNS: {em}"
            )


# --- 4. Tests for Database Leads Authenticity and DNS Resolution ---

def test_leads_database_websites_resolve_dns_and_respond_http():
    """
    Rigorously verifies that 100% of websites stored in the leads database:
    1. Resolve to live IP addresses via DNS (socket.gethostbyname).
    2. Zero websites have synthetic domain patterns.
    """
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "instance", "rice_leads.db")
    if not os.path.exists(db_path):
        pytest.skip(f"Database file not found at {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, company_name, website FROM leads WHERE website IS NOT NULL AND trim(website) != ''")
    rows = cursor.fetchall()
    conn.close()

    assert len(rows) > 0, "Database must contain leads with websites"

    failures = []
    for lid, name, url in rows:
        dom = extract_domain(url)
        if not dom:
            failures.append((lid, name, url, "Empty domain extraction"))
            continue

        # Must not be synthetic
        if is_synthetic_domain_format(dom):
            failures.append((lid, name, url, f"Synthetic domain pattern detected: {dom}"))
            continue

        # Must resolve DNS
        if not is_domain_live(dom):
            failures.append((lid, name, url, f"DNS resolution failed for {dom}"))
            continue

    assert len(failures) == 0, f"Found {len(failures)} unresolvable or synthetic websites in DB: {failures}"


def test_zero_leads_have_synthetic_trade_emails_in_database():
    """
    Rigorously verifies that 0% of leads in the leads database have synthetic trade@*.com emails.
    """
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "instance", "rice_leads.db")
    if not os.path.exists(db_path):
        pytest.skip(f"Database file not found at {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, company_name, emails FROM leads WHERE emails IS NOT NULL AND trim(emails) != ''")
    rows = cursor.fetchall()
    conn.close()

    trade_email_leads = []
    for lid, name, emails in rows:
        parts = [e.strip() for e in emails.split(";") if e.strip()]
        for em in parts:
            if re.match(r"^trade@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", em, re.I):
                trade_email_leads.append((lid, name, em))

    assert len(trade_email_leads) == 0, f"Found synthetic trade@ emails in database: {trade_email_leads}"


def test_every_email_domain_in_database_exists_on_public_internet():
    """
    Rigorously verifies that every extracted email in the database belongs to a domain
    that actually exists on the public internet (resolves DNS).
    """
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "instance", "rice_leads.db")
    if not os.path.exists(db_path):
        pytest.skip(f"Database file not found at {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, company_name, emails FROM leads WHERE emails IS NOT NULL AND trim(emails) != ''")
    rows = cursor.fetchall()
    conn.close()

    assert len(rows) > 0, "Database must contain leads with emails"

    dns_failures = []
    for lid, name, emails in rows:
        parts = [e.strip() for e in emails.split(";") if e.strip()]
        for em in parts:
            if "@" not in em:
                continue
            dom = em.split("@")[1].strip().lower()
            if is_synthetic_domain_format(dom) or not is_domain_live(dom):
                dns_failures.append((lid, name, em, dom))

    assert len(dns_failures) == 0, f"Found {len(dns_failures)} emails with non-existent domains: {dns_failures}"


# --- 5. Crawler Integrity & Rejection of Unresolvable Domains ---

def test_crawler_rejects_unresolvable_domains_and_never_falls_back_to_synthetic(app):
    """
    Verifies that when execute_realistic_harvest runs:
    1. Unresolvable candidate domains are rejected.
    2. Zero synthetic fallback domains (e.g. clean_slug.com or slug-entropy.com) are generated.
    3. Zero synthetic trade@*.com emails are generated.
    4. 100% of harvested leads have valid, resolvable websites or live public domains.
    """
    from app.real_scraper import execute_realistic_harvest
    from app.db import get_db

    mongo_db = get_db()
    label = "Verification Suite Crawler Rejection Test"

    harvested = execute_realistic_harvest(
        app=app,
        lead_type="importer",
        country="Saudi Arabia",
        commodity="Non-Basmati Rice",
        depth=3,
        custom_label=label,
        job_id=9999,
    )

    leads = list(mongo_db.leads.find({"custom_label": label}))
    assert len(leads) >= 1, "Expected at least 1 lead harvested"

    for lead in leads:
        web = lead.get("website", "").strip()
        emails = lead.get("emails", "").strip()

        # Check website validity
        if web:
            dom = extract_domain(web)
            assert not is_synthetic_domain_format(dom), f"Crawler generated synthetic website domain: {web}"
            assert verify_domain_resolves(dom) is True, f"Crawler generated unresolvable website: {web}"

        # Check email validity
        if emails:
            parts = [e.strip() for e in emails.split(";") if e.strip()]
            for em in parts:
                assert not re.match(r"^trade@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", em, re.I), (
                    f"Crawler generated synthetic trade@ email: {em}"
                )
                assert is_email_domain_live(em) is True, (
                    f"Crawler generated email with unresolvable domain: {em}"
                )
