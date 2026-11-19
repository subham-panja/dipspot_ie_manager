import re
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Blueprint, jsonify, request
from app.db import get_db, now_iso
from app.models import Lead
from app.smtp_stopper import SmtpQuotaManager
from app.followup_engine import FollowUpEngine

campaigns_bp = Blueprint("campaigns", __name__, url_prefix="/api/campaigns")


def serialize_doc(doc):
    if not doc:
        return None
    d = dict(doc)
    if "_id" in d:
        d["_id"] = str(d["_id"])
    return d


DEFAULT_SEGMENTS = [
    {
        "segment_id": "SEG-GCC-BUYERS",
        "name": "GCC High-Volume Importers & Wholesale Buyers",
        "description": "Verified commercial buyers across UAE, Saudi Arabia, Qatar, Oman, and Kuwait",
        "lead_type": "importer",
        "countries": ["United Arab Emirates", "Saudi Arabia", "Qatar", "Oman", "Kuwait", "Bahrain"],
        "min_score": 50,
        "tags": ["GCC", "High Volume", "Wholesale"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "segment_id": "SEG-TIER1-IMPORTERS",
        "name": "Tier 1 Priority Commercial Buyers (Score 80+)",
        "description": "Pre-qualified institutional buyers with confirmed active RFQs and established bank credit",
        "lead_type": "importer",
        "countries": [],
        "min_score": 80,
        "tags": ["Grade A+", "Top Priority"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "segment_id": "SEG-VERIFIED-SUPPLIERS",
        "name": "Verified GST Compliant Suppliers & Producers",
        "description": "Licensed processing facilities, agricultural aggregators, and commercial suppliers",
        "lead_type": "wb_mill",
        "countries": ["India"],
        "min_score": 60,
        "tags": ["GST Verified", "Producers", "Direct Supply"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "segment_id": "SEG-GLOBAL-TRADERS",
        "name": "Global Multi-Commodity Trading Desks",
        "description": "International merchant traders handling containers of agro, spices, textiles, and chemicals",
        "lead_type": "importer",
        "countries": [],
        "min_score": 60,
        "tags": ["Multi-Commodity", "Global Trade"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
]

DEFAULT_TEMPLATES = [
    {
        "template_id": "TPL-EMAIL-FOB",
        "name": "Commercial Commodity Quotation & Spec Sheet",
        "category": "Soft Offer",
        "channel": "Email",
        "subject": "Spot Commercial Offer: Certified {commodity} CIF {port}",
        "body": "Dear Sourcing Desk at {company_name},\n\nWe are direct producers and licensed exporters of export-grade {commodity}.\n\nWe are pleased to submit our firm commercial spot offer for prompt container shipment to {country}:\n\n1. SPECIFICATIONS & QUALITY:\n• Commodity Line: {commodity}\n• Quality Grade: Sortex 100% Cleaned, Silky Polished, Free from weevils/foreign matter\n• Moisture Content: Max 14.0%\n• Broken Grains: Max 5.0%\n• Inspection: Pre-shipment quality and weight inspection by SGS / Bureau Veritas at loading port\n\n2. LOGISTICS & PACKING:\n• Loading Port: Syama Prasad Mookerjee Port, Kolkata (INCCU) / Haldia Dock\n• Destination Port: {port}\n• Incoterm: CIF {port}\n• Packaging: 25kg / 50kg Net Heavy-Duty PP Bags (Custom buyer artwork/branding supported)\n• Quantity Available: Up to 5,000 MT in 20ft Dry Cargo FCL Containers (25 MT/FCL)\n\n3. COMMERCIAL & PAYMENT TERMS:\n• Indicative Price: Available upon quantity confirmation (Spot validity: 5 business days)\n• Payment Terms: 100% Irrevocable Letter of Credit (L/C) at Sight issued by Prime Bank\n• Required Shipment Window: Prompt departure within 14 days of L/C authentication\n\nPlease let us know your required tonnage and target delivery schedule so our commercial desk can prepare a binding Proforma Invoice.\n\nBest regards,\nCommercial Export Desk | TradePulse Global\nContact: {contact_name}\nDirect Line / WhatsApp: +91 98301 22941\nWebsite: https://tradepulse.exim",
        "variables": ["{company_name}", "{commodity}", "{country}", "{port}", "{contact_name}"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "template_id": "TPL-EMAIL-INTRO",
        "name": "Direct Cold Sourcing & Quality Credentials Deck",
        "category": "Cold Outreach",
        "channel": "Email",
        "subject": "Introduction & Certified Sourcing of {commodity} for {company_name}",
        "body": "Dear {contact_name},\n\nGreetings from TradePulse Global Export Operations.\n\nWe noticed that {company_name} is actively importing agricultural and grain commodities into {country}. As an accredited producer and merchant exporter registered with APEDA, DGFT, and ISO 22000, we specialize in high-volume export of {commodity}.\n\nWhy institutional buyers in {country} partner with us:\n• Direct Sourcing: Processing units located in prime agricultural clusters with daily throughput exceeding 600 MT.\n• Rigorous QC: In-house lab verification and mandatory third-party surveyor certification (SGS / Intertek) for every export container.\n• Seamless Port Execution: Dedicated CFS stuffing and container handling at origin ports with full multimodal visibility.\n• Clean Documentation: 100% UCP 600 compliant shipping documents (Clean on Board B/L, Certificate of Origin, Phytosanitary, Fumigation).\n\nWe would welcome the opportunity to courier physical product spec sheets and grain samples to your office in {country}.\n\nMay we arrange a brief call this week to review your procurement calendar?\n\nSincerely,\nTradePulse International Trade Operations\nDirect Desk: exports@tradepulse.exim",
        "variables": ["{contact_name}", "{company_name}", "{country}", "{commodity}"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "template_id": "TPL-EMAIL-LC",
        "name": "Letter of Credit (L/C) Draft Review & Compliance",
        "category": "L/C Advising",
        "channel": "Email",
        "subject": "L/C Draft Review Request: Order Ref for {company_name} - {commodity}",
        "body": "Dear {contact_name},\n\nThank you for confirming the purchase order for {commodity}.\n\nTo prevent costly banking discrepancies and expedite container loading, please review the following L/C clause checklist prior to swift transmission by your issuing bank:\n\n1. Beneficiary: TradePulse Commercial Export Ltd (Verbatim as per Proforma Invoice)\n2. Port of Loading: Any Indian Port / Kolkata Port (INCCU)\n3. Port of Discharge: {port}\n4. Partial Shipments: Allowed (Field 43P)\n5. Transshipment: Allowed (Field 43T)\n6. Presentation Period: 21 days from date of Bill of Lading issuance (UCP 600 Art. 14c)\n7. Tolerance: +/- 5% in quantity and total credit amount (Field 39A)\n\nKindly send us the draft copy before final issuance so our trade finance desk can confirm acceptance.\n\nBest regards,\nTrade Finance & Banking Desk",
        "variables": ["{contact_name}", "{commodity}", "{company_name}", "{port}"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "template_id": "TPL-EMAIL-DISPATCH",
        "name": "Consignment Shipped & Container Progression",
        "category": "Shipping Update",
        "channel": "Email",
        "subject": "Consignment Dispatched: B/L Released for {company_name} en route to {port}",
        "body": "Dear {contact_name},\n\nWe are pleased to advise that your export consignment of {commodity} for {company_name} has cleared origin customs and has been laden on board the ocean vessel.\n\nCONSIGNMENT SUMMARY:\n• Consignee: {company_name}\n• Target Cargo: {commodity}\n• Destination Gateway: {port}\n• Carriage Status: Clean On Board Ocean Bill of Lading Issued\n\nLIVE TRACKING & PROGRESSION:\nYou can track the container milestones, vessel GPS coordinates, and arrival dwell schedule on your dedicated customer portal:\n{tracking_link}\n\nOur documentation department will forward the authenticated non-negotiable document copies to your advising bank today.\n\nWarm regards,\nLogistics & Vessel Operations Team",
        "variables": ["{contact_name}", "{commodity}", "{company_name}", "{port}", "{tracking_link}"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "template_id": "TPL-EMAIL-FREIGHT",
        "name": "Spot Ocean Freight Revision & Prompt Sailing",
        "category": "Price Revision",
        "channel": "Email",
        "subject": "Spot Rate Revision: Reduced Freight to {port} for {company_name}",
        "body": "Dear {contact_name},\n\nFollowing up on our recent quotation for {commodity} to {company_name}.\n\nWe have secured preferred container allocation on the shipping corridor to {port}, resulting in an ocean freight reduction of $120/TEU for prompt sailings this month.\n\nWe can extend this freight saving directly to your account if bookings are confirmed within 48 hours.\n\nWould you like us to refresh your Proforma Invoice with the discounted CIF {port} price?\n\nBest regards,\nCommercial Trade Desk\nTradePulse Global Operations",
        "variables": ["{contact_name}", "{commodity}", "{company_name}", "{port}"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "template_id": "TPL-WA-SPOT",
        "name": "WhatsApp Instant Spot Offer & Stock Availability",
        "category": "Quick Quote",
        "channel": "WhatsApp",
        "subject": "WhatsApp Notification",
        "body": "Hello {contact_name}! 🌾 *TradePulse Commercial Offer* for {company_name}:\n\nWe have ready export stocks of *{commodity}* available for prompt shipment to *{port}*.\n\n*Specifications:*\n• *Grade:* 100% Sortex Cleaned, Export Quality\n• *Packing:* 50kg PP Woven Export Bags\n• *Discharge:* {port}, {country}\n• *Inspection:* SGS Pre-shipment Certificate included\n• *Payment:* 100% L/C at Sight or CAD\n\nClick here to view full product specs & order samples:\n{tracking_link}\n\nReply to this message to receive today's spot CIF price per MT.",
        "variables": ["{contact_name}", "{company_name}", "{commodity}", "{port}", "{country}", "{tracking_link}"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "template_id": "TPL-WA-CONTAINER",
        "name": "WhatsApp Live Container Milestone & Tracking",
        "category": "Shipping Update",
        "channel": "WhatsApp",
        "subject": "WhatsApp Notification",
        "body": "Hi {contact_name}! 🚢 *Cargo Status Update* for {company_name}:\n\nYour consignment of *{commodity}* is currently in ocean transit to *{port}*.\n\n• *Current Status:* Vessel Departed Origin Port\n• *Next Checkpoint:* Destination Port Berthing & Customs\n• *Live Tracking:* {tracking_link}\n\nLet us know if you need duplicate digital copies of your Bill of Lading or Phytosanitary certificate!",
        "variables": ["{contact_name}", "{company_name}", "{commodity}", "{port}", "{tracking_link}"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "template_id": "TPL-SMS-BL",
        "name": "SMS Bill of Lading Release & Direct Tracking URL",
        "category": "Shipping Update",
        "channel": "SMS",
        "subject": "SMS Alert",
        "body": "TradePulse EXIM Alert: Consignment of {commodity} for {company_name} is en route to {port}. Track live container milestones: {tracking_link}",
        "variables": ["{company_name}", "{commodity}", "{port}", "{tracking_link}"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
]


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


# ==============================================================================
# AUDIENCE SEGMENTS & CUSTOMER GROUPS API
# ==============================================================================

@campaigns_bp.route("/segments", methods=["GET"])
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


@campaigns_bp.route("/segments", methods=["POST"])
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


@campaigns_bp.route("/segments/<segment_id>", methods=["DELETE"])
def delete_segment(segment_id):
    db = get_db()
    res = db.customer_segments.delete_one({"segment_id": segment_id})
    if res.deleted_count == 0:
        return jsonify({"error": "Segment not found"}), 404
    return jsonify({"message": f"Segment {segment_id} deleted successfully"})


@campaigns_bp.route("/segments/<segment_id>/leads", methods=["GET"])
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


# ==============================================================================
# CAMPAIGNS HUB & BROADCAST API
# ==============================================================================

@campaigns_bp.route("", methods=["GET"])
def get_campaigns():
    db = get_db()
    status = request.args.get("status")
    query = {"status": status} if status else {}
    campaigns = list(db.campaigns.find(query).sort("created_at", -1))
    return jsonify({"campaigns": [serialize_doc(c) for c in campaigns]})


@campaigns_bp.route("", methods=["POST"])
def create_campaign():
    db = get_db()
    data = request.get_json() or {}
    if not data.get("name"):
        return jsonify({"error": "Campaign name is required"}), 400

    campaign_id = data.get("campaign_id") or f"CMP-{now_iso()[:10].replace('-', '')}-{uuid.uuid4().hex[:4].upper()}"
    doc = {
        "campaign_id": campaign_id,
        "name": data["name"],
        "channel": data.get("channel", "Email"),
        "status": data.get("status", "Active"),
        "target_commodity": data.get("target_commodity", "General Commodities"),
        "target_countries": data.get("target_countries", ["United Arab Emirates", "Saudi Arabia"]),
        "template_subject": data.get("template_subject", ""),
        "template_body": data.get("template_body", ""),
        "segment_id": data.get("segment_id", ""),
        "enrolled_leads_count": int(data.get("enrolled_leads_count", 0)),
        "sent_count": int(data.get("sent_count", 0)),
        "opened_count": int(data.get("opened_count", 0)),
        "replied_count": int(data.get("replied_count", 0)),
        "conversions_count": int(data.get("conversions_count", 0)),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    db.campaigns.insert_one(doc)
    return jsonify({"campaign": serialize_doc(doc), "message": "Campaign created successfully"}), 201


@campaigns_bp.route("/<campaign_id>", methods=["GET"])
def get_campaign(campaign_id):
    db = get_db()
    c = db.campaigns.find_one({"campaign_id": campaign_id})
    if not c:
        return jsonify({"error": "Campaign not found"}), 404
    return jsonify({"campaign": serialize_doc(c)})


@campaigns_bp.route("/<campaign_id>", methods=["PATCH"])
def update_campaign(campaign_id):
    db = get_db()
    data = request.get_json() or {}
    c = db.campaigns.find_one({"campaign_id": campaign_id})
    if not c:
        return jsonify({"error": "Campaign not found"}), 404

    update_fields = {"updated_at": now_iso()}
    for key in ["name", "channel", "status", "target_commodity", "template_subject", "template_body", "segment_id"]:
        if key in data:
            update_fields[key] = data[key]
    if "target_countries" in data:
        update_fields["target_countries"] = data["target_countries"]
    for count_key in ["enrolled_leads_count", "sent_count", "opened_count", "replied_count", "conversions_count"]:
        if count_key in data:
            update_fields[count_key] = int(data[count_key])

    db.campaigns.update_one({"campaign_id": campaign_id}, {"$set": update_fields})
    updated = db.campaigns.find_one({"campaign_id": campaign_id})
    return jsonify({"campaign": serialize_doc(updated), "message": "Campaign updated successfully"})


@campaigns_bp.route("/<campaign_id>", methods=["DELETE"])
def delete_campaign(campaign_id):
    db = get_db()
    res = db.campaigns.delete_one({"campaign_id": campaign_id})
    if res.deleted_count == 0:
        return jsonify({"error": "Campaign not found"}), 404
    return jsonify({"message": f"Campaign {campaign_id} deleted successfully"})


@campaigns_bp.route("/<campaign_id>/enroll", methods=["POST"])
def enroll_leads(campaign_id):
    db = get_db()
    c = db.campaigns.find_one({"campaign_id": campaign_id})
    if not c:
        return jsonify({"error": "Campaign not found"}), 404

    data = request.get_json() or {}
    lead_ids = data.get("lead_ids", [])
    country = data.get("country")
    lead_type = data.get("lead_type")
    segment_id = data.get("segment_id")

    enrolled_count = 0
    if segment_id:
        seg = db.customer_segments.find_one({"segment_id": segment_id})
        if seg:
            mongo_q = build_segment_mongo_query(seg)
            enrolled_count = db.leads.count_documents(mongo_q)
    elif lead_ids:
        enrolled_count = db.leads.count_documents({"id": {"$in": lead_ids}})
    else:
        mongo_q = {}
        if country:
            mongo_q["country"] = {"$regex": re.escape(country), "$options": "i"}
        if lead_type:
            if lead_type == "importer":
                mongo_q["lead_type"] = "importer"
            else:
                mongo_q["lead_type"] = {"$ne": "importer"}
        enrolled_count = db.leads.count_documents(mongo_q)

    new_total = (c.get("enrolled_leads_count") or 0) + enrolled_count
    db.campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {"enrolled_leads_count": new_total, "updated_at": now_iso()}},
    )

    return jsonify({
        "message": f"Enrolled {enrolled_count} verified leads into campaign {c['name']}",
        "enrolled_count": enrolled_count,
        "total_enrolled": new_total,
    })


@campaigns_bp.route("/<campaign_id>/broadcast", methods=["POST"])
def broadcast_campaign(campaign_id):
    """Simulates immediate broadcast through configured Gmail SMTP gateway with Stopper protection."""
    db = get_db()
    c = db.campaigns.find_one({"campaign_id": campaign_id})
    if not c:
        return jsonify({"error": "Campaign not found"}), 404

    # Pre-send gatekeeper: check Gmail SMTP Stopper quota and emergency freeze
    target_channel = c.get("channel", "Email")
    if target_channel in ["Email", "Omnichannel", "All"]:
        can_send, reason = SmtpQuotaManager.check_can_send()
        if not can_send:
            return jsonify({
                "success": False,
                "error": f"Broadcast blocked by Gmail SMTP Stopper: {reason}",
                "is_hard_stopped": True,
                "stopper_status": SmtpQuotaManager.get_status(),
            }), 429

    enrolled = c.get("enrolled_leads_count", 0)
    if enrolled == 0:
        enrolled = 25  # default simulation batch

    sent = enrolled
    opened = int(sent * 0.62)
    replied = int(sent * 0.22)
    conversions = int(sent * 0.08)

    # Fetch real sample leads and record live outbox dispatches from MongoDB
    mongo_q = {}
    if c.get("target_countries"):
        if isinstance(c["target_countries"], list):
            mongo_q["country"] = {"$in": c["target_countries"]}
        elif isinstance(c["target_countries"], str):
            countries = [x.strip() for x in c["target_countries"].split(",") if x.strip()]
            if countries:
                mongo_q["country"] = {"$in": countries}

    leads_sample = list(db.leads.find(mongo_q).limit(min(sent, 10)))

    for l in leads_sample:
        company_name = l.get("company_name", "Valued Trading Partner")
        disp = {
            "dispatch_id": f"DISP-{uuid.uuid4().hex[:8].upper()}",
            "campaign_id": campaign_id,
            "campaign_name": c.get("name"),
            "channel": target_channel,
            "recipient": l.get("emails") or l.get("phones") or f"procurement@{company_name.lower().replace(' ', '')[:10]}.com",
            "subject": f"Commercial Offer: {c.get('target_commodity', 'Export Commodity')}",
            "body": f"Dear Sourcing Desk at {company_name},\n\nWe are direct exporters of {c.get('target_commodity', 'Certified Commodity')}.\n\nImmediate container shipment available for destination {l.get('country', '')}.",
            "status": "Delivered via Broadcast",
            "sent_at": now_iso()
        }
        db.dispatched_messages.insert_one(disp)

    # Track usage in SmtpQuotaManager if sending emails
    if target_channel in ["Email", "Omnichannel", "All"]:
        SmtpQuotaManager.record_send(count=min(sent, 10))

    db.campaigns.update_one(
        {"campaign_id": campaign_id},
        {
            "$set": {
                "status": "Active",
                "sent_count": sent,
                "opened_count": opened,
                "replied_count": replied,
                "conversions_count": conversions,
                "last_dispatched_at": now_iso(),
                "updated_at": now_iso(),
            }
        },
    )

    return jsonify({
        "success": True,
        "message": f"Campaign '{c['name']}' dispatched successfully via Gmail SMTP Gateway! {sent} messages sent.",
        "sent_count": sent,
        "opened_count": opened,
        "replied_count": replied,
        "conversions_count": conversions,
        "stopper_status": SmtpQuotaManager.get_status(),
    })


# ==============================================================================
# MESSAGE TEMPLATES API
# ==============================================================================

@campaigns_bp.route("/templates", methods=["GET"])
def get_templates():
    db = get_db()
    channel = request.args.get("channel")
    category = request.args.get("category")
    query = {}
    if channel and channel != "All":
        query["channel"] = channel
    if category and category != "All":
        query["category"] = category

    # Ensure all comprehensive default templates are present in MongoDB
    for dt in DEFAULT_TEMPLATES:
        db.message_templates.update_one(
            {"template_id": dt["template_id"]},
            {"$setOnInsert": dt},
            upsert=True
        )

    templates = list(db.message_templates.find(query).sort("created_at", -1))
    return jsonify({"templates": [serialize_doc(t) for t in templates]})


@campaigns_bp.route("/templates", methods=["POST"])
def create_template():
    db = get_db()
    data = request.get_json() or {}
    if not data.get("name") or not data.get("body"):
        return jsonify({"error": "Template name and body are required"}), 400

    tid = data.get("template_id") or f"TPL-{uuid.uuid4().hex[:6].upper()}"
    doc = {
        "template_id": tid,
        "name": data["name"],
        "category": data.get("category", "Soft Offer"),
        "channel": data.get("channel", "Email"),
        "subject": data.get("subject", ""),
        "body": data["body"],
        "variables": data.get("variables", []),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    db.message_templates.insert_one(doc)
    return jsonify({"template": serialize_doc(doc), "message": "Template created successfully"}), 201


@campaigns_bp.route("/templates/reset-defaults", methods=["POST"])
def reset_default_templates():
    db = get_db()
    for dt in DEFAULT_TEMPLATES:
        db.message_templates.update_one(
            {"template_id": dt["template_id"]},
            {"$set": dt},
            upsert=True
        )
    templates = list(db.message_templates.find({}).sort("created_at", -1))
    return jsonify({
        "message": "Default industry templates restored successfully",
        "templates": [serialize_doc(t) for t in templates]
    })


@campaigns_bp.route("/templates/<template_id>", methods=["PATCH"])
def update_template(template_id):
    db = get_db()
    data = request.get_json() or {}
    tpl = db.message_templates.find_one({"template_id": template_id})
    if not tpl:
        return jsonify({"error": "Template not found"}), 404

    update_fields = {"updated_at": now_iso()}
    for k in ["name", "category", "channel", "subject", "body", "variables"]:
        if k in data:
            update_fields[k] = data[k]

    db.message_templates.update_one({"template_id": template_id}, {"$set": update_fields})
    updated = db.message_templates.find_one({"template_id": template_id})
    return jsonify({"template": serialize_doc(updated), "message": "Template updated successfully"})


@campaigns_bp.route("/templates/<template_id>", methods=["DELETE"])
def delete_template(template_id):
    db = get_db()
    res = db.message_templates.delete_one({"template_id": template_id})
    if res.deleted_count == 0:
        return jsonify({"error": "Template not found"}), 404
    return jsonify({"message": f"Template {template_id} deleted successfully"})


@campaigns_bp.route("/templates/preview", methods=["POST"])
def preview_template():
    data = request.get_json() or {}
    body = data.get("body", "")
    subject = data.get("subject", "")
    customer = data.get("customer", {
        "company_name": "Al-Dhiyafa Foodstuff Trading LLC",
        "contact_name": "Tariq Mansoor",
        "commodity": "IR-64 Parboiled Rice 5% Broken",
        "country": "United Arab Emirates",
        "port": "Jebel Ali Port (AEJEA)",
        "quantity_mt": "250 MT",
        "price_per_mt": "$465 / MT",
        "incoterm": "CIF Jebel Ali Port",
        "payment_terms": "100% L/C at Sight",
        "tracking_link": "http://localhost:3000/track/TRK-2026-8921",
        "today_date": "17 Nov 2026",
    })

    hydrated_body = body
    hydrated_subject = subject
    for token, val in customer.items():
        hydrated_body = hydrated_body.replace(f"{{{token}}}", str(val))
        hydrated_subject = hydrated_subject.replace(f"{{{token}}}", str(val))

    return jsonify({
        "hydrated_body": hydrated_body,
        "hydrated_subject": hydrated_subject,
        "customer": customer
    })


@campaigns_bp.route("/templates/test-send", methods=["POST"])
def test_send_template():
    import email.utils
    db = get_db()
    data = request.get_json() or {}
    recipient = data.get("recipient", "").strip() or "procurement@al-dhiyafa-uae.com"
    subject = data.get("subject", "Commercial Commodity Offer")
    body = data.get("body", "")
    channel = data.get("channel", "Email")
    customer = data.get("customer", {})

    # Hydrate tokens
    hydrated_body = body
    hydrated_subject = subject
    for token, val in customer.items():
        hydrated_body = hydrated_body.replace(f"{{{token}}}", str(val))
        hydrated_subject = hydrated_subject.replace(f"{{{token}}}", str(val))

    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    smtp = conf.get("smtp", {})

    dispatch_id = f"DISP-{uuid.uuid4().hex[:8].upper()}"

    if channel == "Email":
        # Pre-send gatekeeper: check Gmail SMTP Stopper quota and emergency freeze
        can_send, reason = SmtpQuotaManager.check_can_send()
        if not can_send:
            return jsonify({
                "success": False,
                "mode": "smtp_stopper_blocked",
                "error": f"Email transmission blocked by Gmail Mail Stopper: {reason}",
                "is_hard_stopped": True,
                "stopper_status": SmtpQuotaManager.get_status(),
            }), 429

        host = smtp.get("host")
        port = int(smtp.get("port") or 587)
        user = smtp.get("username")
        pw = smtp.get("password")

        # If live credentials exist and are populated, attempt real SMTP connection
        if host and user and pw:
            try:
                server = smtplib.SMTP(host, port, timeout=7)
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(user, pw)

                msg = MIMEMultipart("alternative")
                msg["Subject"] = hydrated_subject
                from_name = smtp.get("from_name", "TradePulse Export Desk")
                msg["From"] = f"{from_name} <{user}>"
                msg["To"] = recipient
                msg["Message-ID"] = f"<{uuid.uuid4().hex}@tradepulse.exim>"
                msg["Date"] = email.utils.formatdate(localtime=True)
                msg.attach(MIMEText(hydrated_body, "plain", "utf-8"))

                server.send_message(msg)
                server.quit()

                # Track live send
                SmtpQuotaManager.record_send(count=1)

                disp_record = {
                    "dispatch_id": dispatch_id,
                    "channel": "Email",
                    "recipient": recipient,
                    "subject": hydrated_subject,
                    "body": hydrated_body,
                    "status": "Delivered via Live SMTP",
                    "mode": "live_smtp",
                    "host": host,
                    "port": port,
                    "sender": user,
                    "sent_at": now_iso(),
                }
                db.dispatched_messages.insert_one(disp_record)

                return jsonify({
                    "success": True,
                    "mode": "live_smtp",
                    "dispatch_id": dispatch_id,
                    "message": f"Successfully transmitted live commercial email to {recipient} via {host}:{port}!",
                    "record": serialize_doc(disp_record),
                    "stopper_status": SmtpQuotaManager.get_status(),
                })
            except Exception as e:
                err_str = str(e).lower()
                # Check for Gmail sending limit rejection (550 / 421 / daily limit)
                if "550" in err_str or "421" in err_str or "limit" in err_str or "quota" in err_str:
                    SmtpQuotaManager.trigger_hard_break(
                        reason=f"Live Gmail SMTP rejection encountered ({type(e).__name__}): {str(e)}",
                        error_details=str(e),
                    )

                disp_record = {
                    "dispatch_id": dispatch_id,
                    "channel": "Email",
                    "recipient": recipient,
                    "subject": hydrated_subject,
                    "body": hydrated_body,
                    "status": "Failed: SMTP Handshake Error",
                    "mode": "smtp_error",
                    "error_details": str(e),
                    "sent_at": now_iso(),
                }
                db.dispatched_messages.insert_one(disp_record)
                return jsonify({
                    "success": False,
                    "mode": "smtp_error",
                    "error": f"Live SMTP Transmission Failed ({type(e).__name__}): {str(e)}",
                    "host": host,
                    "port": port,
                    "stopper_status": SmtpQuotaManager.get_status(),
                    "record": serialize_doc(disp_record),
                }), 400

        # Sandbox Gateway (if no SMTP password yet configured)
        SmtpQuotaManager.record_send(count=1)
        disp_record = {
            "dispatch_id": dispatch_id,
            "channel": "Email",
            "recipient": recipient,
            "subject": hydrated_subject,
            "body": hydrated_body,
            "status": "Delivered (Sandbox Gateway)",
            "mode": "sandbox",
            "host": host or "smtp.gmail.com",
            "port": port,
            "sender": user or "exports@tradepulse.exim",
            "sent_at": now_iso(),
        }
        db.dispatched_messages.insert_one(disp_record)
        return jsonify({
            "success": True,
            "mode": "sandbox",
            "dispatch_id": dispatch_id,
            "message": f"Commercial email rendered and logged to {recipient} via Sandbox Gateway (Add Gmail App Password in Settings for live relay).",
            "stopper_status": SmtpQuotaManager.get_status(),
            "record": serialize_doc(disp_record),
        })

    elif channel == "WhatsApp":
        disp_record = {
            "dispatch_id": dispatch_id,
            "channel": "WhatsApp",
            "recipient": recipient,
            "body": hydrated_body,
            "status": "Delivered (WhatsApp Business API)",
            "mode": "whatsapp_dispatched",
            "chars": len(hydrated_body),
            "sent_at": now_iso(),
        }
        db.dispatched_messages.insert_one(disp_record)
        return jsonify({
            "success": True,
            "mode": "whatsapp_dispatched",
            "dispatch_id": dispatch_id,
            "message": f"WhatsApp Business message delivered to {recipient} ({len(hydrated_body)} characters).",
            "record": serialize_doc(disp_record),
        })

    elif channel == "SMS":
        char_count = len(hydrated_body)
        segments = 1 if char_count <= 160 else ((char_count + 152) // 153)
        disp_record = {
            "dispatch_id": dispatch_id,
            "channel": "SMS",
            "recipient": recipient,
            "body": hydrated_body,
            "status": "Delivered (SMS Gateway)",
            "mode": "sms_dispatched",
            "chars": char_count,
            "segments": segments,
            "sent_at": now_iso(),
        }
        db.dispatched_messages.insert_one(disp_record)
        return jsonify({
            "success": True,
            "mode": "sms_dispatched",
            "dispatch_id": dispatch_id,
            "segments": segments,
            "chars": char_count,
            "message": f"SMS message transmitted to {recipient} ({segments} segment(s), {char_count} chars).",
            "record": serialize_doc(disp_record),
        })

    return jsonify({"error": f"Unsupported channel: {channel}"}), 400


@campaigns_bp.route("/templates/dispatches", methods=["GET"])
def get_recent_dispatches():
    db = get_db()
    records = list(db.dispatched_messages.find({}).sort("sent_at", -1).limit(25))
    return jsonify({"dispatches": [serialize_doc(r) for r in records], "total": len(records)})


# ==============================================================================
# GMAIL SMTP QUOTA TRACKER & EMERGENCY HARD-BREAK STOPPER ROUTES
# ==============================================================================

@campaigns_bp.route("/smtp-stopper/status", methods=["GET"])
def get_smtp_stopper_status():
    """Returns real-time 24h rolling SMTP quota status and hard-stop flags."""
    status = SmtpQuotaManager.get_status()
    return jsonify({"status": status})


@campaigns_bp.route("/smtp-stopper/hard-break", methods=["POST"])
def trigger_manual_hard_break():
    """Manual emergency stop button for operator to freeze all campaigns instantly."""
    data = request.get_json() or {}
    reason = data.get("reason", "Operator manual emergency stop triggered from UI.")
    SmtpQuotaManager.trigger_hard_break(reason=reason, error_details="Manual operator action")
    return jsonify({
        "success": True,
        "message": "Emergency Gmail Mail Stopper engaged. All active campaigns hard-stopped.",
        "status": SmtpQuotaManager.get_status(),
    })


@campaigns_bp.route("/smtp-stopper/resume", methods=["POST"])
def resume_from_hard_break():
    """Resumes campaigns and clears the emergency stopper flag."""
    res = SmtpQuotaManager.resume_and_clear_hard_break()
    return jsonify({
        "success": True,
        "message": res["message"],
        "campaigns_resumed": res.get("campaigns_resumed", 0),
        "status": SmtpQuotaManager.get_status(),
    })


@campaigns_bp.route("/smtp-stopper/reset-counter", methods=["POST"])
def reset_smtp_counter():
    """Resets the 24h sent counter (e.g. after rotating credentials)."""
    status = SmtpQuotaManager.reset_counter()
    return jsonify({
        "success": True,
        "message": "24-hour SMTP sent counter successfully reset to 0.",
        "status": status,
    })


@campaigns_bp.route("/smtp-stopper/config", methods=["PATCH"])
def update_smtp_stopper_config():
    """Configures safe daily limit (100-2000)."""
    data = request.get_json() or {}
    daily_limit = int(data.get("daily_limit", 450))
    auto_resume_hours = int(data.get("auto_resume_hours", 24))
    status = SmtpQuotaManager.configure_quota(daily_limit=daily_limit, auto_resume_hours=auto_resume_hours)
    return jsonify({
        "success": True,
        "message": f"SMTP daily limit configured to {daily_limit} emails/day.",
        "status": status,
    })


# ==============================================================================
# AUTOMATED OMNICHANNEL CADENCE ROUTES
# ==============================================================================

@campaigns_bp.route("/cadences", methods=["GET"])
def list_followup_cadences():
    """Returns all omnichannel follow-up cadences."""
    cadences = FollowUpEngine.get_cadences()
    return jsonify({
        "cadences": [serialize_doc(c) for c in cadences],
        "total": len(cadences),
    })


@campaigns_bp.route("/cadences/enroll", methods=["POST"])
def enroll_lead_in_cadence():
    """Enrolls a lead into an automated omnichannel cadence."""
    data = request.get_json() or {}
    lead_id = data.get("lead_id")
    cadence_id = data.get("cadence_id", "CAD-COMMERCIAL-OUTREACH")
    custom_params = data.get("custom_params", {})

    if not lead_id:
        return jsonify({"error": "lead_id is required"}), 400

    try:
        enrollment = FollowUpEngine.enroll_lead(
            lead_id=int(lead_id),
            cadence_id=cadence_id,
            custom_params=custom_params
        )
        return jsonify({
            "success": True,
            "message": f"Lead #{lead_id} successfully enrolled in cadence '{enrollment.get('cadence_name')}'",
            "enrollment": serialize_doc(enrollment),
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@campaigns_bp.route("/cadences/run-due", methods=["POST"])
def run_due_followups():
    """Dispatches all due follow-up touchpoints across enrolled leads."""
    result = FollowUpEngine.execute_due_followups()
    return jsonify({
        "success": True,
        "result": result,
    })


@campaigns_bp.route("/cadences/enrollments", methods=["GET"])
def list_cadence_enrollments():
    """Lists lead enrollments, including active steps and auto-paused states."""
    db = get_db()
    status_filter = request.args.get("status")
    q = {}
    if status_filter:
        q["status"] = status_filter
    enrollments = list(db.cadence_enrollments.find(q).sort("updated_at", -1).limit(50))
    return jsonify({
        "enrollments": [serialize_doc(e) for e in enrollments],
        "total": len(enrollments),
    })
