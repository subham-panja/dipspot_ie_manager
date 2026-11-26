"""RecruitIn X-Ray search query generator, SERP scraper, and lead enrichment routes."""

import logging
import urllib.parse
from typing import Any, List, Optional, Tuple
from flask import Blueprint, jsonify, request

from app.contacts_service import (
    ContactConflictError,
    serialize_contacts_batch,
    upsert_and_link_contact,
)
from app.db import get_db, now_iso
from app.models import Lead, db
from app.routes.api_helpers import find_mongo_lead, serialize_mongo_lead
from app.scraper.scraper_class import RealisticWebScraper
from app.scraper.xray_providers import build_genuine_fallbacks
from app.scraper.xray_search import (
    DEFAULT_DECISION_MAKER_TITLES,
    build_xray_query,
)

logger = logging.getLogger(__name__)


def _parse_list_param(raw_val: Any) -> Optional[List[str]]:
    if isinstance(raw_val, str):
        items = [x.strip() for x in raw_val.split(",") if x.strip()]
        return items or None
    if isinstance(raw_val, list):
        items = [str(x).strip() for x in raw_val if x and str(x).strip()]
        return items or None
    return None


def _parse_bool(val: Any) -> bool:
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val != 0
    if isinstance(val, str):
        return val.strip().lower() in {"1", "true", "yes", "on"}
    return False


def _parse_max_results(raw_val: Any, default: int = 10) -> int:
    if raw_val is None or raw_val == "":
        return default
    try:
        return min(max(1, int(raw_val)), 20)
    except (ValueError, TypeError):
        return default


def _extract_request_data() -> Tuple[Optional[dict], Optional[tuple]]:
    if request.method == "POST":
        raw_json = request.get_json(silent=True)
        if raw_json is not None and not isinstance(raw_json, dict):
            return None, (jsonify({"error": "JSON object body required"}), 400)
        return (raw_json or {}), None
    return request.args.to_dict(), None


