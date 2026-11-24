"""Lead generation and scraping task runners."""

import logging
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from app.config import Config
from app.models import ScrapeJob, db
from app.sources import get_importer_sources, get_supplier_sources, IMPORTER_SOURCES, SUPPLIER_SOURCES
from app.seed_data import SEED_IMPORTERS, SEED_WB_MILLS
from app.verifier import extract_domain, filter_live_emails, is_domain_live, verify_website_live
from app.verified_catalog import get_verified_trade_leads

# Re-exports for backward compatibility and mock patching
from app.geo_database import GLOBAL_COUNTRY_DATABASE, REGIONAL_IMPORTER_CLUSTERS, REGIONAL_SUPPLIER_CLUSTERS
from app.geo_knowledge import resolve_region_cluster, resolve_supplier_cluster, resolve_country_profile
from app.dynamic_leads import (
    compute_match_probability,
    generate_unique_company_name,
    _generate_place_id,
    _generate_dynamic_importers,
    _generate_dynamic_suppliers,
)
from app.lead_persister import _save_leads_with_dedup
from app.lead_engine import (
    clean_company_key,
    clean_company_name,
    is_duplicate,
    calculate_lead_similarity,
    is_pure_generic_category,
)

logger = logging.getLogger("EXIMLeadTasks")
HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

DISCOVERY_COMMODITIES = [
    "Non-Basmati Parboiled & White Grain",
    "Traditional & Pusa Basmati 1121",
    "Organic Spices, Turmeric & Cardamom",
    "Raw Cotton & 100% Combed Yarn",
    "Refined Cane Sugar ICUMSA 45",
    "Industrial Chemicals & Polymers",
    "Primary Metals, Billets & Coils",
    "Packaged Foodstuffs & Edible Oils",
]


def run_importer_scrape_thread(
    app,
    job_id: Optional[int] = None,
    country: Optional[str] = None,
    region: Optional[str] = None,
    commodity: Optional[str] = None,
    depth: int = 30,
    custom_city: Optional[str] = None,
    custom_lat: Optional[float] = None,
    custom_lng: Optional[float] = None,
    custom_label: Optional[str] = None,
    extraction_notes: Optional[str] = None,
    selected_sources: Optional[List[str]] = None,
    custom_dork: Optional[str] = None,
    enable_proxy_shield: bool = True,
):
    """Executes realistic importer web harvesting and contact parsing strictly for the specified country."""
    from app.real_scraper import execute_realistic_harvest
    try:
        execute_realistic_harvest(
            app=app,
            lead_type="importer",
            country=country,
            region=region,
            commodity=commodity,
            depth=max(depth, 1),
            custom_city=custom_city,
            custom_lat=custom_lat,
            custom_lng=custom_lng,
            custom_label=custom_label,
            extraction_notes=extraction_notes,
            selected_sources=selected_sources,
            custom_dork=custom_dork,
            enable_proxy_shield=enable_proxy_shield,
            job_id=job_id,
        )
    except Exception as e:
        logger.error(f"Error in run_importer_scrape_thread: {e}")


def run_wb_mills_scrape_thread(
    app,
    job_id: Optional[int] = None,
    country: Optional[str] = None,
    region: Optional[str] = None,
    commodity: Optional[str] = None,
    depth: int = 30,
    custom_city: Optional[str] = None,
    custom_lat: Optional[float] = None,
    custom_lng: Optional[float] = None,
    custom_label: Optional[str] = None,
    extraction_notes: Optional[str] = None,
    selected_sources: Optional[List[str]] = None,
    custom_dork: Optional[str] = None,
    enable_proxy_shield: bool = True,
):
    """Executes realistic supplier web harvesting and contact parsing strictly for the specified country."""
    from app.real_scraper import execute_realistic_harvest
    try:
        execute_realistic_harvest(
            app=app,
            lead_type="supplier",
            country=country,
            region=region,
            commodity=commodity,
            depth=max(depth, 1),
            custom_city=custom_city,
            custom_lat=custom_lat,
            custom_lng=custom_lng,
            custom_label=custom_label,
            extraction_notes=extraction_notes,
            selected_sources=selected_sources,
            custom_dork=custom_dork,
            enable_proxy_shield=enable_proxy_shield,
            job_id=job_id,
        )
    except Exception as e:
        logger.error(f"Error in run_wb_mills_scrape_thread: {e}")


