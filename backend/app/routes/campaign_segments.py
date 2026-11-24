"""Audience segments and customer groups API endpoints."""

import uuid
from flask import jsonify, request
from app.db import get_db, now_iso
from app.routes.campaign_templates_data import DEFAULT_SEGMENTS

def serialize_doc(doc):
    if not doc:
        return None
    d = dict(doc)
    if "_id" in d:
        d["_id"] = str(d["_id"])
    return d


def build_segment_mongo_query(seg: dict) -> dict:
    q = {}
    if seg.get("lead_type") == "importer":
        q["lead_type"] = "importer"
    elif seg.get("lead_type") == "wb_mill":
        q["lead_type"] = {"$ne": "importer"}
    if seg.get("countries"):
        countries = seg["countries"]
        if isinstance(countries, str):
            countries = [c.strip() for c in countries.split(",") if c.strip()]
        if countries:
            q["country"] = {"$in": countries}
    if seg.get("min_score"):
        q["priority_score"] = {"$gte": int(seg["min_score"])}
    return q



def register_segment_routes(bp):
    @bp.route("/segments", methods=["GET"])
    def get_segments():
        db = get_db()
        count = db.customer_segments.count_documents({})
        if count == 0:
            db.customer_segments.insert_many(DEFAULT_SEGMENTS)

        segments = list(db.customer_segments.find({}).sort("created_at", -1))
        results = []
        for seg in segments:
            s_dict = serialize_doc(seg)
            mongo_q = build_segment_mongo_query(seg)
            s_dict["member_count"] = db.leads.count_documents(mongo_q)
            results.append(s_dict)

        return jsonify({"segments": results, "total": len(results)})


    @bp.route("/segments", methods=["POST"])
    def create_segment():
        db = get_db()
        data = request.get_json() or {}
        if not data.get("name"):
            return jsonify({"error": "Segment name is required"}), 400

        seg_id = data.get("segment_id") or f"SEG-{uuid.uuid4().hex[:6].upper()}"
        countries = data.get("countries", [])
        if isinstance(countries, str):
            countries = [c.strip() for c in countries.split(",") if c.strip()]

        tags = data.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]

        doc = {
            "segment_id": seg_id,
            "name": data["name"],
            "description": data.get("description", ""),
            "lead_type": data.get("lead_type", "importer"),
            "countries": countries,
            "min_score": int(data.get("min_score", 0)),
            "tags": tags,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        db.customer_segments.insert_one(doc)

        res_doc = serialize_doc(doc)
        mongo_q = build_segment_mongo_query(doc)
        res_doc["member_count"] = db.leads.count_documents(mongo_q)
        return jsonify({"segment": res_doc, "message": "Customer segment created successfully"}), 201


    @bp.route("/segments/<segment_id>", methods=["DELETE"])
    def delete_segment(segment_id):
        db = get_db()
        res = db.customer_segments.delete_one({"segment_id": segment_id})
        if res.deleted_count == 0:
            return jsonify({"error": "Segment not found"}), 404
        return jsonify({"message": f"Segment {segment_id} deleted successfully"})


    @bp.route("/segments/<segment_id>/leads", methods=["GET"])
    def get_segment_leads(segment_id):
        db = get_db()
        seg = db.customer_segments.find_one({"segment_id": segment_id})
        if not seg:
            return jsonify({"error": "Segment not found"}), 404

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        mongo_q = build_segment_mongo_query(seg)
        total = db.leads.count_documents(mongo_q)
        skip = (page - 1) * per_page
        pages = (total + per_page - 1) // per_page if total > 0 else 0

        from app.routes.api import serialize_mongo_lead
        cursor = db.leads.find(mongo_q).sort([("priority_score", -1), ("_id", -1)]).skip(skip).limit(per_page)
        leads = [serialize_mongo_lead(d) for d in cursor]

        return jsonify({
            "segment": serialize_doc(seg),
            "leads": leads,
            "total": total,
            "page": page,
            "pages": pages,
        })