def register_xray_routes(bp: Blueprint):
    @bp.route("/xray/query", methods=["GET", "POST"])
    def generate_xray_query():
        """Constructs targeted Boolean X-ray search queries for professional profiles."""
        data, err_resp = _extract_request_data()
        if err_resp:
            return err_resp

        company_name = str(data.get("company_name") or "").strip()
        country = str(data.get("country") or "").strip()
        platform = str(data.get("platform") or "linkedin").strip() or "linkedin"

        job_titles = _parse_list_param(data.get("job_titles"))
        keywords = _parse_list_param(data.get("keywords"))
        exclusions = _parse_list_param(data.get("exclusions"))

        query = build_xray_query(
            company_name=company_name,
            job_titles=job_titles,
            country=country,
            platform=platform,
            keywords=keywords,
            exclusions=exclusions,
        )

        quoted_q = urllib.parse.quote_plus(query)
        return jsonify({
            "success": True,
            "query": query,
            "encoded_query": quoted_q,
            "company_name": company_name,
            "country": country,
            "platform": platform,
            "job_titles": job_titles or DEFAULT_DECISION_MAKER_TITLES,
            "search_urls": {
                "duckduckgo": f"https://duckduckgo.com/?q={quoted_q}",
                "bing": f"https://www.bing.com/search?q={quoted_q}",
                "google": f"https://www.google.com/search?q={quoted_q}",
            },
        })

    @bp.route("/xray/search", methods=["POST", "GET"])
    def search_xray():
        """Executes live RecruitIn X-ray search via DDG, Bing, and Google with zero-mock fallbacks."""
        data, err_resp = _extract_request_data()
        if err_resp:
            return err_resp

        company_name = str(data.get("company_name") or "").strip()
        if not company_name:
            return jsonify({"error": "company_name is required"}), 400

        country = str(data.get("country") or "").strip()
        platform = str(data.get("platform") or "linkedin").strip() or "linkedin"
        max_results = _parse_max_results(data.get("max_results"), default=10)

        job_titles = _parse_list_param(data.get("job_titles"))
        keywords = _parse_list_param(data.get("keywords"))
        exclusions = _parse_list_param(data.get("exclusions"))

        query = build_xray_query(
            company_name=company_name,
            job_titles=job_titles,
            country=country,
            platform=platform,
            keywords=keywords,
            exclusions=exclusions,
        )

        scraper = RealisticWebScraper(enable_proxy_shield=False)
        profiles = scraper.search_xray_profiles(
            company_name=company_name,
            country=country,
            job_titles=job_titles,
            platform=platform,
            max_results=max_results,
            keywords=keywords,
            exclusions=exclusions,
        )

        fallback_used = len(profiles) == 0
        engine_used = (getattr(scraper, "last_xray_engine", "") or "duckduckgo") if profiles else "fallback"
        search_status = getattr(scraper, "last_xray_status", "") or ("live_results" if profiles else "no_results")

        website = str(data.get("website") or "").strip()
        fallbacks = build_genuine_fallbacks(
            company_name=company_name,
            country=country,
            website=website,
            platform=platform,
            strict_query=query,
            status=search_status,
        )

        persisted_contacts = []
        lead_id = data.get("lead_id")
        if _parse_bool(data.get("persist")) and lead_id and profiles:
            mongo_db = get_db()
            lead_doc = find_mongo_lead(mongo_db, lead_id)
            if lead_doc and not lead_doc.get("is_deleted"):
                source_tag = "xray_linkedin" if platform.lower() == "linkedin" else f"xray_{platform.lower()}"
                seen_cids = set()
                persisted_docs = []
                for p in profiles:
                    payload = {
                        "full_name": p.get("name") or "",
                        "job_title": p.get("title") or "",
                        "role_at_company": p.get("title") or "",
                        "company_name": company_name,
                        "linkedin_profile_url": p.get("profile_url") or "",
                        "verified": True,
                    }
                    try:
                        c_doc, _ = upsert_and_link_contact(
                            mongo_db,
                            payload,
                            lead_doc=lead_doc,
                            source=source_tag,
                        )
                    except ContactConflictError as exc:
                        logger.warning("Skipping conflicting X-ray contact %s: %s", payload.get("linkedin_profile_url"), exc)
                        continue
                    cid = c_doc.get("contact_id")
                    if cid and cid not in seen_cids:
                        seen_cids.add(cid)
                        persisted_docs.append(c_doc)
                persisted_contacts = serialize_contacts_batch(mongo_db, persisted_docs)

        return jsonify({
            "success": True,
            "company_name": company_name,
            "country": country,
            "platform": platform,
            "query": query,
            "engine_used": engine_used,
            "status": search_status,
            "fallback_used": fallback_used,
            "count": len(profiles),
            "profiles": profiles,
            "persisted_contacts": persisted_contacts,
            "fallbacks": fallbacks,
        })

    @bp.route("/leads/<lead_id>/enrich", methods=["POST"])
    def enrich_single_lead(lead_id):
        """Enriches a specific lead with multi-channel communication sources using X-ray discovery."""
        mongo_db = get_db()
        lead = find_mongo_lead(mongo_db, lead_id)
        if not lead or lead.get("is_deleted"):
            return jsonify({"error": f"Lead {lead_id} not found"}), 404

        scraper = RealisticWebScraper(enable_proxy_shield=False)
        enriched_data = scraper.enrich_lead_multichannel(lead, target_country=lead.get("country") or "")

        channel_keys = [
            "primary_email",
            "secondary_email",
            "direct_phone",
            "whatsapp_url",
            "whatsapp_outreach_url",
            "linkedin_persona_url",
            "linkedin_search_url",
            "corporate_contact_page_url",
            "contact_person",
            "address",
        ]
        updates = {k: enriched_data[k] for k in channel_keys if k in enriched_data}
        updates["updated_at"] = now_iso()

        mongo_db.leads.update_one({"_id": lead["_id"]}, {"$set": updates})
        updated_doc = find_mongo_lead(mongo_db, lead_id)

        try:
            sq_id = int(lead.get("id")) if isinstance(lead.get("id"), (int, float)) else None
            if sq_id:
                sq_lead = db.session.get(Lead, sq_id)
                if sq_lead:
                    for k in ["contact_person", "address"]:
                        if k in updates and hasattr(sq_lead, k):
                            setattr(sq_lead, k, updates[k])
                    db.session.commit()
        except Exception:
            pass

        return jsonify({
            "success": True,
            "lead": serialize_mongo_lead(updated_doc),
            "message": "Lead enriched successfully with multi-channel communication sources",
        })