# Aliases for clean semantic naming
run_supplier_scrape_thread = run_wb_mills_scrape_thread


def start_importer_scrape(
    app,
    country: Optional[str] = None,
    region: Optional[str] = None,
    commodity: Optional[str] = None,
    depth: int = 30,
    custom_city: Optional[str] = None,
    custom_lat: Optional[float] = None,
    custom_lng: Optional[float] = None,
    custom_label: Optional[str] = None,
    extraction_notes: Optional[str] = None,
    selected_sources: Optional[List[str]] = None,
    custom_dork: Optional[str] = None,
    enable_proxy_shield: bool = True,
) -> int:
    with app.app_context():
        job = ScrapeJob(job_type="importer", status="pending")
        db.session.add(job)
        db.session.commit()
        job_id = job.id

    try:
        from app.db import get_db, now_iso
        mongo_db = get_db()
        mongo_db.crawler_jobs.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "job_id": job_id,
                    "lead_type": "importer",
                    "country": country or region or "Global",
                    "commodity": commodity or "Rice",
                    "depth": depth,
                    "custom_label": custom_label or "Standard Harvest",
                    "status": "running",
                    "progress_pct": 5,
                    "current_step": "Initializing crawler thread...",
                    "current_url": "",
                    "leads_found": 0,
                    "inserted_count": 0,
                    "merged_count": 0,
                    "elapsed_seconds": 0,
                    "created_at": now_iso(),
                    "updated_at": now_iso(),
                    "logs": [],
                }
            },
            upsert=True,
        )
    except Exception:
        pass

    t = threading.Thread(
        target=run_importer_scrape_thread,
        args=(app, job_id, country, region, commodity, depth, custom_city, custom_lat, custom_lng, custom_label, extraction_notes, selected_sources),
        kwargs={"custom_dork": custom_dork, "enable_proxy_shield": enable_proxy_shield},
        daemon=True,
    )
    t.start()
    return job_id


def start_wb_mills_scrape(
    app,
    country: Optional[str] = None,
    region: Optional[str] = None,
    commodity: Optional[str] = None,
    depth: int = 30,
    custom_city: Optional[str] = None,
    custom_lat: Optional[float] = None,
    custom_lng: Optional[float] = None,
    custom_label: Optional[str] = None,
    extraction_notes: Optional[str] = None,
    selected_sources: Optional[List[str]] = None,
    custom_dork: Optional[str] = None,
    enable_proxy_shield: bool = True,
) -> int:
    with app.app_context():
        job = ScrapeJob(job_type="wb_mill", status="pending")
        db.session.add(job)
        db.session.commit()
        job_id = job.id

    try:
        from app.db import get_db, now_iso
        mongo_db = get_db()
        mongo_db.crawler_jobs.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "job_id": job_id,
                    "lead_type": "supplier",
                    "country": country or region or "India",
                    "commodity": commodity or "Rice",
                    "depth": depth,
                    "custom_label": custom_label or "Standard Harvest",
                    "status": "running",
                    "progress_pct": 5,
                    "current_step": "Initializing supplier crawler thread...",
                    "current_url": "",
                    "leads_found": 0,
                    "inserted_count": 0,
                    "merged_count": 0,
                    "elapsed_seconds": 0,
                    "created_at": now_iso(),
                    "updated_at": now_iso(),
                    "logs": [],
                }
            },
            upsert=True,
        )
    except Exception:
        pass

    t = threading.Thread(
        target=run_wb_mills_scrape_thread,
        args=(app, job_id, country, region, commodity, depth, custom_city, custom_lat, custom_lng, custom_label, extraction_notes, selected_sources),
        kwargs={"custom_dork": custom_dork, "enable_proxy_shield": enable_proxy_shield},
        daemon=True,
    )
    t.start()
    return job_id


start_supplier_scrape = start_wb_mills_scrape


def seed_importers(app) -> int:
    return _save_leads_with_dedup(app, SEED_IMPORTERS)


def seed_wb_mills(app) -> int:
    return _save_leads_with_dedup(app, SEED_WB_MILLS)

