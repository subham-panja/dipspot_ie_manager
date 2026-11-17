import random
import uuid
from flask import Blueprint, jsonify, request
from app.db import get_db, now_iso

shipments_bp = Blueprint("shipments", __name__, url_prefix="/api/shipments")


def serialize_doc(doc):
    if not doc:
        return None
    d = dict(doc)
    if "_id" in d:
        d["_id"] = str(d["_id"])
    return d


@shipments_bp.route("/stages", methods=["GET"])
def get_shipment_stages():
    db = get_db()
    stages = list(db.master_stages.find({"type": "shipment"}).sort("order", 1))
    return jsonify({"stages": [serialize_doc(s) for s in stages]})


@shipments_bp.route("/stages", methods=["POST"])
def create_or_update_shipment_stage():
    db = get_db()
    data = request.get_json() or {}
    if not data.get("name"):
        return jsonify({"error": "Stage name is required"}), 400

    stage_id = data.get("stage_id") or data["name"].lower().replace(" ", "_").replace("/", "_")
    count = db.master_stages.count_documents({"type": "shipment"})

    doc = {
        "type": "shipment",
        "stage_id": stage_id,
        "name": data["name"],
        "order": data.get("order", count + 1),
        "description": data.get("description", ""),
        "is_active": True,
        "is_terminal": bool(data.get("is_terminal", False)),
        "updated_at": now_iso(),
    }
    db.master_stages.update_one({"type": "shipment", "stage_id": stage_id}, {"$set": doc}, upsert=True)
    return jsonify({"stage": doc, "message": "Shipment master stage saved"}), 201


