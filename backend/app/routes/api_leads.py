"""Lead CRUD endpoints."""

import re
import uuid
from flask import jsonify, request
from app.db import get_db, now_iso
from app.models import Lead, db
from app.routes.api_helpers import (
    find_mongo_lead,
    paginate_cursor,
    serialize_mongo_lead,
    sync_lead_to_sqlite,
)


def register_lead_routes(bp):
    @bp.route("/leads", methods=["GET"])
    def get_leads():
        mongo_db = get_db()
        include_deleted = request.args.get("include_deleted", "").lower() == "true"
        filter_q = {} if include_deleted else {"is_deleted": {"$ne": True}}

        lead_type = request.args.get("lead_type")
        if lead_type:
            filter_q["lead_type"] = lead_type

        job_id = request.args.get("job_id", type=int)
        if job_id is not None:
            filter_q["job_id"] = job_id

        custom_label = request.args.get("custom_label")
        if custom_label:
            filter_q["custom_label"] = {"$regex": re.escape(custom_label), "$options": "i"}

        country = request.args.get("country")
        if country:
            filter_q["country"] = {"$regex": re.escape(country), "$options": "i"}
        elif lead_type == "importer":
            filter_q["country"] = {"$ne": "India"}

        district = request.args.get("district")
        if district:
            filter_q["district"] = {"$regex": re.escape(district), "$options": "i"}

        search = request.args.get("search")
        if search:
            s_regex = {"$regex": re.escape(search), "$options": "i"}
            filter_q["$or"] = [
                {"company_name": s_regex},
                {"contact_person": s_regex},
                {"emails": s_regex},
                {"phones": s_regex},
                {"address": s_regex},
                {"matched_varieties": s_regex},
                {"gstin": s_regex},
            ]

        min_score = request.args.get("min_score", type=int)
        if min_score is not None:
            filter_q["priority_score"] = {"$gte": min_score}

        leads, total, page, pages, per_page = paginate_cursor(mongo_db, filter_q, default_per_page=50)
        return jsonify({
            "leads": leads,
            "total": total,
            "page": page,
            "pages": pages,
            "per_page": per_page,
        })

    @bp.route("/leads/importers", methods=["GET"])
    def get_importers():
        mongo_db = get_db()
        include_deleted = request.args.get("include_deleted", "").lower() == "true"
        filter_q = {"lead_type": "importer"} if include_deleted else {"lead_type": "importer", "is_deleted": {"$ne": True}}

        country = request.args.get("country")
        if country:
            filter_q["country"] = {"$regex": re.escape(country), "$options": "i"}
        else:
            filter_q["country"] = {"$ne": "India"}

        city = request.args.get("city")
        if city:
            filter_q["city_or_hub"] = {"$regex": re.escape(city), "$options": "i"}

        port = request.args.get("port")
        if port:
            filter_q["$or"] = [
                {"nearest_port": {"$regex": re.escape(port), "$options": "i"}},
                {"address": {"$regex": re.escape(port), "$options": "i"}},
                {"city_or_hub": {"$regex": re.escape(port), "$options": "i"}},
            ]

        tier = request.args.get("tier")
        if tier and tier.lower() in ("sme", "sme_importer", "1-3"):
            filter_q["importer_tier"] = "sme_importer"

        if request.args.get("manifest_only", "").lower() == "true":
            filter_q["customs_manifest_data"] = {"$exists": True, "$ne": ""}

        commodity = request.args.get("commodity")
        if commodity:
            filter_q["matched_varieties"] = {"$regex": re.escape(commodity), "$options": "i"}

        search = request.args.get("search")
        if search:
            s_regex = {"$regex": re.escape(search), "$options": "i"}
            filter_q["$or"] = [
                {"company_name": s_regex},
                {"contact_person": s_regex},
                {"emails": s_regex},
                {"phones": s_regex},
                {"address": s_regex},
                {"matched_varieties": s_regex},
            ]

        min_score = request.args.get("min_score", type=int)
        if min_score is not None:
            filter_q["priority_score"] = {"$gte": min_score}

        custom_label = request.args.get("custom_label")
        if custom_label:
            filter_q["custom_label"] = {"$regex": re.escape(custom_label), "$options": "i"}

        job_id = request.args.get("job_id", type=int)
        if job_id is not None:
            filter_q["job_id"] = job_id

        importers, total, page, pages, per_page = paginate_cursor(mongo_db, filter_q, default_per_page=25)

        all_importers = list(mongo_db.leads.find({"lead_type": "importer"}))
        country_counts = {}
        total_score = 0
        high_priority_cnt = 0
        for imp in all_importers:
            c = imp.get("country") or "Unknown"
            country_counts[c] = country_counts.get(c, 0) + 1
            ps = int(imp.get("priority_score") or 0)
            total_score += ps
            if ps >= 80:
                high_priority_cnt += 1

        top_countries = sorted(
            [{"country": k, "count": v} for k, v in country_counts.items()],
            key=lambda x: x["count"],
            reverse=True,
        )[:6]
        avg_score = round(total_score / max(len(all_importers), 1), 1) if all_importers else 0

        return jsonify({
            "importers": importers,
            "leads": importers,
            "total": total,
            "page": page,
            "pages": pages,
            "per_page": per_page,
            "aggregations": {
                "total_importers": len(all_importers),
                "high_priority_count": high_priority_cnt,
                "avg_priority_score": avg_score,
                "top_countries": top_countries,
            },
        })

    @bp.route("/leads/suppliers", methods=["GET"])
    def get_suppliers():
        mongo_db = get_db()
        include_deleted = request.args.get("include_deleted", "").lower() == "true"
        filter_q = {"lead_type": {"$ne": "importer"}} if include_deleted else {"lead_type": {"$ne": "importer"}, "is_deleted": {"$ne": True}}

        country = request.args.get("country")
        if country:
            filter_q["country"] = {"$regex": re.escape(country), "$options": "i"}

        district = request.args.get("district")
        if district:
            filter_q["district"] = {"$regex": re.escape(district), "$options": "i"}

        state = request.args.get("state")
        if state:
            filter_q["state"] = {"$regex": re.escape(state), "$options": "i"}

        commodity = request.args.get("commodity")
        if commodity:
            filter_q["matched_varieties"] = {"$regex": re.escape(commodity), "$options": "i"}

        search = request.args.get("search")
        if search:
            s_regex = {"$regex": re.escape(search), "$options": "i"}
            filter_q["$or"] = [
                {"company_name": s_regex},
                {"contact_person": s_regex},
                {"emails": s_regex},
                {"phones": s_regex},
                {"address": s_regex},
                {"gstin": s_regex},
            ]

        min_score = request.args.get("min_score", type=int)
        if min_score is not None:
            filter_q["priority_score"] = {"$gte": min_score}

        custom_label = request.args.get("custom_label")
        if custom_label:
            filter_q["custom_label"] = {"$regex": re.escape(custom_label), "$options": "i"}

        job_id = request.args.get("job_id", type=int)
        if job_id is not None:
            filter_q["job_id"] = job_id

        suppliers, total, page, pages, per_page = paginate_cursor(mongo_db, filter_q, default_per_page=25)

        all_suppliers = list(mongo_db.leads.find({"lead_type": {"$ne": "importer"}}))
        dist_counts = {}
        verified_gst_cnt = 0
        for s in all_suppliers:
            d = s.get("district") or s.get("city_or_hub") or "Regional Hub"
            dist_counts[d] = dist_counts.get(d, 0) + 1
            if s.get("gstin"):
                verified_gst_cnt += 1

        top_districts = sorted(
            [{"district": k, "count": v} for k, v in dist_counts.items()],
            key=lambda x: x["count"],
            reverse=True,
        )[:6]

        return jsonify({
            "suppliers": suppliers,
            "leads": suppliers,
            "total": total,
            "page": page,
            "pages": pages,
            "per_page": per_page,
            "aggregations": {
                "total_suppliers": len(all_suppliers),
                "verified_gst_count": verified_gst_cnt,
                "top_districts": top_districts,
            },
        })

    @bp.route("/leads", methods=["POST"])
    def create_lead():
        mongo_db = get_db()
        data = request.get_json() or {}
        if not data.get("company_name"):
            return jsonify({"error": "company_name is required"}), 400

        last_doc = mongo_db.leads.find_one({}, sort=[("id", -1)])
        next_id = int(last_doc["id"]) + 1 if last_doc and isinstance(last_doc.get("id"), (int, float)) else 1

        fields = [
            "company_name", "country", "city_or_hub", "contact_person", "phones", "emails",
            "website", "address", "matched_varieties", "hs_codes_applicable", "inquiry_or_profile",
            "source_url", "gstin", "pan", "fssai_or_sfda_status", "state", "district",
            "category_or_role", "nearest_port", "shipment_volume", "importer_tier",
            "custom_label", "twitter_url", "linkedin_company_url", "primary_email",
            "secondary_email", "direct_phone", "whatsapp_url", "whatsapp_outreach_url",
            "linkedin_persona_url", "linkedin_profile_url", "corporate_contact_page_url",
            "contact_page_url", "github_url"
        ]
        doc = {
            "id": next_id,
            "priority_score": int(data.get("priority_score", 0)),
            "lead_type": data.get("lead_type", "importer"),
            "deal_status": data.get("deal_status", "unassigned"),
            "created_at": now_iso(),
            "updated_at": now_iso()
        }
        for f in fields:
            doc[f] = data.get(f, "").strip()

        res = mongo_db.leads.insert_one(doc)
        doc["_id"] = res.inserted_id
        sync_lead_to_sqlite(doc, db, Lead)
        return jsonify({"lead": serialize_mongo_lead(doc), "message": "Lead created successfully"}), 201

    @bp.route("/leads/<lead_id>", methods=["GET"])
    def get_lead(lead_id):
        mongo_db = get_db()
        doc = find_mongo_lead(mongo_db, lead_id)
        if not doc:
            try:
                lead_sq = db.session.get(Lead, int(lead_id))
                if lead_sq:
                    return jsonify({"lead": lead_sq.to_dict()})
            except Exception:
                pass
            return jsonify({"error": "Lead not found"}), 404

        include_deleted = request.args.get("include_deleted", "").lower() == "true"
        if doc.get("is_deleted") and not include_deleted:
            return jsonify({"error": "Lead not found"}), 404

        return jsonify({"lead": serialize_mongo_lead(doc)})

    @bp.route("/leads/<lead_id>", methods=["PUT", "PATCH"])
    def update_lead(lead_id):
        mongo_db = get_db()
        lead = find_mongo_lead(mongo_db, lead_id)
        if not lead:
            return jsonify({"error": "Lead not found"}), 404

        data = request.get_json() or {}
        allowed_fields = [
            "company_name", "lead_type", "country", "city_or_hub", "contact_person",
            "phones", "emails", "website", "address", "matched_varieties",
            "hs_codes_applicable", "inquiry_or_profile", "priority_score", "deal_status",
            "gstin", "pan", "fssai_or_sfda_status", "district", "state",
            "nearest_port", "shipment_volume", "importer_tier", "custom_label",
            "primary_email", "secondary_email", "direct_phone", "whatsapp_url",
            "whatsapp_outreach_url", "linkedin_persona_url", "linkedin_profile_url",
            "corporate_contact_page_url", "contact_page_url", "github_url",
        ]
        updates = {k: data[k] for k in allowed_fields if k in data}
        updates["updated_at"] = now_iso()

        mongo_db.leads.update_one({"_id": lead["_id"]}, {"$set": updates})
        updated = find_mongo_lead(mongo_db, lead_id)

        try:
            sq_id = int(lead.get("id")) if isinstance(lead.get("id"), (int, float)) else None
            if sq_id:
                sq_lead = db.session.get(Lead, sq_id)
                if sq_lead:
                    for k, v in updates.items():
                        if hasattr(sq_lead, k):
                            setattr(sq_lead, k, v)
                    db.session.commit()
        except Exception:
            pass

        return jsonify({"lead": serialize_mongo_lead(updated), "message": "Lead updated successfully"})

    @bp.route("/leads/<lead_id>", methods=["DELETE"])
    def delete_lead(lead_id):
        mongo_db = get_db()
        lead = find_mongo_lead(mongo_db, lead_id)
        if not lead:
            return jsonify({"error": "Lead not found"}), 404

        permanent = request.args.get("permanent", "").lower() == "true"
        if permanent:
            mongo_db.leads.delete_one({"_id": lead["_id"]})
            try:
                sq_id = int(lead.get("id")) if isinstance(lead.get("id"), (int, float)) else None
                if sq_id:
                    sq_lead = db.session.get(Lead, sq_id)
                    if sq_lead:
                        db.session.delete(sq_lead)
                        db.session.commit()
            except Exception:
                pass
            return jsonify({"message": f"Lead {lead.get('company_name', lead_id)} permanently deleted"})
        else:
            mongo_db.leads.update_one(
                {"_id": lead["_id"]},
                {"$set": {"is_deleted": True, "deleted_at": now_iso(), "deal_status": "trashed"}}
            )
            return jsonify({
                "message": f"Lead {lead.get('company_name', lead_id)} moved to trash",
                "lead_id": lead_id,
                "is_deleted": True,
            })

    @bp.route("/leads/<lead_id>/restore", methods=["POST"])
    def restore_lead(lead_id):
        mongo_db = get_db()
        lead = find_mongo_lead(mongo_db, lead_id)
        if not lead:
            return jsonify({"error": "Lead not found"}), 404
        mongo_db.leads.update_one(
            {"_id": lead["_id"]},
            {"$set": {"is_deleted": False, "deleted_at": None, "deal_status": "unassigned"}}
        )
        return jsonify({"message": f"Lead {lead.get('company_name', lead_id)} restored successfully"})

    @bp.route("/leads/trash", methods=["GET"])
    def get_trash_leads():
        mongo_db = get_db()
        docs = mongo_db.leads.find({"is_deleted": True}).sort("deleted_at", -1)
        leads = [serialize_mongo_lead(d) for d in docs]
        return jsonify({"leads": leads, "total": len(leads)})

    @bp.route("/leads/<lead_id>/convert-to-deal", methods=["POST"])
    def convert_lead_to_deal(lead_id):
        mongo_db = get_db()
        lead = find_mongo_lead(mongo_db, lead_id)
        if not lead:
            return jsonify({"error": "Lead not found"}), 404

        data = request.get_json() or {}
        deal_id = f"DEAL-{uuid.uuid4().hex[:8].upper()}"
        company_name = data.get("company_name") or lead.get("company_name", "Unknown")
        deal_doc = {
            "deal_id": deal_id,
            "lead_id": str(lead.get("id") or lead.get("_id")),
            "company_name": company_name,
            "country": lead.get("country", ""),
            "deal_stage": data.get("deal_stage", "qualified"),
            "deal_value": float(data.get("deal_value", 0)),
            "commodity": data.get("commodity") or lead.get("matched_varieties", ""),
            "port": data.get("port") or lead.get("nearest_port", ""),
            "target_volume": data.get("target_volume", ""),
            "notes": data.get("notes", ""),
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        mongo_db.deals.insert_one(deal_doc)
        mongo_db.leads.update_one({"_id": lead["_id"]}, {"$set": {"deal_status": "in_pipeline"}})

        d = dict(deal_doc)
        d["_id"] = str(d["_id"])
        return jsonify({"deal": d, "message": f"Lead {company_name} converted to deal {deal_id}"}), 201
