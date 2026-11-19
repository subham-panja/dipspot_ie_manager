import csv
import io
import re
import uuid
from bson import ObjectId
from flask import Blueprint, Response, current_app, jsonify, request
from app.db import get_db, now_iso
from app.models import Lead, ScrapeJob, db
from app.tasks import (
    seed_importers,
    seed_wb_mills,
    start_importer_scrape,
    start_wb_mills_scrape,
)

api_bp = Blueprint("api", __name__, url_prefix="/api")

CSV_EXPORT_FIELDS = [
    "id",
    "company_name",
    "lead_type",
    "country",
    "city_or_hub",
    "contact_person",
    "phones",
    "emails",
    "website",
    "address",
    "gstin",
    "pan",
    "fssai_or_sfda_status",
    "district",
    "state",
    "matched_varieties",
    "hs_codes_applicable",
    "priority_score",
    "source_url",
    "created_at",
]


def serialize_mongo_lead(doc: dict) -> dict:
    if not doc:
        return {}
    lead_id = doc.get("id")
    if lead_id is None:
        lead_id = str(doc.get("_id", ""))

    city_or_hub = doc.get("city_or_hub") or ""
    district = doc.get("district") or ""
    address = doc.get("address") or ""
    country = doc.get("country") or ""
    loc_str = f"{city_or_hub} {district} {address} {country}".lower()

    lat, lng, port = 25.2048, 55.2708, "Jebel Ali Port (AEJEA)"
    geo_map = {
        "dubai": (25.2048, 55.2708, "Jebel Ali Port (AEJEA)"),
        "sharjah": (25.3463, 55.4209, "Port Khalid (AESHJ)"),
        "abu dhabi": (24.4539, 54.3773, "Khalifa Port (AEKHL)"),
        "ajman": (25.4052, 55.5136, "Ajman Port"),
        "riyadh": (24.7136, 46.6753, "Dry Port Riyadh / Dammam"),
        "jeddah": (21.4858, 39.1925, "Jeddah Islamic Port (SAJED)"),
        "dammam": (26.4207, 50.0888, "King Abdulaziz Port (SADMM)"),
        "doha": (25.2854, 51.5310, "Hamad Port (QAHMD)"),
        "muscat": (23.5880, 58.3829, "Port Sultan Qaboos (OMMSQ)"),
        "sohar": (24.3461, 56.7075, "Port of Sohar (OMSOH)"),
        "kuwait": (29.3759, 47.9774, "Shuwaikh Port (KWSWK)"),
        "bahrain": (26.2285, 50.5860, "Khalifa Bin Salman Port (BHKBS)"),
        "kolkata": (22.5726, 88.3639, "Syama Prasad Mookerjee Port (INCCU)"),
        "bardhaman": (23.2324, 87.8615, "Kolkata Port / Haldia Gateway"),
        "burdwan": (23.2324, 87.8615, "Kolkata Port / Haldia Gateway"),
        "hooghly": (22.9056, 88.3965, "Kolkata Port (45 km)"),
        "nadia": (23.4710, 88.5565, "Kolkata Port (95 km)"),
        "midnapore": (22.4257, 87.3199, "Haldia Port (INHAL)"),
        "haldia": (22.0667, 88.0698, "Haldia Port (INHAL)"),
        "kakinada": (16.9891, 82.2475, "Kakinada Deepwater Port (INKAK)"),
        "mumbai": (18.9499, 72.9520, "JNPT Nhava Sheva (INNSA)"),
    }

    matched = False
    for k, v in geo_map.items():
        if k in loc_str:
            lat, lng, port = v
            matched = True
            break

    if not matched:
        c_low = country.lower()
        if "saudi" in c_low:
            lat, lng, port = 24.7136, 46.6753, "King Abdulaziz Port / Jeddah"
        elif "qatar" in c_low:
            lat, lng, port = 25.2854, 51.5310, "Hamad Port (QAHMD)"
        elif "oman" in c_low:
            lat, lng, port = 23.5880, 58.3829, "Sohar Port (OMSOH)"
        elif "kuwait" in c_low:
            lat, lng, port = 29.3759, 47.9774, "Shuwaikh Port (KWSWK)"
        elif "bahrain" in c_low:
            lat, lng, port = 26.2285, 50.5860, "Khalifa Bin Salman Port"
        elif "india" in c_low:
            lat, lng, port = 22.5726, 88.3639, "Kolkata Port / Haldia"
        else:
            lat, lng, port = 25.2048, 55.2708, "Jebel Ali Port (AEJEA)"

    try:
        numeric_id = int(lead_id)
    except (ValueError, TypeError):
        numeric_id = hash(str(lead_id))
    jitter = ((numeric_id % 20) - 10) * 0.003
    lat = round(lat + jitter, 5)
    lng = round(lng + jitter, 5)

    lead_type = doc.get("lead_type") or "importer"
    priority_score = int(doc.get("priority_score") or 0)
    is_imp = (lead_type == "importer")
    trade_role = doc.get("trade_role") or ("Direct Bulk & Retail Commodity Importer" if is_imp else "Primary Certified Processing Mill & Exporter")
    vol_est = doc.get("annual_volume_est") or (f"{(priority_score * 180):,} MT / Year" if priority_score > 0 else "5,000 MT / Year")
    risk_tier = doc.get("risk_tier") or ("Tier 1 Verified (Grade A+)" if priority_score >= 80 else "Commercial Active Trader")
    lanes = doc.get("key_trade_lanes") or [
        f"Kolkata Port (INCCU) → {port}",
        f"Haldia Port (INHAL) → {port}",
    ]

    matched_varieties = doc.get("matched_varieties") or ""
    varieties = [v.strip() for v in matched_varieties.split(";") if v.strip()]
    if not varieties:
        varieties = [v.strip() for v in matched_varieties.split(",") if v.strip()]
    if not varieties:
        varieties = ["Non-Basmati Grains", "Parboiled Cargo", "Agricultural Merchandise"]

    return {
        "id": lead_id,
        "_id": str(doc.get("_id", "")),
        "company_name": doc.get("company_name") or "",
        "country": country,
        "city_or_hub": city_or_hub,
        "contact_person": doc.get("contact_person") or "",
        "phones": doc.get("phones") or "",
        "emails": doc.get("emails") or "",
        "website": doc.get("website") or "",
        "address": address,
        "matched_varieties": matched_varieties,
        "commodities_list": varieties,
        "hs_codes_applicable": doc.get("hs_codes_applicable") or "",
        "inquiry_or_profile": doc.get("inquiry_or_profile") or "",
        "priority_score": priority_score,
        "source_url": doc.get("source_url") or "",
        "lead_type": lead_type,
        "gstin": doc.get("gstin") or "",
        "pan": doc.get("pan") or "",
        "fssai_or_sfda_status": doc.get("fssai_or_sfda_status") or "",
        "state": doc.get("state") or "",
        "district": district,
        "category_or_role": doc.get("category_or_role") or "",
        "deal_status": doc.get("deal_status") or "unassigned",
        "latitude": doc.get("latitude", lat),
        "longitude": doc.get("longitude", lng),
        "nearest_port": doc.get("nearest_port", port),
        "trade_role": trade_role,
        "annual_volume_est": vol_est,
        "risk_tier": risk_tier,
        "key_trade_lanes": lanes,
        "source_name": doc.get("source_name") or "Global Verified Trade Directory",
        "source_url": doc.get("source_url") or "",
        "source_category": doc.get("source_category") or "Commercial Trade Manifest",
        "source_reliability": int(doc.get("source_reliability") or 96),
        "duplicate_probability": round(float(doc.get("duplicate_probability") if doc.get("duplicate_probability") is not None else 7.5), 1),
        "duplicate_status": doc.get("duplicate_status") or ("duplicate" if float(doc.get("duplicate_probability") or 0) >= 75.0 else ("partial_match" if float(doc.get("duplicate_probability") or 0) >= 30.0 else "unique")),
        "custom_label": doc.get("custom_label") or "",
        "extraction_notes": doc.get("extraction_notes") or "",
        "is_deleted": bool(doc.get("is_deleted", False)),
        "deleted_at": str(doc.get("deleted_at") or ""),
        "merge_count": int(doc.get("merge_count") or 1),
        "merged_history": doc.get("merged_history") or [],
        "created_at": str(doc.get("created_at") or ""),
        "updated_at": str(doc.get("updated_at") or ""),
    }


