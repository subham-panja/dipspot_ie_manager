"""
Omnichannel Unified Communications Hub & AI True Native CMS API.

Centralizes Gmail SMTP email, WhatsApp, and Chatwoot Website Live Chat
conversations into a single unified customer timeline.
Chatwoot-specific routes live in omnichannel_chatwoot.py (chatwoot_bp).
"""

import re
import uuid

from flask import Blueprint, jsonify, request
from app.campaign_enrollment_service import canonical_campaign_lead_id, lead_id_candidates
from app.chatwoot_client import get_client, get_inbox_id, normalise_channel
from app.chatwoot_sync import upsert_conversation_meta
from app.config import get_chatwoot_config
from app.db import get_db, now_iso
from app.followup_engine import FollowUpEngine
from app.omnichannel_ai import classify_inbound_intent, generate_ai_smart_draft  # noqa: F401
from app.routes.api_helpers import find_mongo_lead
from app.routes.omnichannel_helpers import (
    WHATSAPP_STATUS_STATIC,
    badge_color_for_intent,
    build_chatwoot_url,
    build_thread_chatwoot_meta,
    build_timeline,
    parse_visitor_conv_id,
    serialize_doc,
)
from app.smtp_stopper import SmtpQuotaManager

omnichannel_bp = Blueprint("omnichannel", __name__, url_prefix="/api/omnichannel")


@omnichannel_bp.route("/threads", methods=["GET"])
def get_threads():
    """Lists all customer communication threads (leads + Chatwoot visitor) with harmonized schema."""
    db = get_db()
    cfg = get_chatwoot_config(db, include_secrets=False)
    pipeline = [
        {"$sort": {"timestamp": -1}},
        {
            "$group": {
                "_id": "$lead_id",
                "company_name": {"$first": "$company_name"},
                "latest_message": {"$first": "$content"},
                "latest_channel": {"$first": "$channel"},
                "latest_direction": {"$first": "$direction"},
                "latest_timestamp": {"$first": "$timestamp"},
                "intent": {"$first": "$intent"},
                "sentiment": {"$first": "$sentiment"},
                "urgency": {"$first": "$urgency"},
                "total_messages": {"$sum": 1},
                "unread_count": {"$sum": {"$cond": [{"$eq": ["$direction", "inbound"]}, 1, 0]}},
                "chatwoot_conversation_id": {"$first": "$chatwoot_conversation_id"},
                "chatwoot_contact_id": {"$first": "$chatwoot_contact_id"},
                "chatwoot_synced": {"$first": "$chatwoot_synced"},
                "is_visitor_thread": {"$first": "$is_visitor_thread"},
            }
        },
        {"$sort": {"latest_timestamp": -1}},
    ]
    raw_threads = list(db.omnichannel_messages.aggregate(pipeline))

    cadence_map, lead_id_pool = {}, []
    for t in raw_threads:
        if not t.get("is_visitor_thread") and t["_id"] is not None:
            lead_id_pool.extend(lead_id_candidates(t["_id"]))
    if lead_id_pool:
        for enr in db.cadence_enrollments.find({"lead_id": {"$in": lead_id_pool}}).sort("updated_at", -1):
            cadence_map.setdefault(str(enr.get("lead_id")), enr)

    cw_meta_by_lead, cw_meta_by_visitor = {}, {}
    for meta in db.chatwoot_conversation_meta.find({}).sort("updated_at", -1):
        if meta.get("lead_id") is not None:
            cw_meta_by_lead.setdefault(str(meta.get("lead_id")), meta)
        if meta.get("visitor_thread_id"):
            cw_meta_by_visitor.setdefault(str(meta.get("visitor_thread_id")), meta)

    threads = []
    for t in raw_threads:
        lead_id = t["_id"]
        is_visitor = bool(t.get("is_visitor_thread"))
        lead = find_mongo_lead(db, str(lead_id)) if not is_visitor else None
        latest_msg = t.get("latest_message", "")
        intent_val = t.get("intent") or "Outbound Contacted"
        ts = t.get("latest_timestamp")

        enr = cadence_map.get(str(lead_id))
        if not enr and lead is not None:
            enr = next((cadence_map[str(c)] for c in lead_id_candidates(lead) if str(c) in cadence_map), None)
        cadence_status = enr.get("status", "") if enr else ""
        cadence_paused = bool(enr and ("Paused" in str(cadence_status) or enr.get("has_replied")))

        meta = cw_meta_by_visitor.get(str(lead_id)) if is_visitor else cw_meta_by_lead.get(str(lead_id))
        cw_conv_id = t.get("chatwoot_conversation_id") or (meta.get("conversation_id") if meta else None)
        cw_contact_id = t.get("chatwoot_contact_id") or (meta.get("contact_id") if meta else None)
        cw_synced = bool(t.get("chatwoot_synced")) or bool(meta and meta.get("conversation_id") is not None)
        first_email = next((e.strip() for e in re.split(r"[;,]", str(lead.get("emails") or "")) if "@" in e), "") if lead else ""
        first_phone = next((p.strip() for p in re.split(r"[;,]", str(lead.get("direct_phone") or lead.get("phones") or "")) if p.strip()), "") if lead else ""

        threads.append({
            "lead_id": lead_id,
            "company_name": t.get("company_name") or (lead.get("company_name", "Visitor") if lead else "Website Visitor"),
            "country": lead.get("country", "") if lead else "",
            "contact_person": lead.get("contact_person", "Procurement Desk") if lead else "",
            "email": first_email,
            "phone": first_phone,
            "deal_status": lead.get("deal_status", "unassigned") if lead else "visitor",
            "latest_message": latest_msg,
            "latest_channel": t.get("latest_channel", "Email"),
            "latest_direction": t.get("latest_direction", "outbound"),
            "latest_timestamp": ts,
            "intent": intent_val,
            "sentiment": t.get("sentiment") or "Neutral",
            "urgency": t.get("urgency") or "Medium",
            "badge_color": badge_color_for_intent(intent_val),
            "unread_count": int(t.get("unread_count") or 0),
            "total_messages": t.get("total_messages", 0),
            "thread_id": str(lead_id),
            "last_message": latest_msg,
            "latest_intent": intent_val,
            "last_activity_at": ts,
            "cadence_status": cadence_status,
            "cadence_paused": cadence_paused,
            "chatwoot_conversation_id": cw_conv_id,
            "chatwoot_contact_id": cw_contact_id,
            "chatwoot_synced": cw_synced,
            "chatwoot_url": build_chatwoot_url(cfg, cw_conv_id),
            "is_visitor_thread": is_visitor,
        })

    return jsonify({"threads": threads, "total": len(threads)})


