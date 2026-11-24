"""Crawler management, scraping triggers, and seed endpoints."""

from flask import current_app, jsonify, request
from app.db import get_db, db
from app.models import ScrapeJob
import app.routes.api as api_routes


def register_crawler_routes(bp):
    @bp.route("/crawler/history", methods=["GET"])
    def get_crawler_history():
        """Returns extraction history records with custom audit labels and crawl job summaries."""
        mongo_db = get_db()
        history = []
        seen_ids = set()

        for doc in mongo_db.crawler_jobs.find({}).sort("job_id", -1).limit(50):
            d = dict(doc)
            d["_id"] = str(d["_id"])
            d.pop("logs", None)
            seen_ids.add(d.get("job_id"))
            history.append(d)

        for h in mongo_db.extraction_history.find({}).sort("created_at", -1).limit(50):
            d = dict(h)
            d["_id"] = str(d["_id"])
            if d.get("job_id") not in seen_ids:
                history.append(d)

        return jsonify({
            "total": len(history),
            "history": history,
        })


    @bp.route("/crawler/sources", methods=["GET"])
    def get_crawler_sources_endpoint():
        from app.sources import get_all_sources
        mongo_db = get_db()
        conf = mongo_db.system_config.find_one({"_id": "singleton_config"}) or {}
        disabled_ids = set(conf.get("disabled_sources") or [])

        lead_type = request.args.get("lead_type")
        country = request.args.get("country")
        sources = get_all_sources(lead_type=lead_type, country=country)

        enriched_sources = []
        for s in sources:
            item = dict(s)
            item["enabled"] = item.get("id") not in disabled_ids
            enriched_sources.append(item)

        imp_sources = [s for s in enriched_sources if s["lead_type"] == "importer"]
        sup_sources = [s for s in enriched_sources if s["lead_type"] == "supplier"]
        return jsonify({
            "total_sources": len(enriched_sources),
            "importer_sources_count": len(imp_sources),
            "supplier_sources_count": len(sup_sources),
            "disabled_count": len(disabled_ids),
            "sources": enriched_sources,
        })


    @bp.route("/crawler/map-search", methods=["POST"])
    def google_maps_search():
        """Searches live Google Maps places for commercial trade leads."""
        data = request.get_json(silent=True) or {}
        query = (data.get("query") or "").strip()
        country = data.get("country")
        city = data.get("city")
        lat = data.get("lat") or data.get("latitude")
        lng = data.get("lng") or data.get("longitude")
        radius = int(data.get("radius") or data.get("radius_km") or 50)
        limit = int(data.get("limit") or 20)
        lead_type = (data.get("lead_type") or "importer").lower().strip()

        from app.map_extractor import search_google_maps_places
        places = search_google_maps_places(
            query=query,
            country=country,
            city=city,
            lat=float(lat) if lat is not None else None,
            lng=float(lng) if lng is not None else None,
            radius_km=radius,
            limit=limit,
            lead_type=lead_type,
        )
        return jsonify({
            "query": query,
            "lead_type": lead_type,
            "country": country,
            "total_found": len(places),
            "places": places,
        })


    @bp.route("/crawler/map-extract", methods=["POST"])
    def google_maps_extract():
        """Converts and saves Google Maps places into deduplicated database leads."""
        data = request.get_json(silent=True) or {}
        places = data.get("places") or []
        custom_label = (data.get("custom_label") or "").strip() or "Google Maps Live Extraction"
        extraction_notes = (data.get("extraction_notes") or "").strip()
        lead_type = (data.get("lead_type") or "importer").lower().strip()

        # If places array is empty but a query is given, execute search and extract in one go
        if not places and data.get("query"):
            from app.map_extractor import search_google_maps_places
            places = search_google_maps_places(
                query=data.get("query"),
                country=data.get("country"),
                city=data.get("city"),
                radius_km=int(data.get("radius") or 50),
                limit=int(data.get("limit") or 20),
                lead_type=lead_type,
            )

        if not places:
            return jsonify({"error": "No places provided or found to extract"}), 400

        from app.map_extractor import extract_places_to_leads
        saved_count = extract_places_to_leads(
            current_app._get_current_object(),
            places=places,
            custom_label=custom_label,
            extraction_notes=extraction_notes or f"Extracted {len(places)} places from Google Maps Live Extractor",
            lead_type=lead_type,
        )
        return jsonify({
            "message": f"Successfully extracted {len(places)} places into database",
            "custom_label": custom_label,
            "places_processed": len(places),
            "records_saved": saved_count,
        }), 201


    @bp.route("/scrape/importers", methods=["POST"])
    def trigger_importers_scrape():
        data = request.get_json(silent=True) or {}
        country = data.get("country")
        region = data.get("region")
        commodity = data.get("commodity")
        depth = int(data.get("depth", 30))
        selected_sources = data.get("selected_sources")
        job_id = api_routes.start_importer_scrape(
            current_app._get_current_object(),
            country=country,
            region=region,
            commodity=commodity,
            depth=depth,
            custom_city=data.get("custom_city") or data.get("city"),
            custom_lat=data.get("latitude") or data.get("lat"),
            custom_lng=data.get("longitude") or data.get("lng"),
            custom_label=data.get("custom_label"),
            extraction_notes=data.get("extraction_notes"),
            selected_sources=selected_sources,
        )
        return jsonify({
            "job_id": job_id,
            "status": "pending",
            "message": f"Global importer crawler dispatched for '{country or region or 'Global'}' (Depth: {depth} records)",
        }), 202


    @bp.route("/scrape/wb-mills", methods=["POST"])
    @bp.route("/scrape/suppliers", methods=["POST"])
    def trigger_wb_mills_scrape():
        data = request.get_json(silent=True) or {}
        country = data.get("country")
        region = data.get("region")
        commodity = data.get("commodity")
        depth = int(data.get("depth", 30))
        selected_sources = data.get("selected_sources")
        job_id = api_routes.start_wb_mills_scrape(
            current_app._get_current_object(),
            country=country,
            region=region,
            commodity=commodity,
            depth=depth,
            custom_city=data.get("custom_city") or data.get("city"),
            custom_lat=data.get("latitude") or data.get("lat"),
            custom_lng=data.get("longitude") or data.get("lng"),
            custom_label=data.get("custom_label"),
            extraction_notes=data.get("extraction_notes"),
            selected_sources=selected_sources,
        )
        return jsonify({
            "job_id": job_id,
            "status": "pending",
            "message": f"Commercial supplier crawler dispatched for '{country or region or 'Global'}' (Depth: {depth} records)",
        }), 202


    @bp.route("/scrape/crawl-now", methods=["POST"])
    def trigger_crawl_now():
        data = request.get_json(silent=True) or {}
        raw_type = (data.get("lead_type") or "all").lower().strip()
        country = data.get("country")
        region = data.get("region")
        commodity = data.get("commodity")
        depth = int(data.get("depth", 30))
        custom_city = data.get("custom_city") or data.get("city")
        custom_lat = data.get("latitude") or data.get("lat")
        custom_lng = data.get("longitude") or data.get("lng")
        custom_label = (data.get("custom_label") or "").strip() or "Standard Harvest"
        extraction_notes = (data.get("extraction_notes") or "").strip()
        selected_sources = data.get("selected_sources")
        custom_dork = (data.get("custom_dork") or "").strip() or None
        enable_proxy_shield = bool(data.get("enable_proxy_shield", True))
        app_obj = current_app._get_current_object()

        # STRICT TYPE SEPARATION: Never generate suppliers when importer is requested, and vice-versa
        if raw_type in ("importer", "importers", "buyer", "buyers"):
            job_id = api_routes.start_importer_scrape(
                app_obj,
                country=country,
                region=region,
                commodity=commodity,
                depth=depth,
                custom_city=custom_city,
                custom_lat=custom_lat,
                custom_lng=custom_lng,
                custom_label=custom_label,
                extraction_notes=extraction_notes,
                selected_sources=selected_sources,
                custom_dork=custom_dork,
                enable_proxy_shield=enable_proxy_shield,
            )
            return jsonify({
                "job_id": job_id,
                "status": "pending",
                "custom_label": custom_label,
                "message": f"Global importer crawler dispatched for country '{country or region or 'Global'}' (Strict Depth: {depth} records)",
            }), 202

        elif raw_type in ("supplier", "suppliers", "wb_mill", "wb_mills", "mill", "mills"):
            job_id = api_routes.start_wb_mills_scrape(
                app_obj,
                country=country,
                region=region,
                commodity=commodity,
                depth=depth,
                custom_city=custom_city,
                custom_lat=custom_lat,
                custom_lng=custom_lng,
                custom_label=custom_label,
                extraction_notes=extraction_notes,
                selected_sources=selected_sources,
                custom_dork=custom_dork,
                enable_proxy_shield=enable_proxy_shield,
            )
            return jsonify({
                "job_id": job_id,
                "status": "pending",
                "message": f"Commercial supplier crawler dispatched for country '{country or region or 'Global'}' (Strict Depth: {depth} records)",
            }), 202

        else:
            # Only when explicitly asked for 'all'
            imp_depth = max(1, depth // 2)
            sup_depth = max(1, depth // 2)
            imp_id = api_routes.start_importer_scrape(
                app_obj,
                country=country,
                region=region,
                commodity=commodity,
                depth=imp_depth,
                custom_city=custom_city,
                custom_lat=custom_lat,
                custom_lng=custom_lng,
                custom_label=custom_label,
                extraction_notes=extraction_notes,
                selected_sources=selected_sources,
                custom_dork=custom_dork,
                enable_proxy_shield=enable_proxy_shield,
            )
            sup_id = api_routes.start_wb_mills_scrape(
                app_obj,
                country=country,
                region=region,
                commodity=commodity,
                depth=sup_depth,
                custom_city=custom_city,
                custom_lat=custom_lat,
                custom_lng=custom_lng,
                custom_label=custom_label,
                extraction_notes=extraction_notes,
                selected_sources=selected_sources,
                custom_dork=custom_dork,
                enable_proxy_shield=enable_proxy_shield,
            )
            return jsonify({
                "importer_job_id": imp_id,
                "supplier_job_id": sup_id,
                "status": "pending",
                "message": f"Full-spectrum crawler dispatched for country '{country or region or 'Global'}' (Target Depth: {imp_depth + sup_depth} records)",
            }), 202


    @bp.route("/scrape/all", methods=["POST"])
    def trigger_all_scrape():
        data = request.get_json(silent=True) or {}
        country = data.get("country")
        region = data.get("region")
        commodity = data.get("commodity")
        depth = int(data.get("depth", 30))
        app_obj = current_app._get_current_object()
        imp_depth = max(1, depth // 2)
        sup_depth = max(1, depth // 2)
        imp_id = api_routes.start_importer_scrape(app_obj, country=country, region=region, commodity=commodity, depth=imp_depth)
        wb_id = api_routes.start_wb_mills_scrape(app_obj, country=country, region=region, commodity=commodity, depth=sup_depth)
        return jsonify({
            "importer_job_id": imp_id,
            "wb_mills_job_id": wb_id,
            "status": "pending",
            "message": f"All scraper jobs dispatched for '{country or region or 'Global'}' (Total Depth: {imp_depth + sup_depth})",
        }), 202


    @bp.route("/scrape/status", methods=["GET"])
    def get_scrape_status():
        jobs = ScrapeJob.query.order_by(ScrapeJob.id.desc()).limit(20).all()
        return jsonify({"jobs": [job.to_dict() for job in jobs]})


    @bp.route("/scrape/jobs/<int:job_id>", methods=["GET"])
    def get_scrape_job_detail(job_id: int):
        """Returns real-time crawler job progress, active stage, and live streaming audit logs."""
        mongo_db = get_db()
        c_job = mongo_db.crawler_jobs.find_one({"job_id": job_id})
        if c_job:
            c_job["_id"] = str(c_job["_id"])
            return jsonify({"job": c_job})

        # Fallback to SQLite ScrapeJob
        sq_job = db.session.get(ScrapeJob, job_id)
        if sq_job:
            data = sq_job.to_dict()
            data["progress_pct"] = 100 if data["status"] == "completed" else (15 if data["status"] == "running" else 0)
            data["current_step"] = "Completed" if data["status"] == "completed" else "Processing..."
            data["logs"] = []
            return jsonify({"job": data})

        return jsonify({"error": "Job not found"}), 404


    @bp.route("/scrape/jobs/live", methods=["GET"])
    def get_live_scrape_job():
        """Returns the most recent or actively running crawler job for live UI observation."""
        mongo_db = get_db()
        # First check for any running job
        active = mongo_db.crawler_jobs.find_one({"status": "running"}, sort=[("job_id", -1)])
        if not active:
            active = mongo_db.crawler_jobs.find_one({}, sort=[("job_id", -1)])

        if active:
            active["_id"] = str(active["_id"])
            return jsonify({"job": active})

        return jsonify({"job": None})


    @bp.route("/seed/importers", methods=["POST"])
    def seed_importers_endpoint():
        count = api_routes.seed_importers(current_app._get_current_object())
        return jsonify({
            "count": count,
            "message": f"Successfully loaded {count} verified Middle East importers into database",
        }), 201


    @bp.route("/seed/wb-mills", methods=["POST"])
    def seed_wb_mills_endpoint():
        count = api_routes.seed_wb_mills(current_app._get_current_object())
        return jsonify({
            "count": count,
            "message": f"Successfully loaded {count} verified commercial suppliers into database",
        }), 201


    @bp.route("/seed/demo", methods=["POST"])
    def seed_demo_endpoint():
        """Explicit endpoint to populate realistic demo data into MongoDB ONLY upon explicit user demand."""
        from app.db import seed_demo_data
        stats = seed_demo_data()
        return jsonify({
            "message": "Demo trade data seeded successfully into MongoDB",
            "inserted": stats,
        }), 201