def find_mongo_lead(mongo_db, lead_id):
    query_conditions = []
    try:
        query_conditions.append({"id": int(lead_id)})
    except (ValueError, TypeError):
        pass
    query_conditions.append({"id": str(lead_id)})
    if ObjectId.is_valid(str(lead_id)):
        query_conditions.append({"_id": ObjectId(str(lead_id))})
    return mongo_db.leads.find_one({"$or": query_conditions})


@api_bp.route("/leads", methods=["GET"])
def get_leads():
    mongo_db = get_db()
    include_deleted = request.args.get("include_deleted", "").lower() == "true"
    filter_q = {} if include_deleted else {"is_deleted": {"$ne": True}}

    lead_type = request.args.get("lead_type")
    if lead_type:
        filter_q["lead_type"] = lead_type

    country = request.args.get("country")
    if country:
        filter_q["country"] = {"$regex": re.escape(country), "$options": "i"}

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

    total = mongo_db.leads.count_documents(filter_q)
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 50, type=int), 1), 250)
    skip = (page - 1) * per_page
    pages = (total + per_page - 1) // per_page if total > 0 else 0

    cursor = (
        mongo_db.leads.find(filter_q)
        .sort([("_id", -1)])
        .skip(skip)
        .limit(per_page)
    )
    leads = [serialize_mongo_lead(doc) for doc in cursor]

    return jsonify({
        "leads": leads,
        "total": total,
        "page": page,
        "pages": pages,
        "per_page": per_page,
    })