@omnichannel_bp.route("/threads/<lead_id>", methods=["GET"])
def get_thread_detail(lead_id: str):
    """Full chronological message history for a lead or Chatwoot visitor thread."""
    db = get_db()
    cfg = get_chatwoot_config(db, include_secrets=False)

    if str(lead_id).startswith("cw_conv_"):
        conv_val = parse_visitor_conv_id(str(lead_id))
        messages = list(db.omnichannel_messages.find({"$or": [{"lead_id": lead_id}, {"chatwoot_conversation_id": conv_val}]}).sort("timestamp", 1))
        has_meta = db.chatwoot_conversation_meta.count_documents({"$or": [{"visitor_thread_id": lead_id}, {"conversation_id": conv_val}]}) > 0
        if not messages and not has_meta:
            return jsonify({"error": "Thread not found"}), 404
        return jsonify({
            "lead": None,
            "messages": [serialize_doc(m) for m in messages],
            "timeline": build_timeline(messages),
            "cadence_enrollment": None,
            "is_visitor_thread": True,
            "chatwoot": build_thread_chatwoot_meta(db, lead_id, messages, cfg),
        })

    lead = find_mongo_lead(db, lead_id)
    if not lead:
        return jsonify({"error": "Lead not found"}), 404

    cands = lead_id_candidates(lead)
    canon_lid = canonical_campaign_lead_id(lead)
    messages = list(db.omnichannel_messages.find({"lead_id": {"$in": cands}}).sort("timestamp", 1))
    cadence_enr = db.cadence_enrollments.find_one({"lead_id": {"$in": cands}})
    cadence_summary = None
    if cadence_enr:
        status_val = cadence_enr.get("status", "Active")
        cadence_summary = {
            **serialize_doc(cadence_enr),
            "status": status_val,
            "has_replied": bool(cadence_enr.get("has_replied")) or ("Paused" in str(status_val)),
        }

    return jsonify({
        "lead": serialize_doc(lead),
        "messages": [serialize_doc(m) for m in messages],
        "timeline": build_timeline(messages),
        "cadence_enrollment": cadence_summary,
        "chatwoot": build_thread_chatwoot_meta(db, canon_lid, messages, cfg, cands=cands),
    })


