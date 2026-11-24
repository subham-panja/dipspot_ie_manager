"""Dashboard statistics and CSV/JSON export endpoints."""

import csv
import io
import json
import re
import urllib.parse
from bson import ObjectId
from flask import Response, jsonify, request
from app.db import get_db
from app.routes.api_helpers import CSV_EXPORT_FIELDS, parse_sort_param, serialize_mongo_lead


def register_export_stats_routes(bp):
    @bp.route("/dashboard/stats", methods=["GET"])
    def get_dashboard_stats():
        mongo_db = get_db()
        total_leads = mongo_db.leads.count_documents({})
        importers_count = mongo_db.leads.count_documents({"lead_type": "importer"})
        wb_mills_count = mongo_db.leads.count_documents({"lead_type": {"$ne": "importer"}})

        country_pipeline = [
            {"$match": {"country": {"$exists": True, "$ne": ""}}},
            {"$group": {"_id": "$country", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        countries = [{"name": c["_id"], "count": c["count"]} for c in mongo_db.leads.aggregate(country_pipeline)]

        district_pipeline = [
            {"$match": {"lead_type": {"$ne": "importer"}, "district": {"$exists": True, "$ne": ""}}},
            {"$group": {"_id": "$district", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        districts = [{"name": d["_id"], "count": d["count"]} for d in mongo_db.leads.aggregate(district_pipeline)]

        leads_with_email = mongo_db.leads.count_documents({"emails": {"$exists": True, "$ne": ""}})
        leads_with_phone = mongo_db.leads.count_documents({"phones": {"$exists": True, "$ne": ""}})

        deals = list(mongo_db.deals.find({}))
        pipeline_val = sum(float(d.get("value_usd", 0)) for d in deals)
        pipeline_qty = sum(float(d.get("quantity_mt", 0)) for d in deals)
        won_deals = [d for d in deals if d.get("stage_id") == "closed_won"]
        active_deals = [d for d in deals if d.get("stage_id") not in ("closed_won", "closed_lost")]

        shipments = list(mongo_db.shipments.find({}))
        in_transit = len([s for s in shipments if not s.get("is_delivered")])

        campaigns = list(mongo_db.campaigns.find({}))
        total_enrolled = sum(c.get("enrolled_leads_count", 0) for c in campaigns)

        mongo_stats = {
            "total_deals": len(deals),
            "active_deals_count": len(active_deals),
            "won_deals_count": len(won_deals),
            "pipeline_value_usd": round(pipeline_val, 2),
            "pipeline_quantity_mt": round(pipeline_qty, 2),
            "active_shipments_count": in_transit,
            "total_campaigns_count": len(campaigns),
            "total_campaign_enrolled": total_enrolled,
        }

        return jsonify({
            "total_leads": total_leads,
            "importers_count": importers_count,
            "wb_mills_count": wb_mills_count,
            "leads_with_email": leads_with_email,
            "leads_with_phone": leads_with_phone,
            "countries": countries,
            "districts": districts,
            "pipeline": mongo_stats,
        })


    @bp.route("/leads/export", methods=["GET"])
    @bp.route("/leads/export/<export_format>", methods=["GET"])
    def export_leads(export_format: str = "csv"):
        """
        Advanced filtered and multi-format export endpoint.
        Supports CSV, JSON, and TSV formats.
        Supports selective ID export via comma-separated 'ids' query parameter (Twenty CRM pattern).
        Respects all active filter parameters (country, port, tier, score, search, etc.).
        """
        import json
        mongo_db = get_db()
        fmt = (request.args.get("format") or export_format or "csv").lower().strip()
        include_deleted = request.args.get("include_deleted", "").lower() == "true"
        filter_q = {} if include_deleted else {"is_deleted": {"$ne": True}}

        # Selective ID export (for Twenty-style multi-select row checkboxes)
        ids_param = request.args.get("ids", "").strip()
        if ids_param:
            id_tokens = [t.strip() for t in ids_param.split(",") if t.strip()]
            id_conditions = []
            for t in id_tokens:
                try:
                    id_conditions.append({"id": int(t)})
                except (ValueError, TypeError):
                    pass
                id_conditions.append({"id": str(t)})
                if ObjectId.is_valid(t):
                    id_conditions.append({"_id": ObjectId(t)})
            if id_conditions:
                filter_q["$or"] = id_conditions
        else:
            lead_type = request.args.get("lead_type")
            if lead_type:
                filter_q["lead_type"] = lead_type

            country = request.args.get("country")
            if country:
                filter_q["country"] = {"$regex": re.escape(country), "$options": "i"}
            elif lead_type == "importer":
                filter_q["country"] = {"$ne": "India"}

            city = request.args.get("city") or request.args.get("city_or_hub")
            if city:
                filter_q["city_or_hub"] = {"$regex": re.escape(city), "$options": "i"}

            district = request.args.get("district")
            if district:
                filter_q["district"] = {"$regex": re.escape(district), "$options": "i"}

            state = request.args.get("state")
            if state:
                filter_q["state"] = {"$regex": re.escape(state), "$options": "i"}

            port = request.args.get("port") or request.args.get("nearest_port")
            if port:
                filter_q["$or"] = [
                    {"nearest_port": {"$regex": re.escape(port), "$options": "i"}},
                    {"address": {"$regex": re.escape(port), "$options": "i"}},
                    {"city_or_hub": {"$regex": re.escape(port), "$options": "i"}},
                ]

            tier = request.args.get("tier") or request.args.get("importer_tier")
            if tier:
                if tier.lower() in ("sme", "sme_importer", "1-3"):
                    filter_q["importer_tier"] = "sme_importer"
                else:
                    filter_q["importer_tier"] = {"$regex": re.escape(tier), "$options": "i"}

            manifest_only = request.args.get("manifest_only", "").lower() == "true"
            if manifest_only:
                filter_q["customs_manifest_data"] = {"$exists": True, "$ne": ""}

            deal_status = request.args.get("deal_status")
            if deal_status:
                filter_q["deal_status"] = deal_status

            min_score = request.args.get("min_score", type=int)
            if min_score is not None:
                filter_q["priority_score"] = {"$gte": min_score}

            custom_label = request.args.get("custom_label")
            if custom_label:
                filter_q["custom_label"] = {"$regex": re.escape(custom_label), "$options": "i"}

            job_id = request.args.get("job_id", type=int)
            if job_id is not None:
                filter_q["job_id"] = job_id

            search = request.args.get("search")
            if search:
                s_regex = {"$regex": re.escape(search), "$options": "i"}
                s_cond = [
                    {"company_name": s_regex},
                    {"matched_varieties": s_regex},
                    {"city_or_hub": s_regex},
                    {"contact_person": s_regex},
                    {"emails": s_regex},
                    {"phones": s_regex},
                    {"address": s_regex},
                ]
                if "$or" in filter_q:
                    filter_q = {"$and": [filter_q, {"$or": s_cond}]}
                else:
                    filter_q["$or"] = s_cond

        sort_by = request.args.get("sort_by", "score_desc")
        sort_order = parse_sort_param(sort_by)
        cursor = mongo_db.leads.find(filter_q).sort(sort_order).limit(5000)
        leads = [serialize_mongo_lead(d) for d in cursor]

        lead_type_label = request.args.get("lead_type") or "all"
        if fmt == "json":
            return Response(
                json.dumps(leads, indent=2),
                mimetype="application/json",
                headers={"Content-Disposition": f"attachment; filename=trade_leads_{lead_type_label}.json"},
            )
        elif fmt == "tsv":
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=CSV_EXPORT_FIELDS, extrasaction="ignore", delimiter="\t")
            writer.writeheader()
            for lead in leads:
                writer.writerow(lead)
            return Response(
                output.getvalue(),
                mimetype="text/tab-separated-values",
                headers={"Content-Disposition": f"attachment; filename=trade_leads_{lead_type_label}.tsv"},
            )
        else:  # csv
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=CSV_EXPORT_FIELDS, extrasaction="ignore")
            writer.writeheader()
            for lead in leads:
                writer.writerow(lead)
            return Response(
                output.getvalue(),
                mimetype="text/csv",
                headers={"Content-Disposition": f"attachment; filename=trade_leads_{lead_type_label}.csv"},
            )

