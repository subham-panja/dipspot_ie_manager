import uuid
from flask import Blueprint, jsonify, request
from app.db import get_db, now_iso

pipeline_bp = Blueprint("pipeline", __name__, url_prefix="/api/pipeline")


def serialize_doc(doc):
    if not doc:
        return None
    d = dict(doc)
    if "_id" in d:
        d["_id"] = str(d["_id"])
    return d


@pipeline_bp.route("/stages", methods=["GET"])
def get_pipeline_stages():
    db = get_db()
    stages = list(db.master_stages.find({"type": "pipeline"}).sort("order", 1))
    return jsonify({"stages": [serialize_doc(s) for s in stages]})


@pipeline_bp.route("/stages", methods=["POST"])
def create_pipeline_stage():
    db = get_db()
    data = request.get_json() or {}
    if not data.get("name"):
        return jsonify({"error": "Stage name is required"}), 400

    stage_id = data.get("stage_id") or data["name"].lower().replace(" ", "_").replace("/", "_")
    count = db.master_stages.count_documents({"type": "pipeline"})
    doc = {
        "type": "pipeline",
        "stage_id": stage_id,
        "name": data["name"],
        "order": data.get("order", count + 1),
        "color": data.get("color", "#64748b"),
        "description": data.get("description", ""),
        "is_active": True,
        "is_terminal": bool(data.get("is_terminal", False)),
        "created_at": now_iso(),
    }
    db.master_stages.update_one({"type": "pipeline", "stage_id": stage_id}, {"$set": doc}, upsert=True)
    return jsonify({"stage": doc, "message": "Stage created / updated"}), 201


@pipeline_bp.route("/deals", methods=["GET"])
def get_deals():
    db = get_db()
    query = {}
    stage_id = request.args.get("stage_id")
    if stage_id:
        query["stage_id"] = stage_id

    country = request.args.get("country")
    if country:
        query["country"] = {"$regex": country, "$options": "i"}

    search = request.args.get("search")
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}},
            {"commodity": {"$regex": search, "$options": "i"}},
        ]

    deals = list(db.deals.find(query).sort("updated_at", -1))
    serialized = [serialize_doc(d) for d in deals]

    # Calculate summary metrics
    total_val = sum(float(d.get("value_usd", 0)) for d in serialized)
    total_mt = sum(float(d.get("quantity_mt", 0)) for d in serialized)

    return jsonify({
        "deals": serialized,
        "total_deals": len(serialized),
        "total_pipeline_value_usd": round(total_val, 2),
        "total_quantity_mt": round(total_mt, 2),
    })


@pipeline_bp.route("/deals", methods=["POST"])
def create_deal():
    db = get_db()
    data = request.get_json() or {}
    if not data.get("title") or not data.get("company_name"):
        return jsonify({"error": "title and company_name are required"}), 400

    deal_id = data.get("deal_id") or f"DEAL-{now_iso()[:10].replace('-', '')}-{uuid.uuid4().hex[:4].upper()}"
    stage_id = data.get("stage_id", "inquiry")

    # Lookup stage name
    stage_doc = db.master_stages.find_one({"type": "pipeline", "stage_id": stage_id})
    stage_name = stage_doc.get("name") if stage_doc else "Inquiry / RFQ Received"

    notes = data.get("notes", [])
    if isinstance(notes, str) and notes:
        notes = [notes]

    doc = {
        "deal_id": deal_id,
        "title": data["title"],
        "company_name": data["company_name"],
        "country": data.get("country", ""),
        "lead_id": data.get("lead_id", ""),
        "stage_id": stage_id,
        "stage_name": stage_name,
        "commodity": data.get("commodity", "IR-64 Parboiled Rice"),
        "quantity_mt": float(data.get("quantity_mt", 100)),
        "value_usd": float(data.get("value_usd", 45000)),
        "incoterm": data.get("incoterm", "CIF Jebel Ali"),
        "payment_terms": data.get("payment_terms", "100% Irrevocable L/C at Sight"),
        "probability": int(data.get("probability", 50)),
        "expected_close_date": data.get("expected_close_date", ""),
        "notes": notes,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    db.deals.insert_one(doc)

    # If lead_id is provided, mark lead as in_pipeline
    if data.get("lead_id"):
        db.leads.update_one({"id": int(data["lead_id"]) if str(data["lead_id"]).isdigit() else data["lead_id"]}, {"$set": {"deal_status": "in_pipeline"}})

    return jsonify({"deal": serialize_doc(doc), "message": "Deal created successfully"}), 201


@pipeline_bp.route("/deals/<deal_id>", methods=["GET"])
def get_deal(deal_id):
    db = get_db()
    deal = db.deals.find_one({"deal_id": deal_id})
    if not deal:
        return jsonify({"error": "Deal not found"}), 404
    return jsonify({"deal": serialize_doc(deal)})


@pipeline_bp.route("/deals/<deal_id>", methods=["PATCH"])
def update_deal(deal_id):
    db = get_db()
    data = request.get_json() or {}
    deal = db.deals.find_one({"deal_id": deal_id})
    if not deal:
        return jsonify({"error": "Deal not found"}), 404

    update_fields = {"updated_at": now_iso()}
    for key in ["title", "company_name", "country", "commodity", "incoterm", "payment_terms", "expected_close_date"]:
        if key in data:
            update_fields[key] = data[key]

    if "quantity_mt" in data:
        update_fields["quantity_mt"] = float(data["quantity_mt"])
    if "value_usd" in data:
        update_fields["value_usd"] = float(data["value_usd"])
    if "probability" in data:
        update_fields["probability"] = int(data["probability"])

    # If stage updated, refresh stage_name and log transition
    if "stage_id" in data and data["stage_id"] != deal.get("stage_id"):
        stage_doc = db.master_stages.find_one({"type": "pipeline", "stage_id": data["stage_id"]})
        update_fields["stage_id"] = data["stage_id"]
        update_fields["stage_name"] = stage_doc.get("name") if stage_doc else data["stage_id"]

    if "note" in data and data["note"]:
        db.deals.update_one({"deal_id": deal_id}, {"$push": {"notes": f"[{now_iso()[:16]}] {data['note']}"}})

    db.deals.update_one({"deal_id": deal_id}, {"$set": update_fields})
    updated = db.deals.find_one({"deal_id": deal_id})
    return jsonify({"deal": serialize_doc(updated), "message": "Deal updated successfully"})


@pipeline_bp.route("/deals/<deal_id>", methods=["DELETE"])
def delete_deal(deal_id):
    db = get_db()
    res = db.deals.delete_one({"deal_id": deal_id})
    if res.deleted_count == 0:
        return jsonify({"error": "Deal not found"}), 404
    return jsonify({"message": f"Deal {deal_id} deleted successfully"})