@omnichannel_bp.route("/threads/<lead_id>/reply", methods=["POST"])
@omnichannel_bp.route("/threads/<lead_id>/dispatch", methods=["POST"])
def send_reply(lead_id: str):
    """Send a reply via chosen channel and mirror outbound message to Chatwoot."""
    db = get_db()
    is_visitor = str(lead_id).startswith("cw_conv_")
    lead = None if is_visitor else find_mongo_lead(db, lead_id)

    visitor_conv_id = None
    if is_visitor:
        visitor_conv_id = parse_visitor_conv_id(str(lead_id))
        exists = (
            db.omnichannel_messages.count_documents({"$or": [{"lead_id": lead_id}, {"chatwoot_conversation_id": visitor_conv_id}]}) > 0
            or db.chatwoot_conversation_meta.count_documents({"$or": [{"visitor_thread_id": lead_id}, {"conversation_id": visitor_conv_id}]}) > 0
        )
        if not exists:
            return jsonify({"error": "Thread not found"}), 404
    elif not lead:
        return jsonify({"error": "Lead not found"}), 404

    data = request.get_json() or {}
    channel = normalise_channel(data.get("channel") or "Email") or "Email"
    content = (data.get("content") or "").strip()
    target_name = lead.get("company_name") if lead else "Website Visitor"
    subject = (data.get("subject") or f"Re: Commercial Inquiry - {target_name}").strip()
    contact_id = str(data.get("contact_id") or "").strip()
    if not content:
        return jsonify({"error": "Message content is required"}), 400

    if channel == "Email":
        can_send, reason = SmtpQuotaManager.check_can_send()
        if not can_send:
            return jsonify({
                "success": False, "error": "GMAIL_SMTP_HARD_STOPPED",
                "message": reason, "status": SmtpQuotaManager.get_status(),
            }), 429
        SmtpQuotaManager.record_send(1)
        status_label = "Delivered via Gmail SMTP"
    elif channel == "WhatsApp":
        status_label = "Delivered via WhatsApp Direct Session"
    else:
        status_label = "Delivered via Chatwoot Website Live Chat"

    dispatch_id = f"RPL-{channel[:2].upper()}-{uuid.uuid4().hex[:6].upper()}"
    canon_lid = f"cw_conv_{visitor_conv_id}" if is_visitor else canonical_campaign_lead_id(lead)
    cfg = get_chatwoot_config(db, include_secrets=True)
    client = get_client(db)
    cw_conv_id, cw_contact_id, cw_msg_id, chatwoot_synced = (visitor_conv_id if is_visitor else None), None, None, False
    content_attrs = {"tradepulse_message_id": dispatch_id}
    if channel == "Email":
        content_attrs["email"] = {"subject": subject}

    if client:
        if is_visitor and isinstance(visitor_conv_id, int):
            cw_data, _ = client.create_message(visitor_conv_id, content, "outgoing", content_attributes=content_attrs)
            if isinstance(cw_data, dict) and cw_data.get("id") is not None:
                cw_msg_id, chatwoot_synced = cw_data["id"], True
            upsert_conversation_meta(db, lead=None, conv_id=visitor_conv_id, status="open", channel=channel)
        elif lead is not None:
            cw_contact_id, _ = client.upsert_contact_for_lead(lead)
            if cw_contact_id is not None:
                conv_id, _ = client.upsert_conversation_for_lead(lead, cw_contact_id, get_inbox_id(cfg, channel), channel)
                if conv_id is not None:
                    cw_conv_id = conv_id
                    cw_data, _ = client.create_message(conv_id, content, "outgoing", content_attributes=content_attrs)
                    if isinstance(cw_data, dict) and cw_data.get("id") is not None:
                        cw_msg_id, chatwoot_synced = cw_data["id"], True
                    upsert_conversation_meta(db, lead=lead, conv_id=conv_id, contact_id=cw_contact_id, status="open", channel=channel)

    msg_doc = {
        "message_id": dispatch_id, "lead_id": canon_lid, "contact_id": contact_id,
        "company_name": target_name or "", "channel": channel, "direction": "outbound",
        "subject": subject if channel == "Email" else "", "content": content, "status": status_label,
        "timestamp": now_iso(), "chatwoot_synced": chatwoot_synced, "chatwoot_conversation_id": cw_conv_id,
        "chatwoot_contact_id": cw_contact_id, "chatwoot_message_id": cw_msg_id, "is_visitor_thread": is_visitor,
    }
    db.omnichannel_messages.insert_one(msg_doc)
    return jsonify({
        "success": True, "message_id": dispatch_id,
        "message": f"Successfully transmitted {channel} response to {target_name}!",
        "record": serialize_doc(msg_doc),
        "smtp_status": SmtpQuotaManager.get_status() if channel == "Email" else None,
    })


