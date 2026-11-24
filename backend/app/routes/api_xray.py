"""RecruitIn X-Ray search query generator, SERP scraper, and lead enrichment routes."""

import logging
import urllib.parse
from flask import Blueprint, jsonify, request

from app.db import get_db, now_iso
from app.models import Lead, db
from app.routes.api_helpers import find_mongo_lead, serialize_mongo_lead
from app.scraper.scraper_class import RealisticWebScraper
from app.scraper.xray_search import (
    DEFAULT_DECISION_MAKER_TITLES,
    build_xray_query,
)

logger = logging.getLogger(__name__)


def register_xray_routes(bp: Blueprint):
    @bp.route("/xray/query", methods=["GET", "POST"])
    def generate_xray_query():
        """Constructs targeted Boolean X-ray search queries for professional profiles."""
        if request.method == "POST":
            data = request.get_json(silent=True) or {}
        else:
            data = request.args.to_dict()

        company_name = (data.get("company_name") or "").strip()
        country = (data.get("country") or "").strip()
        platform = (data.get("platform") or "linkedin").strip()

        raw_titles = data.get("job_titles")
        if isinstance(raw_titles, str):
            job_titles = [t.strip() for t in raw_titles.split(",") if t.strip()]
        elif isinstance(raw_titles, list):
            job_titles = [str(t).strip() for t in raw_titles if t and str(t).strip()]
        else:
            job_titles = None

        raw_kw = data.get("keywords")
        if isinstance(raw_kw, str):
            keywords = [k.strip() for k in raw_kw.split(",") if k.strip()]
        elif isinstance(raw_kw, list):
            keywords = [str(k).strip() for k in raw_kw if k and str(k).strip()]
        else:
            keywords = None

        raw_ex = data.get("exclusions")
        if isinstance(raw_ex, str):
            exclusions = [x.strip() for x in raw_ex.split(",") if x.strip()]
        elif isinstance(raw_ex, list):
            exclusions = [str(x).strip() for x in raw_ex if x and str(x).strip()]
        else:
            exclusions = None

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
        """Executes live RecruitIn X-ray search via DuckDuckGo and Bing for company personnel."""
        if request.method == "POST":
            data = request.get_json(silent=True) or {}
        else:
            data = request.args.to_dict()

        company_name = (data.get("company_name") or "").strip()
        if not company_name:
            return jsonify({"error": "company_name is required"}), 400

        country = (data.get("country") or "").strip()
        platform = (data.get("platform") or "linkedin").strip()
        try:
            max_results = min(int(data.get("max_results", 5)), 25)
        except (ValueError, TypeError):
            max_results = 5

        raw_titles = data.get("job_titles")
        if isinstance(raw_titles, str):
            job_titles = [t.strip() for t in raw_titles.split(",") if t.strip()]
        elif isinstance(raw_titles, list):
            job_titles = [str(t).strip() for t in raw_titles if t and str(t).strip()]
        else:
            job_titles = None

        raw_kw = data.get("keywords")
        if isinstance(raw_kw, str):
            keywords = [k.strip() for k in raw_kw.split(",") if k.strip()]
        elif isinstance(raw_kw, list):
            keywords = [str(k).strip() for k in raw_kw if k and str(k).strip()]
        else:
            keywords = None

        raw_ex = data.get("exclusions")
        if isinstance(raw_ex, str):
            exclusions = [x.strip() for x in raw_ex.split(",") if x.strip()]
        elif isinstance(raw_ex, list):
            exclusions = [str(x).strip() for x in raw_ex if x and str(x).strip()]
        else:
            exclusions = None

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

        return jsonify({
            "success": True,
            "company_name": company_name,
            "country": country,
            "platform": platform,
            "count": len(profiles),
            "profiles": profiles,
        })

    @bp.route("/leads/<lead_id>/enrich", methods=["POST"])
    def enrich_single_lead(lead_id):
        """Enriches a specific lead with multi-channel communication sources using X-ray discovery."""
        mongo_db = get_db()
        lead = find_mongo_lead(mongo_db, lead_id)
        if not lead:
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
