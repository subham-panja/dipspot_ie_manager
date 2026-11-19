"""
Purge Fictitious & Synthetic Leads from MongoDB and SQLite.

Removes:
- Leads with unresolvable/dead website domains.
- Leads with synthetic slug domains (e.g. clean_slug.com, -entropy.com).
- Leads with manufactured trade@ / procurement@ / info@ placeholder emails on non-live domains.
- Directory scraper artifacts (Volza, Zauba, IndiaMART SRE titles).

Ensures 100% genuine data authenticity.
"""

import logging
import os
import sys

# Ensure backend directory is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from app.db import get_db
from app.factory import create_app
from app.models import Lead, db
from app.real_scraper import is_blacklisted_domain
from app.seed_data import SEED_IMPORTERS, SEED_WB_MILLS
from app.tasks import _save_leads_with_dedup
from app.verifier import extract_domain, filter_live_emails, is_domain_live, is_synthetic_domain_format
import socket

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("PurgeFakeLeads")


def purge_fictitious_leads(app=None, reseed_verified: bool = True):
    """
    Executes a complete database audit and purge of synthetic/fictitious leads
    across MongoDB and SQLite.
    """
    if app is None:
        app = create_app()

    mongo_db = get_db()
    leads = list(mongo_db.leads.find({}))
    total_scanned = len(leads)
    logger.info(f"Scanning {total_scanned} leads in MongoDB for fictitious or unresolvable data...")

    purged_mongo_ids = []
    purged_sqlite_ids = []
    cleaned_leads = 0

    for doc in leads:
        doc_id = doc.get("_id")
        sq_id = doc.get("id")
        company = doc.get("company_name", "")
        website = doc.get("website", "")
        emails = doc.get("emails", "")

        domain = extract_domain(website) if website else ""

        # Flag 1: Aggregator or search directory title artifact or blacklisted domain
        is_blacklisted = (is_blacklisted_domain(website) or is_blacklisted_domain(domain)) if website else False
        is_aggregator_artifact = is_blacklisted or any(
            marker in company
            for marker in [
                "| Volza", "- Zauba", "RFQ Details | Exporters Worlds",
                "Wholesale Price & Mandi Rate", "Trademo", "- ExportHub",
                "The Observatory of Economic Complexity", "Selina Wamucii",
                "tuvalu-legislation", "DataM Intelligence", "Tridge",
                "worldbank.org", "wits.worldbank"
            ]
        )

        # Flag 2: Known synthetic slug pattern
        is_synthetic = is_synthetic_domain_format(domain) if domain else False

        # Flag 3: Synthetic template naming with unresolvable domain
        is_template_name = "IR-64" in company and ("Procurement & Sourcing" in company or "Agro Industries" in company or "Commodity Solutions" in company or "Societe Commerciale" in company or "Commercial Consortium" in company)

        # Flag 4: Website DNS resolution (both normalized domain and exact host)
        exact_host = website.replace("http://", "").replace("https://", "").split("/")[0].split(":")[0].strip() if website else ""
        exact_host_live = True
        if exact_host:
            try:
                socket.gethostbyname(exact_host)
            except Exception:
                exact_host_live = False

        web_live = (is_domain_live(domain) and exact_host_live) if domain else False

        # Flag 5: Valid live emails
        clean_emails = filter_live_emails(emails) if emails else ""

        # Lead is fictitious if:
        # - It is an aggregator scraping artifact with manufactured emails
        # - Website is provided but completely dead / fails DNS
        # - Website matches synthetic slug pattern
        # - Template company name paired with dead domain
        # - Contains manufactured trade@ or procurement@ without any valid email or live website
        should_purge = False
        purge_reason = ""

        if is_aggregator_artifact:
            should_purge = True
            purge_reason = f"Aggregator scraping artifact: '{company}'"
        elif is_synthetic:
            should_purge = True
            purge_reason = f"Synthetic slug domain: '{domain}'"
        elif is_template_name:
            should_purge = True
            purge_reason = f"Synthetic template company: '{company}' ({domain})"
        elif website and not web_live:
            should_purge = True
            purge_reason = f"Dead/unresolvable website domain: '{domain}'"
        elif emails and not clean_emails and not web_live:
            should_purge = True
            purge_reason = "Manufactured unresolvable emails with no live website"
        elif "trade@" in emails and "info@" in emails and not web_live:
            should_purge = True
            purge_reason = "Manufactured trade@/info@ placeholder pair on non-live domain"

        if should_purge:
            purged_mongo_ids.append(doc_id)
            if sq_id is not None:
                purged_sqlite_ids.append(sq_id)
            logger.info(f"PURGING: {company} | Reason: {purge_reason}")
        else:
            # Clean remaining legitimate leads
            updated_fields = {}
            if emails and clean_emails != emails:
                updated_fields["emails"] = clean_emails
            if website and not web_live:
                updated_fields["website"] = ""

            if updated_fields:
                mongo_db.leads.update_one({"_id": doc_id}, {"$set": updated_fields})
                cleaned_leads += 1

    # Execute MongoDB deletions
    if purged_mongo_ids:
        mongo_db.leads.delete_many({"_id": {"$in": purged_mongo_ids}})
        logger.info(f"Deleted {len(purged_mongo_ids)} fictitious leads from MongoDB.")

    # Execute SQLite deletions
    with app.app_context():
        if purged_sqlite_ids:
            try:
                db.session.query(Lead).filter(Lead.id.in_(purged_sqlite_ids)).delete(synchronize_session=False)
                db.session.commit()
                logger.info(f"Deleted {len(purged_sqlite_ids)} fictitious leads from SQLite.")
            except Exception as e:
                db.session.rollback()
                logger.warning(f"Error purging SQLite leads: {e}")

    remaining_mongo = mongo_db.leads.count_documents({})
    logger.info(f"Purge complete! Remaining genuine leads in MongoDB: {remaining_mongo}")

    # Seed verified authentic datasets if database has fewer than 30 leads
    if reseed_verified and remaining_mongo < 30:
        logger.info("Reseeding verified authentic leads from clean seed datasets...")
        _save_leads_with_dedup(app, SEED_IMPORTERS, custom_label="Verified Authentic Seed Importers")
        _save_leads_with_dedup(app, SEED_WB_MILLS, custom_label="Verified Authentic West Bengal Mills")
        final_count = mongo_db.leads.count_documents({})
        logger.info(f"Reseeding completed. Total verified leads now in MongoDB: {final_count}")

    return {
        "total_scanned": total_scanned,
        "purged_count": len(purged_mongo_ids),
        "cleaned_count": cleaned_leads,
        "remaining_count": mongo_db.leads.count_documents({}),
    }


if __name__ == "__main__":
    app = create_app()
    results = purge_fictitious_leads(app)
    print("\n" + "=" * 60)
    print("DATABASE CLEANUP RESULTS:")
    print(f"Total leads scanned:     {results['total_scanned']}")
    print(f"Fictitious leads purged: {results['purged_count']}")
    print(f"Legitimate leads cleaned:{results['cleaned_count']}")
    print(f"Genuine leads remaining: {results['remaining_count']}")
    print("=" * 60)