@shipments_bp.route("", methods=["GET"])
def get_shipments():
    db = get_db()
    query = {}
    dest = request.args.get("destination")
    if dest:
        query["destination_country"] = {"$regex": dest, "$options": "i"}

    search = request.args.get("search")
    if search:
        query["$or"] = [
            {"tracking_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"bl_number": {"$regex": search, "$options": "i"}},
            {"vessel_name": {"$regex": search, "$options": "i"}},
            {"container_numbers": {"$regex": search, "$options": "i"}},
        ]

    shipments = list(db.shipments.find(query).sort("created_at", -1))
    return jsonify({
        "shipments": [serialize_doc(s) for s in shipments],
        "total": len(shipments),
    })


@shipments_bp.route("", methods=["POST"])
def create_shipment():
    db = get_db()
    data = request.get_json() or {}
    if not data.get("customer_name") or not data.get("destination_port"):
        return jsonify({"error": "customer_name and destination_port are required"}), 400

    rand_code = random.randint(1000, 9999)
    tracking_number = data.get("tracking_number") or f"TRK-{now_iso()[:4]}-{rand_code}"

    # Build milestones based on master stages
    master_stages = list(db.master_stages.find({"type": "shipment", "is_active": True}).sort("order", 1))
    milestones = []
    first_stage_id = master_stages[0]["stage_id"] if master_stages else "order_confirmed"
    first_stage_name = master_stages[0]["name"] if master_stages else "Order Confirmed"

    for idx, st in enumerate(master_stages):
        is_first = idx == 0
        milestones.append({
            "stage_id": st["stage_id"],
            "name": st["name"],
            "description": st.get("description", ""),
            "status": "completed" if is_first else "pending",
            "location": data.get("origin_port", "Kolkata Port"),
            "actual_date": now_iso()[:10] if is_first else "",
            "planned_date": data.get("eta", ""),
            "notes": "Initial milestone logged upon shipment creation" if is_first else "",
        })

    containers = data.get("container_numbers", [])
    if isinstance(containers, str):
        containers = [c.strip() for c in containers.split(",") if c.strip()]

    doc = {
        "tracking_number": tracking_number,
        "deal_id": data.get("deal_id", ""),
        "customer_name": data["customer_name"],
        "destination_country": data.get("destination_country", "United Arab Emirates"),
        "cargo_description": data.get("cargo_description", "Parboiled Rice in 20ft Containers"),
        "container_numbers": containers,
        "bl_number": data.get("bl_number", f"BL-{uuid.uuid4().hex[:8].upper()}"),
        "vessel_name": data.get("vessel_name", "MAERSK VISBY"),
        "carrier": data.get("carrier", "Maersk Line"),
        "origin_port": data.get("origin_port", "Kolkata Port (INCCU)"),
        "destination_port": data["destination_port"],
        "etd": data.get("etd", now_iso()[:10]),
        "eta": data.get("eta", ""),
        "current_stage_id": first_stage_id,
        "current_stage_name": first_stage_name,
        "progress_percent": int(data.get("progress_percent", 10)),
        "is_delivered": False,
        "milestones": milestones,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    db.shipments.insert_one(doc)
    return jsonify({"shipment": serialize_doc(doc), "message": "Shipment created successfully"}), 201


@shipments_bp.route("/<tracking_number>", methods=["GET"])
def get_shipment(tracking_number):
    db = get_db()
    s = db.shipments.find_one({"tracking_number": tracking_number})
    if not s:
        return jsonify({"error": "Shipment not found"}), 404
    return jsonify({"shipment": serialize_doc(s)})


@shipments_bp.route("/<tracking_number>", methods=["PATCH"])
def update_shipment(tracking_number):
    db = get_db()
    s = db.shipments.find_one({"tracking_number": tracking_number})
    if not s:
        return jsonify({"error": "Shipment not found"}), 404

    data = request.get_json() or {}
    update_fields = {"updated_at": now_iso()}

    for key in ["customer_name", "destination_country", "cargo_description", "bl_number", "vessel_name", "carrier", "origin_port", "destination_port", "etd", "eta"]:
        if key in data:
            update_fields[key] = data[key]

    if "container_numbers" in data:
        c = data["container_numbers"]
        update_fields["container_numbers"] = [x.strip() for x in c.split(",")] if isinstance(c, str) else c

    if "progress_percent" in data:
        update_fields["progress_percent"] = int(data["progress_percent"])
    if "is_delivered" in data:
        update_fields["is_delivered"] = bool(data["is_delivered"])

    # If stage updated, update current_stage_name and mark milestone status
    if "current_stage_id" in data and data["current_stage_id"]:
        new_stage_id = data["current_stage_id"]
        stage_doc = db.master_stages.find_one({"type": "shipment", "stage_id": new_stage_id})
        update_fields["current_stage_id"] = new_stage_id
        update_fields["current_stage_name"] = stage_doc.get("name") if stage_doc else new_stage_id

        # Update milestones array in memory
        milestones = s.get("milestones", [])
        reached_stage = False
        target_order = stage_doc.get("order", 1) if stage_doc else 1

        for m in milestones:
            m_doc = db.master_stages.find_one({"type": "shipment", "stage_id": m.get("stage_id")})
            m_order = m_doc.get("order", 0) if m_doc else 0
            if m_order < target_order:
                m["status"] = "completed"
                if not m.get("actual_date"):
                    m["actual_date"] = now_iso()[:10]
            elif m.get("stage_id") == new_stage_id:
                m["status"] = "in_progress" if not stage_doc.get("is_terminal") else "completed"
                m["actual_date"] = now_iso()[:10]
                if data.get("stage_note"):
                    m["notes"] = data["stage_note"]
                if data.get("location"):
                    m["location"] = data["location"]
            else:
                m["status"] = "pending"

        update_fields["milestones"] = milestones

    db.shipments.update_one({"tracking_number": tracking_number}, {"$set": update_fields})
    updated = db.shipments.find_one({"tracking_number": tracking_number})
    return jsonify({"shipment": serialize_doc(updated), "message": "Shipment updated successfully"})


@shipments_bp.route("/<tracking_number>", methods=["DELETE"])
def delete_shipment(tracking_number):
    db = get_db()
    res = db.shipments.delete_one({"tracking_number": tracking_number})
    if res.deleted_count == 0:
        return jsonify({"error": "Shipment not found"}), 404
    return jsonify({"message": f"Shipment {tracking_number} deleted successfully"})


@shipments_bp.route("/track/<tracking_number>", methods=["GET"])
def public_track_shipment(tracking_number):
    """Public customer facing tracking endpoint for buyers."""
    db = get_db()
    s = db.shipments.find_one({"tracking_number": tracking_number})
    if not s:
        return jsonify({
            "found": False,
            "error": "No shipment found for this tracking number. Please verify the code on your Bill of Lading.",
        }), 404

    serialized = serialize_doc(s)
    # Sanitize and present public tracking view
    return jsonify({
        "found": True,
        "tracking_number": serialized["tracking_number"],
        "cargo_description": serialized.get("cargo_description", ""),
        "origin_port": serialized.get("origin_port", ""),
        "destination_port": serialized.get("destination_port", ""),
        "vessel_name": serialized.get("vessel_name", ""),
        "carrier": serialized.get("carrier", ""),
        "etd": serialized.get("etd", ""),
        "eta": serialized.get("eta", ""),
        "current_stage": serialized.get("current_stage_name", ""),
        "progress_percent": serialized.get("progress_percent", 0),
        "is_delivered": serialized.get("is_delivered", False),
        "milestones": serialized.get("milestones", []),
        "last_updated": serialized.get("updated_at", ""),
    })


@shipments_bp.route("/ports", methods=["GET"])
def get_ports_directory():
    """Returns directory of international commercial ports with specs and active shipments."""
    db = get_db()
    ports = [
        {"port_code": "INCCU", "name": "Syama Prasad Mookerjee Port, Kolkata", "country": "India", "type": "Riverine / Container Gateway", "vessel_draft_m": 8.5, "avg_dwell_days": 3.2, "status": "Operational"},
        {"port_code": "INHAL", "name": "Haldia Dock Complex", "country": "India", "type": "Deepwater Bulk & Container", "vessel_draft_m": 12.0, "avg_dwell_days": 2.8, "status": "Operational"},
        {"port_code": "INKAK", "name": "Kakinada Deepwater Port", "country": "India", "type": "Bulk Cargo & Mechanized Loader", "vessel_draft_m": 14.5, "avg_dwell_days": 2.1, "status": "Operational"},
        {"port_code": "INNSA", "name": "Jawaharlal Nehru Port (JNPT), Mumbai", "country": "India", "type": "Major West Coast Hub", "vessel_draft_m": 15.0, "avg_dwell_days": 1.9, "status": "Operational"},
        {"port_code": "AEJEA", "name": "Jebel Ali Port, Dubai", "country": "United Arab Emirates", "type": "Global Mega Transshipment Hub", "vessel_draft_m": 17.0, "avg_dwell_days": 1.4, "status": "Operational"},
        {"port_code": "SADMM", "name": "King Abdulaziz Port, Dammam", "country": "Saudi Arabia", "type": "Major Arabian Gulf Gateway", "vessel_draft_m": 15.5, "avg_dwell_days": 2.4, "status": "Operational"},
        {"port_code": "QAHMD", "name": "Hamad Port, Doha", "country": "Qatar", "type": "Modern Deepwater Gateway", "vessel_draft_m": 17.0, "avg_dwell_days": 1.8, "status": "Operational"},
        {"port_code": "OMSOH", "name": "Port of Sohar", "country": "Oman", "type": "Gulf of Oman Freezone Terminal", "vessel_draft_m": 16.0, "avg_dwell_days": 2.0, "status": "Operational"},
        {"port_code": "KWSWK", "name": "Shuwaikh Port", "country": "Kuwait", "type": "Commercial Gateway", "vessel_draft_m": 10.5, "avg_dwell_days": 3.0, "status": "Operational"},
        {"port_code": "BDCGP", "name": "Chittagong Port", "country": "Bangladesh", "type": "Bay of Bengal Commercial Terminal", "vessel_draft_m": 9.2, "avg_dwell_days": 4.5, "status": "Congested"},
    ]

    # Calculate active shipments count per destination
    all_shipments = list(db.shipments.find({}))
    for p in ports:
        count = sum(1 for s in all_shipments if p["name"].lower() in s.get("destination_port", "").lower() or p["port_code"].lower() in s.get("destination_port", "").lower())
        p["active_consignments"] = count

    return jsonify({"ports": ports, "total": len(ports)})