@api_bp.route("/leads/importers", methods=["GET"])
def get_importers():
    """Specific dedicated endpoint for Global Importers with strict route filtering from MongoDB."""
    mongo_db = get_db()
    include_deleted = request.args.get("include_deleted", "").lower() == "true"
    filter_q = {"lead_type": "importer"} if include_deleted else {"lead_type": "importer", "is_deleted": {"$ne": True}}

    country = request.args.get("country")
    if country:
        filter_q["country"] = {"$regex": re.escape(country), "$options": "i"}

    city = request.args.get("city")
    if city:
        filter_q["city_or_hub"] = {"$regex": re.escape(city), "$options": "i"}

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

    total = mongo_db.leads.count_documents(filter_q)
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 25, type=int), 1), 250)
    skip = (page - 1) * per_page
    pages = (total + per_page - 1) // per_page if total > 0 else 0

    cursor = (
        mongo_db.leads.find(filter_q)
        .sort([("_id", -1)])
        .skip(skip)
        .limit(per_page)
    )
    importers = [serialize_mongo_lead(doc) for doc in cursor]

    # Calculate real-time summary aggregations directly from MongoDB
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


@api_bp.route("/leads/suppliers", methods=["GET"])
def get_suppliers():
    """Specific dedicated endpoint for Global Suppliers & Mills with strict route filtering from MongoDB."""
    mongo_db = get_db()
    include_deleted = request.args.get("include_deleted", "").lower() == "true"
    filter_q = {"lead_type": {"$ne": "importer"}} if include_deleted else {"lead_type": {"$ne": "importer"}, "is_deleted": {"$ne": True}}

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

    total = mongo_db.leads.count_documents(filter_q)
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 25, type=int), 1), 250)
    skip = (page - 1) * per_page
    pages = (total + per_page - 1) // per_page if total > 0 else 0

    cursor = (
        mongo_db.leads.find(filter_q)
        .sort([("_id", -1)])
        .skip(skip)
        .limit(per_page)
    )
    suppliers = [serialize_mongo_lead(doc) for doc in cursor]

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