@omnichannel_bp.route("/threads/<lead_id>/ai-draft", methods=["POST"])
def get_ai_draft(lead_id: str):
    """Generates channel-aware AI draft for Email (formal), WhatsApp (brief), and Website (live)."""
    db = get_db()
    data = request.get_json() or {}
    channel = normalise_channel(data.get("channel") or "Email") or "Email"

    if str(lead_id).startswith("cw_conv_"):
        conv_val = parse_visitor_conv_id(str(lead_id))
        filt = {"$or": [{"lead_id": lead_id}, {"chatwoot_conversation_id": conv_val}]}
        last_inbound = db.omnichannel_messages.find_one({**filt, "direction": "inbound"}, sort=[("timestamp", -1)])
        if not last_inbound and not db.omnichannel_messages.find_one(filt) and db.chatwoot_conversation_meta.count_documents({"$or": [{"visitor_thread_id": lead_id}, {"conversation_id": conv_val}]}) == 0:
            return jsonify({"error": "Thread not found"}), 404
        customer = {"company_name": "Website Visitor", "contact_person": "Visitor", "matched_varieties": "Export Grade Rice", "nearest_port": "Destination Port"}
        canon_lid = str(lead_id)
    else:
        lead = find_mongo_lead(db, lead_id)
        if not lead:
            return jsonify({"error": "Lead not found"}), 404
        last_inbound = db.omnichannel_messages.find_one({"lead_id": {"$in": lead_id_candidates(lead)}, "direction": "inbound"}, sort=[("timestamp", -1)])
        customer, canon_lid = lead, canonical_campaign_lead_id(lead)

    last_text = last_inbound.get("content", "") if last_inbound else "Hello, please provide pricing."
    intent_info = classify_inbound_intent(last_text)
    draft_content = generate_ai_smart_draft(customer, last_text, intent_info, channel=channel)

    return jsonify({
        "lead_id": canon_lid, "company_name": customer.get("company_name"), "channel": channel,
        "ai_intent": intent_info,
        "draft_subject": f"SCO Spot Quotation: {customer.get('matched_varieties', 'Commodity')} CIF {customer.get('nearest_port', 'Port')}",
        "draft_content": draft_content,
    })


@omnichannel_bp.route("/inbound", methods=["POST"])
def receive_inbound_message():
    """Webhook / Simulation receiver for incoming customer replies (Gmail / WhatsApp)."""
    db = get_db()
    data = request.get_json() or {}
    lead_id = data.get("lead_id")
    channel = normalise_channel(data.get("channel") or "Email") or "Email"
    content = (data.get("content") or data.get("message_text") or "").strip()
    if not lead_id or not content:
        return jsonify({"error": "lead_id and content are required"}), 400

    lead = find_mongo_lead(db, lead_id)
    if not lead:
        return jsonify({"error": "Lead not found"}), 404

    canon_lid = canonical_campaign_lead_id(lead)
    intent_info = classify_inbound_intent(content)
    msg_id = f"IN-{channel[:2].upper()}-{uuid.uuid4().hex[:6].upper()}"
    db.omnichannel_messages.insert_one({
        "message_id": msg_id, "lead_id": canon_lid, "contact_id": str(data.get("contact_id") or "").strip(),
        "company_name": lead.get("company_name", ""), "channel": channel, "direction": "inbound",
        "sender": data.get("sender", "") or lead.get("emails", ""), "content": content, "status": "Received",
        "intent": intent_info["intent"], "sentiment": intent_info["sentiment"],
        "urgency": intent_info["urgency"], "timestamp": now_iso(), "chatwoot_synced": False,
    })
    FollowUpEngine.pause_on_client_reply(canon_lid, channel, content)
    if "Intent" in intent_info["intent"]:
        db.leads.update_one({"_id": lead["_id"]}, {"$set": {"deal_status": "negotiation", "updated_at": now_iso()}})

    return jsonify({
        "success": True, "message_id": msg_id, "classification": intent_info, "intent": intent_info,
        "cadence_status": "Paused (Client Replied)",
        "message": "Inbound communication ingested. Robotic cadences auto-paused.",
    }), 201


@omnichannel_bp.route("/whatsapp/status", methods=["GET"])
@omnichannel_bp.route("/whatsapp/legal-status", methods=["GET"])
def get_whatsapp_status():
    """Returns WhatsApp gateway status, daily message counts, and legal compliance info."""
    db = get_db()
    wa_count = db.omnichannel_messages.count_documents({
        "channel": "WhatsApp", "direction": "outbound", "timestamp": {"$regex": f"^{now_iso()[:10]}"},
    })
    return jsonify({"daily_messages_sent": wa_count, **WHATSAPP_STATUS_STATIC})