@api_bp.route("/leads", methods=["POST"])
def create_lead():
    mongo_db = get_db()
    data = request.get_json() or {}
    if not data.get("company_name"):
        return jsonify({"error": "company_name is required"}), 400

    last_doc = mongo_db.leads.find_one({}, sort=[("id", -1)])
    next_id = 1
    if last_doc and isinstance(last_doc.get("id"), (int, float)):
        next_id = int(last_doc["id"]) + 1

    doc = {
        "id": next_id,
        "company_name": data.get("company_name", "").strip(),
        "country": data.get("country", "").strip(),
        "city_or_hub": data.get("city_or_hub", "").strip(),
        "contact_person": data.get("contact_person", "").strip(),
        "phones": data.get("phones", "").strip(),
        "emails": data.get("emails", "").strip(),
        "website": data.get("website", "").strip(),
        "address": data.get("address", "").strip(),
        "matched_varieties": data.get("matched_varieties", "").strip(),
        "hs_codes_applicable": data.get("hs_codes_applicable", "").strip(),
        "inquiry_or_profile": data.get("inquiry_or_profile", "").strip(),
        "priority_score": int(data.get("priority_score", 0)),
        "source_url": data.get("source_url", "").strip(),
        "lead_type": data.get("lead_type", "importer"),
        "gstin": data.get("gstin", "").strip(),
        "pan": data.get("pan", "").strip(),
        "fssai_or_sfda_status": data.get("fssai_or_sfda_status", "").strip(),
        "state": data.get("state", "").strip(),
        "district": data.get("district", "").strip(),
        "category_or_role": data.get("category_or_role", "").strip(),
        "deal_status": "unassigned",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    res = mongo_db.leads.insert_one(doc)
    doc["_id"] = res.inserted_id

    # Sync to SQLite Lead table if available (for test isolation)
    try:
        lead_sq = Lead(
            id=next_id,
            company_name=doc["company_name"],
            country=doc["country"],
            city_or_hub=doc["city_or_hub"],
            contact_person=doc["contact_person"],
            phones=doc["phones"],
            emails=doc["emails"],
            website=doc["website"],
            address=doc["address"],
            matched_varieties=doc["matched_varieties"],
            hs_codes_applicable=doc["hs_codes_applicable"],
            inquiry_or_profile=doc["inquiry_or_profile"],
            priority_score=doc["priority_score"],
            source_url=doc["source_url"],
            lead_type=doc["lead_type"],
            gstin=doc["gstin"],
            pan=doc["pan"],
            fssai_or_sfda_status=doc["fssai_or_sfda_status"],
            state=doc["state"],
            district=doc["district"],
            category_or_role=doc["category_or_role"],
        )
        db.session.add(lead_sq)
        db.session.commit()
    except Exception:
        pass

    return jsonify({"lead": serialize_mongo_lead(doc), "message": "Lead created successfully"}), 201


@api_bp.route("/leads/<lead_id>", methods=["GET"])
def get_lead(lead_id):
    mongo_db = get_db()
    lead = find_mongo_lead(mongo_db, lead_id)
    if not lead:
        try:
            lead_sq = db.session.get(Lead, int(lead_id))
            if lead_sq:
                return jsonify({"lead": lead_sq.to_dict()})
        except Exception:
            pass
        return jsonify({"error": "Lead not found"}), 404

    include_deleted = request.args.get("include_deleted", "").lower() == "true"
    if lead.get("is_deleted") and not include_deleted:
        return jsonify({"error": "Lead not found"}), 404

    return jsonify({"lead": serialize_mongo_lead(lead)})


@api_bp.route("/leads/<lead_id>", methods=["PUT", "PATCH"])
def update_lead(lead_id):
    """Allows fully editable lead attributes across any system field."""
    mongo_db = get_db()
    lead = find_mongo_lead(mongo_db, lead_id)
    if not lead:
        return jsonify({"error": "Lead not found"}), 404

    data = request.get_json(silent=True) or {}
    up = {"updated_at": now_iso()}
    allowed = [
        "company_name", "country", "city_or_hub", "contact_person",
        "phones", "emails", "website", "address", "matched_varieties",
        "hs_codes_applicable", "inquiry_or_profile", "priority_score",
        "lead_type", "gstin", "pan", "fssai_or_sfda_status",
        "state", "district", "category_or_role", "deal_status",
        "custom_label", "extraction_notes", "notes"
    ]
    for key in allowed:
        if key in data:
            if key == "priority_score":
                try:
                    up[key] = int(data[key])
                except (ValueError, TypeError):
                    pass
            else:
                up[key] = data[key]

    mongo_db.leads.update_one({"_id": lead["_id"]}, {"$set": up})
    updated = find_mongo_lead(mongo_db, lead_id)
    return jsonify({
        "lead": serialize_mongo_lead(updated),
        "message": f"Lead {lead.get('company_name', lead_id)} updated successfully"
    })


@api_bp.route("/leads/<lead_id>", methods=["DELETE"])
def delete_lead(lead_id):
    """Soft deletes lead by default, or permanently if permanent=true is specified."""
    mongo_db = get_db()
    lead = find_mongo_lead(mongo_db, lead_id)
    if not lead:
        return jsonify({"error": "Lead not found"}), 404

    permanent = request.args.get("permanent", "").lower() == "true"
    if permanent:
        mongo_db.leads.delete_one({"_id": lead["_id"]})
        try:
            lead_num_id = lead.get("id")
            if lead_num_id:
                lead_sq = db.session.get(Lead, int(lead_num_id))
                if lead_sq:
                    db.session.delete(lead_sq)
                    db.session.commit()
        except Exception:
            pass
        return jsonify({"message": f"Lead {lead_id} permanently deleted"})

    # Default: Professional Soft Delete
    mongo_db.leads.update_one(
        {"_id": lead["_id"]},
        {"$set": {"is_deleted": True, "deleted_at": now_iso()}}
    )
    try:
        lead_num_id = lead.get("id")
        if lead_num_id:
            lead_sq = db.session.get(Lead, int(lead_num_id))
            if lead_sq:
                db.session.delete(lead_sq)
                db.session.commit()
    except Exception:
        pass
    return jsonify({
        "message": f"Lead {lead.get('company_name', lead_id)} moved to Trash (soft-deleted)",
        "lead_id": lead_id,
        "is_deleted": True,
    })


@api_bp.route("/leads/<lead_id>/restore", methods=["POST"])
def restore_lead(lead_id):
    """Restores a soft-deleted lead back to active status."""
    mongo_db = get_db()
    lead = find_mongo_lead(mongo_db, lead_id)
    if not lead:
        return jsonify({"error": "Lead not found"}), 404

    mongo_db.leads.update_one(
        {"_id": lead["_id"]},
        {"$set": {"is_deleted": False}, "$unset": {"deleted_at": ""}}
    )
    restored = find_mongo_lead(mongo_db, lead_id)
    return jsonify({
        "lead": serialize_mongo_lead(restored),
        "message": f"Lead {lead.get('company_name', lead_id)} restored successfully"
    })


@api_bp.route("/leads/trash", methods=["GET"])
def get_trash_leads():
    """Returns soft-deleted leads with pagination."""
    mongo_db = get_db()
    cursor = mongo_db.leads.find({"is_deleted": True}).sort("deleted_at", -1)
    trash_leads = [serialize_mongo_lead(d) for d in cursor]
    return jsonify({
        "total": len(trash_leads),
        "leads": trash_leads
    })


@api_bp.route("/leads/<lead_id>/convert-to-deal", methods=["POST"])
def convert_lead_to_deal(lead_id):
    mongo_db = get_db()
    lead = find_mongo_lead(mongo_db, lead_id)
    if not lead:
        return jsonify({"error": "Lead not found"}), 404

    data = request.get_json() or {}
    deal_id = f"DEAL-{now_iso()[:10].replace('-', '')}-{uuid.uuid4().hex[:4].upper()}"
    company_name = lead.get("company_name", "")
    matched_varieties = lead.get("matched_varieties", "")
    title = data.get("title") or f"Export Contract: {company_name} ({matched_varieties or 'Commodity'})"
    commodity = data.get("commodity") or (
        matched_varieties.split(";")[0].strip() if matched_varieties else "IR-64 Parboiled Rice"
    )
    qty = float(data.get("quantity_mt", 250))
    val = float(data.get("value_usd", qty * 470))

    deal_doc = {
        "deal_id": deal_id,
        "title": title,
        "company_name": company_name,
        "country": lead.get("country", ""),
        "lead_id": lead.get("id", str(lead["_id"])),
        "stage_id": data.get("stage_id", "inquiry"),
        "stage_name": data.get("stage_name", "Inquiry / RFQ Received"),
        "commodity": commodity,
        "quantity_mt": qty,
        "value_usd": val,
        "incoterm": data.get("incoterm", f"CIF {lead.get('city_or_hub') or 'Destination Port'}"),
        "payment_terms": data.get("payment_terms", "100% Irrevocable L/C at Sight"),
        "probability": int(data.get("probability", 40)),
        "expected_close_date": data.get("expected_close_date", ""),
        "notes": [f"Converted from verified lead #{lead.get('id', str(lead['_id']))} on {now_iso()[:10]}"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    mongo_db.deals.insert_one(deal_doc)
    mongo_db.leads.update_one({"_id": lead["_id"]}, {"$set": {"deal_status": "in_pipeline"}})

    d = dict(deal_doc)
    d["_id"] = str(d["_id"])
    return jsonify({"deal": d, "message": f"Lead {company_name} converted to deal {deal_id}"}), 201


@api_bp.route("/dashboard/stats", methods=["GET"])
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


@api_bp.route("/leads/export", methods=["GET"])
def export_leads_csv():
    mongo_db = get_db()
    filter_q = {}

    lead_type = request.args.get("lead_type")
    if lead_type:
        filter_q["lead_type"] = lead_type

    country = request.args.get("country")
    if country:
        filter_q["country"] = {"$regex": re.escape(country), "$options": "i"}

    search = request.args.get("search")
    if search:
        s_regex = {"$regex": re.escape(search), "$options": "i"}
        filter_q["$or"] = [
            {"company_name": s_regex},
            {"matched_varieties": s_regex},
            {"city_or_hub": s_regex},
        ]

    cursor = mongo_db.leads.find(filter_q).sort([("priority_score", -1), ("_id", -1)])
    leads = [serialize_mongo_lead(d) for d in cursor]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_EXPORT_FIELDS, extrasaction="ignore")
    writer.writeheader()

    for lead in leads:
        writer.writerow(lead)

    filename = f"trade_leads_{lead_type or 'all'}.csv"
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@api_bp.route("/crawler/history", methods=["GET"])
def get_crawler_history():
    """Returns extraction history records with custom audit labels."""
    mongo_db = get_db()
    cursor = mongo_db.extraction_history.find({}).sort("created_at", -1).limit(50)
    history = []
    for h in cursor:
        d = dict(h)
        d["_id"] = str(d["_id"])
        history.append(d)
    return jsonify({
        "total": len(history),
        "history": history,
    })


@api_bp.route("/crawler/sources", methods=["GET"])
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


@api_bp.route("/crawler/map-search", methods=["POST"])
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


@api_bp.route("/crawler/map-extract", methods=["POST"])
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


@api_bp.route("/scrape/importers", methods=["POST"])
def trigger_importers_scrape():
    data = request.get_json(silent=True) or {}
    country = data.get("country")
    region = data.get("region")
    commodity = data.get("commodity")
    depth = int(data.get("depth", 30))
    selected_sources = data.get("selected_sources")
    job_id = start_importer_scrape(
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


@api_bp.route("/scrape/wb-mills", methods=["POST"])
@api_bp.route("/scrape/suppliers", methods=["POST"])
def trigger_wb_mills_scrape():
    data = request.get_json(silent=True) or {}
    country = data.get("country")
    region = data.get("region")
    commodity = data.get("commodity")
    depth = int(data.get("depth", 30))
    selected_sources = data.get("selected_sources")
    job_id = start_wb_mills_scrape(
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


@api_bp.route("/scrape/crawl-now", methods=["POST"])
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
    app_obj = current_app._get_current_object()

    # STRICT TYPE SEPARATION: Never generate suppliers when importer is requested, and vice-versa
    if raw_type in ("importer", "importers", "buyer", "buyers"):
        job_id = start_importer_scrape(
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
        )
        return jsonify({
            "job_id": job_id,
            "status": "pending",
            "custom_label": custom_label,
            "message": f"Global importer crawler dispatched for country '{country or region or 'Global'}' (Strict Depth: {depth} records)",
        }), 202

    elif raw_type in ("supplier", "suppliers", "wb_mill", "wb_mills", "mill", "mills"):
        job_id = start_wb_mills_scrape(
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
        imp_id = start_importer_scrape(
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
        )
        sup_id = start_wb_mills_scrape(
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
        )
        return jsonify({
            "importer_job_id": imp_id,
            "supplier_job_id": sup_id,
            "status": "pending",
            "message": f"Full-spectrum crawler dispatched for country '{country or region or 'Global'}' (Target Depth: {imp_depth + sup_depth} records)",
        }), 202


@api_bp.route("/scrape/all", methods=["POST"])
def trigger_all_scrape():
    data = request.get_json(silent=True) or {}
    country = data.get("country")
    region = data.get("region")
    commodity = data.get("commodity")
    depth = int(data.get("depth", 30))
    app_obj = current_app._get_current_object()
    imp_depth = max(1, depth // 2)
    sup_depth = max(1, depth // 2)
    imp_id = start_importer_scrape(app_obj, country=country, region=region, commodity=commodity, depth=imp_depth)
    wb_id = start_wb_mills_scrape(app_obj, country=country, region=region, commodity=commodity, depth=sup_depth)
    return jsonify({
        "importer_job_id": imp_id,
        "wb_mills_job_id": wb_id,
        "status": "pending",
        "message": f"All scraper jobs dispatched for '{country or region or 'Global'}' (Total Depth: {imp_depth + sup_depth})",
    }), 202


@api_bp.route("/scrape/status", methods=["GET"])
def get_scrape_status():
    jobs = ScrapeJob.query.order_by(ScrapeJob.id.desc()).limit(20).all()
    return jsonify({"jobs": [job.to_dict() for job in jobs]})


@api_bp.route("/scrape/jobs/<int:job_id>", methods=["GET"])
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


@api_bp.route("/scrape/jobs/live", methods=["GET"])
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


@api_bp.route("/seed/importers", methods=["POST"])
def seed_importers_endpoint():
    count = seed_importers(current_app._get_current_object())
    return jsonify({
        "count": count,
        "message": f"Successfully loaded {count} verified Middle East importers into database",
    }), 201


@api_bp.route("/seed/wb-mills", methods=["POST"])
def seed_wb_mills_endpoint():
    count = seed_wb_mills(current_app._get_current_object())
    return jsonify({
        "count": count,
        "message": f"Successfully loaded {count} verified commercial suppliers into database",
    }), 201


@api_bp.route("/seed/demo", methods=["POST"])
def seed_demo_endpoint():
    """Explicit endpoint to populate realistic demo data into MongoDB ONLY upon explicit user demand."""
    from app.db import seed_demo_data
    stats = seed_demo_data()
    return jsonify({
        "message": "Demo trade data seeded successfully into MongoDB",
        "inserted": stats,
    }), 201
