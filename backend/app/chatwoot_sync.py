"""
M2 — Chatwoot Webhook Security, Lead Resolution & Bidirectional Sync Engine.

Handles HMAC-SHA256 + 300s expiry verification, X-Chatwoot-Delivery dedup,
multi-signal country-safe lead resolution, in-place message updates, zero-synthetic
lifecycle metadata sync, offline replay, pull sync, status, and correlation.
"""

import hashlib
import hmac as _hmac
import re
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

from flask import request
from app.campaign_enrollment_service import canonical_campaign_lead_id, lead_id_candidates
from app.chatwoot_client import get_client, get_inbox_id, normalise_channel
from app.config import get_chatwoot_config
from app.db import now_iso
from app.followup_engine import FollowUpEngine
from app.geo_database import GLOBAL_COUNTRY_DATABASE
from app.omnichannel_ai import classify_inbound_intent
from app.routes.api_helpers import find_mongo_lead

_WEBHOOK_MAX_AGE_SECS = 300
_COUNTRY_CALLING_CODES: Dict[str, str] = {
    c.lower(): re.sub(r"\D", "", str(info.get("phone_code") or ""))
    for c, info in GLOBAL_COUNTRY_DATABASE.items() if info.get("phone_code")
}
_KNOWN_CALLING_CODES: Tuple[str, ...] = tuple(sorted(set(_COUNTRY_CALLING_CODES.values()), key=len, reverse=True))


def _digits_only(raw: str) -> str:
    text = str(raw or "").strip()
    return re.sub(r"\D", "", text[2:] if text.startswith("00") else text)


def _extract_calling_code(digits: str) -> str:
    return next((c for c in _KNOWN_CALLING_CODES if digits.startswith(c) and len(digits) - len(c) >= 6), "")


def _phones_match(incoming_raw: str, candidate_raw: str, lead_country: str = "") -> bool:
    inc, cand = _digits_only(incoming_raw), _digits_only(candidate_raw)
    if len(inc) < 7 or len(cand) < 7:
        return False
    if inc == cand:
        return True
    lead_cc = _COUNTRY_CALLING_CODES.get(str(lead_country or "").strip().lower(), "")
    inc_cc = _extract_calling_code(inc) if (str(incoming_raw or "").strip().startswith(("+", "00")) or len(inc) > 10) else ""
    cand_cc = _extract_calling_code(cand) if (str(candidate_raw or "").strip().startswith(("+", "00")) or len(cand) > 10) else ""
    if (inc_cc and lead_cc and inc_cc != lead_cc) or (inc_cc and cand_cc and inc_cc != cand_cc):
        return False
    inc_nat = inc[len(inc_cc):] if inc_cc and inc.startswith(inc_cc) else inc
    cand_nat = cand[len(cand_cc):] if cand_cc and cand.startswith(cand_cc) else cand
    return len(inc_nat) >= 7 and inc_nat == cand_nat


def verify_chatwoot_signature(raw_body: bytes, secret: str, req=None) -> bool:
    """Validate X-Chatwoot-Signature (no unsigned fallback when X-Chatwoot-Timestamp is present)."""
    _req = req if req is not None else request
    sig_hdr, ts_hdr = _req.headers.get("X-Chatwoot-Signature", ""), _req.headers.get("X-Chatwoot-Timestamp", "")
    if not sig_hdr or not secret:
        return False
    try:
        signed = (ts_hdr.encode("utf-8") + b"." + raw_body) if ts_hdr else raw_body
        expected = _hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
        return _hmac.compare_digest(sig_hdr.removeprefix("sha256="), expected)
    except Exception:
        return False


def verify_webhook_with_expiry(raw_body: bytes, secret: str, req=None, max_age: int = _WEBHOOK_MAX_AGE_SECS) -> bool:
    """Validate HMAC signature and reject timestamps outside max_age seconds."""
    _req = req if req is not None else request
    ts_hdr = _req.headers.get("X-Chatwoot-Timestamp", "")
    if ts_hdr:
        try:
            if abs(time.time() - int(ts_hdr)) > max_age:
                return False
        except (ValueError, TypeError):
            return False
    return verify_chatwoot_signature(raw_body, secret, _req)


def is_duplicate_delivery(db, delivery_id: Optional[str], event: str = "") -> bool:
    """Atomically record X-Chatwoot-Delivery; return True if already seen."""
    did = str(delivery_id or "").strip()
    if not did:
        return False
    try:
        res = db.chatwoot_webhook_deliveries.update_one(
            {"delivery_id": did}, {"$setOnInsert": {"delivery_id": did, "event": event, "received_at": now_iso()}}, upsert=True
        )
        return res.upserted_id is None
    except Exception:
        return True


def extract_webhook_context(event_data: dict, cfg: Optional[dict] = None) -> Dict[str, Any]:
    """Normalise fields across message_created/updated, lifecycle, and webwidget events."""
    event = str(event_data.get("event") or "")
    conv = event_data.get("conversation") or event_data.get("current_conversation") or {}
    conv_id = conv.get("id") or event_data.get("conversation_id")
    if conv_id is None and event not in ("message_created", "message_updated"):
        conv_id = event_data.get("id")
    sender = (
        event_data.get("sender") or event_data.get("contact")
        or (conv.get("meta") or {}).get("sender") or (event_data.get("meta") or {}).get("sender") or {}
    )
    inbox = event_data.get("inbox") or conv.get("inbox") or {}
    inbox_id = inbox.get("id") or conv.get("inbox_id") or event_data.get("inbox_id")
    ch_raw = inbox.get("channel_type") or conv.get("channel") or event_data.get("channel") or ""
    channel = normalise_channel(ch_raw) if ch_raw else ""
    if not channel and cfg and inbox_id is not None:
        channel = next((ch for ch, f in (("Email", "email_inbox_id"), ("WhatsApp", "whatsapp_inbox_id"), ("Website", "website_inbox_id")) if str(cfg.get(f) or "") == str(inbox_id)), "")
    return {
        "event": event, "conv": conv, "conv_id": conv_id, "sender": sender,
        "contact_id": sender.get("id") if sender.get("id") is not None else conv.get("contact_id"),
        "inbox_id": inbox_id, "channel": channel or "Website",
        "status": conv.get("status") or event_data.get("status") or "",
        "custom_attrs": conv.get("custom_attributes") or event_data.get("custom_attributes") or {},
        "add_attrs": conv.get("additional_attributes") or event_data.get("additional_attributes") or {},
    }


def _id_variants(val: Any) -> List[Any]:
    if val is None or val == "":
        return []
    out: List[Any] = [val, str(val)]
    try:
        out.append(int(val))
    except (ValueError, TypeError):
        pass
    return list(dict.fromkeys(out))


def _lead_from_contact(db, contact: Optional[dict]) -> Optional[dict]:
    if not contact:
        return None
    lnk = db.company_contacts.find_one({"contact_id": contact.get("contact_id")})
    return find_mongo_lead(db, str(lnk["lead_id"])) if lnk else None


def resolve_lead_from_webhook(db, event_data: dict) -> Optional[dict]:
    """Resolve a TradePulse lead from a Chatwoot webhook or conversation payload."""
    ctx = extract_webhook_context(event_data)
    custom_attrs, add_attrs, sender = ctx["custom_attrs"], ctx["add_attrs"], ctx["sender"]

    for key in ("tradepulse_lead_id", "lead_id"):
        lid = custom_attrs.get(key) or add_attrs.get(key)
        if lid and (lead := find_mongo_lead(db, str(lid))):
            return lead

    identifier = str(sender.get("identifier") or "")
    for prefix in ("tradepulse_lead_", "lead_"):
        if identifier.startswith(prefix) and (lead := find_mongo_lead(db, identifier[len(prefix):])):
            return lead

    conv_cands, contact_cands = _id_variants(ctx["conv_id"]), _id_variants(ctx["contact_id"])
    for meta_q in (
        {"conversation_id": {"$in": conv_cands}, "lead_id": {"$nin": [None, ""]}} if conv_cands else None,
        {"contact_id": {"$in": contact_cands}, "lead_id": {"$nin": [None, ""]}} if contact_cands else None,
    ):
        meta = db.chatwoot_conversation_meta.find_one(meta_q) if meta_q else None
        if meta and not str(meta["lead_id"]).startswith("cw_conv_") and (lead := find_mongo_lead(db, str(meta["lead_id"]))):
            return lead

    if conv_cands:
        msg = db.omnichannel_messages.find_one({"chatwoot_conversation_id": {"$in": conv_cands}, "is_visitor_thread": {"$ne": True}})
        if msg and msg.get("lead_id") and not str(msg["lead_id"]).startswith("cw_conv_") and (lead := find_mongo_lead(db, str(msg["lead_id"]))):
            return lead

    email = str(sender.get("email") or "").strip()
    if email and "@" in email:
        tok_rx = {"$regex": rf"(?:^|[;,\s]){re.escape(email)}(?:$|[;,\s])", "$options": "i"}
        if (lead := db.leads.find_one({"is_deleted": {"$ne": True}, "$or": [{"emails": tok_rx}, {"primary_email": tok_rx}, {"secondary_email": tok_rx}]})):
            return lead
        if (lead := _lead_from_contact(db, db.contacts.find_one({"$or": [{"norm_email": email.lower()}, {"email": tok_rx}]}))):
            return lead

    phone = str(sender.get("phone_number") or "").strip()
    digits = _digits_only(phone)
    if len(digits) >= 7:
        tail_rx = r"[\s\-\(\)\.]*".join(re.escape(ch) for ch in digits[-7:])
        for cand_lead in db.leads.find({"is_deleted": {"$ne": True}, "$or": [{"direct_phone": {"$regex": tail_rx}}, {"phones": {"$regex": tail_rx}}]}):
            raw_vals = re.split(r"[;,]", f"{cand_lead.get('direct_phone', '')};{cand_lead.get('phones', '')}")
            if any(_phones_match(phone, rv, cand_lead.get("country", "")) for rv in raw_vals if rv.strip()):
                return cand_lead
        for contact in db.contacts.find({"$or": [{"phone": {"$regex": tail_rx}}, {"direct_phone": {"$regex": tail_rx}}]}):
            if _phones_match(phone, str(contact.get("direct_phone") or contact.get("phone") or "")) and (lead := _lead_from_contact(db, contact)):
                return lead
    return None


def upsert_conversation_meta(db, *, lead=None, conv_id: Any = None, contact_id: Any = None, status: str = "", channel: str = "") -> None:
    if conv_id is None:
        return
    now = now_iso()
    fields: Dict[str, Any] = {"conversation_id": conv_id, "updated_at": now}
    for k, v in (("contact_id", contact_id), ("conversation_status", status), ("channel", channel)):
        if v is not None and v != "":
            fields[k] = v
    op: Dict[str, Any] = {"$set": fields, "$setOnInsert": {"created_at": now}}
    if lead is not None:
        fields["lead_id"], fields["is_visitor_thread"] = canonical_campaign_lead_id(lead), False
        op["$unset"] = {"visitor_thread_id": ""}
    else:
        fields["visitor_thread_id"], fields["is_visitor_thread"] = f"cw_conv_{conv_id}", True
    db.chatwoot_conversation_meta.update_one({"conversation_id": conv_id}, op, upsert=True)


def _build_cw_message_doc(
    *, msg_prefix: str, lead: Optional[dict], conv_id: Any, cw_msg_id: Any, contact_id: Any,
    status: str, channel: str, direction: str, sender_label: str, content: str, visitor_name: str = "Website Visitor",
) -> Dict[str, Any]:
    info = classify_inbound_intent(content) if direction == "inbound" else {}
    return {
        "message_id": f"{msg_prefix}-{uuid.uuid4().hex[:6].upper()}", "lead_id": canonical_campaign_lead_id(lead) if lead else f"cw_conv_{conv_id}",
        "chatwoot_message_id": cw_msg_id, "chatwoot_conversation_id": conv_id, "chatwoot_contact_id": contact_id,
        "chatwoot_conversation_status": status or "open", "chatwoot_synced": True, "is_visitor_thread": lead is None,
        "company_name": lead.get("company_name", "") if lead else visitor_name, "channel": channel, "direction": direction,
        "sender": sender_label, "content": content, "status": "Received" if direction == "inbound" else "Delivered via Chatwoot",
        "intent": info.get("intent", ""), "sentiment": info.get("sentiment", ""), "urgency": info.get("urgency", ""), "timestamp": now_iso(),
    }


def ingest_chatwoot_message(db, event_data: dict, channel: str, direction: str, lead=None, ctx: Optional[dict] = None):
    """Store a Chatwoot webhook message in omnichannel_messages collection."""
    ctx = ctx or extract_webhook_context(event_data)
    content = (event_data.get("content") or "").strip()
    if not content:
        return None
    sender = ctx["sender"]
    doc = _build_cw_message_doc(
        msg_prefix=f"CW-{direction[:2].upper()}", lead=lead, conv_id=ctx["conv_id"], cw_msg_id=event_data.get("id"),
        contact_id=ctx["contact_id"], status=ctx["status"], channel=channel, direction=direction,
        sender_label=sender.get("email") or sender.get("phone_number") or sender.get("name") or "",
        content=content, visitor_name=sender.get("name") or "Website Visitor",
    )
    db.omnichannel_messages.insert_one(doc)
    return doc


def handle_webhook_event(db, payload: dict, cfg: Optional[dict] = None) -> Dict[str, Any]:
    """Process verified Chatwoot webhook event without inserting synthetic event docs."""
    ctx = extract_webhook_context(payload, cfg)
    event, channel, conv_id = ctx["event"], ctx["channel"], ctx["conv_id"]
    lead = resolve_lead_from_webhook(db, payload)

    if event == "message_created":
        direction = "inbound" if payload.get("message_type", "incoming") in ("incoming", "inbound", 0) else "outbound"
        cw_msg_id = payload.get("id")
        if direction == "outbound":
            tp_id = (payload.get("content_attributes") or {}).get("tradepulse_message_id")
            if (cw_msg_id is not None and db.omnichannel_messages.count_documents({"chatwoot_message_id": cw_msg_id}) > 0) or (
                tp_id and db.omnichannel_messages.count_documents({"message_id": tp_id}) > 0
            ):
                return {"success": True, "event": event, "note": "echo suppressed"}
        if direction == "inbound" and cw_msg_id is not None and db.omnichannel_messages.count_documents({"chatwoot_message_id": cw_msg_id, "direction": "inbound"}) > 0:
            return {"success": True, "event": event, "note": "duplicate skipped"}

        ingest_chatwoot_message(db, payload, channel, direction, lead, ctx=ctx)
        upsert_conversation_meta(db, lead=lead, conv_id=conv_id, contact_id=ctx["contact_id"], status=ctx["status"] or "open", channel=channel)
        if direction == "inbound" and lead:
            content = payload.get("content", "")
            FollowUpEngine.pause_on_client_reply(canonical_campaign_lead_id(lead), channel, content)
            intent_val = classify_inbound_intent(content).get("intent", "")
            if "High Commercial Intent" in intent_val or "Price Negotiation" in intent_val:
                db.leads.update_one({"_id": lead["_id"]}, {"$set": {"deal_status": "negotiation", "updated_at": now_iso()}})
        return {"success": True, "event": event, "channel": channel}

    if event == "message_updated":
        cw_msg_id, new_content = payload.get("id"), (payload.get("content") or "").strip()
        existing = db.omnichannel_messages.find_one({"chatwoot_message_id": {"$in": _id_variants(cw_msg_id)}}) if cw_msg_id is not None else None
        if existing and new_content:
            updates: Dict[str, Any] = {"content": new_content, "updated_at": now_iso()}
            if existing.get("direction") == "inbound":
                info = classify_inbound_intent(new_content)
                updates.update({"intent": info["intent"], "sentiment": info["sentiment"], "urgency": info["urgency"]})
            db.omnichannel_messages.update_one({"_id": existing["_id"]}, {"$set": updates})
        elif new_content:
            direction = "inbound" if payload.get("message_type", "incoming") in ("incoming", "inbound", 0) else "outbound"
            ingest_chatwoot_message(db, payload, channel, direction, lead, ctx=ctx)
        upsert_conversation_meta(db, lead=lead, conv_id=conv_id, contact_id=ctx["contact_id"], status=ctx["status"], channel=channel)
        return {"success": True, "event": event, "channel": channel}

    if event in ("conversation_created", "conversation_updated", "conversation_status_changed", "conversation_resolved", "webwidget_triggered"):
        status = ctx["status"] or ("resolved" if event == "conversation_resolved" else "open")
        upsert_conversation_meta(db, lead=lead, conv_id=conv_id, contact_id=ctx["contact_id"], status=status, channel=channel)
        if conv_id is not None and status:
            db.omnichannel_messages.update_many({"chatwoot_conversation_id": {"$in": _id_variants(conv_id)}}, {"$set": {"chatwoot_conversation_status": status}})
        return {"success": True, "event": event}

    return {"success": True, "event": event, "note": "acknowledged"}


def replay_unsynced_messages_for_lead(db, client, lead: dict, conv_id: int, contact_id: Optional[int] = None) -> int:
    """Push locally queued (offline) messages to Chatwoot and mark synced only on success."""
    unsynced = list(db.omnichannel_messages.find({
        "lead_id": {"$in": lead_id_candidates(lead)}, "chatwoot_synced": {"$ne": True}, "is_visitor_thread": {"$ne": True},
    }).sort("timestamp", 1))
    replayed = 0
    for msg in unsynced:
        if msg.get("chatwoot_message_id") is not None:
            db.omnichannel_messages.update_one({"_id": msg["_id"]}, {"$set": {"chatwoot_synced": True, "chatwoot_conversation_id": conv_id, "chatwoot_contact_id": contact_id}})
            replayed += 1
            continue
        attrs: Dict[str, Any] = {"tradepulse_message_id": msg.get("message_id")}
        if msg.get("channel") == "Email" and msg.get("subject"):
            attrs["email"] = {"subject": msg["subject"]}
        msg_type = "incoming" if msg.get("direction") == "inbound" else "outgoing"
        cw_data, _ = client.create_message(conv_id, msg.get("content", ""), message_type=msg_type, content_attributes=attrs)
        if isinstance(cw_data, dict) and cw_data.get("id") is not None:
            db.omnichannel_messages.update_one({"_id": msg["_id"]}, {"$set": {
                "chatwoot_synced": True, "chatwoot_conversation_id": conv_id,
                "chatwoot_message_id": cw_data["id"], "chatwoot_contact_id": contact_id,
            }})
            replayed += 1
    return replayed


def _sync_single_lead(db, client, cfg: dict, lead: dict, *, reuse_existing_meta: bool = False) -> Tuple[Optional[int], bool, Optional[int], bool, int]:
    contact_id, contact_created = client.upsert_contact_for_lead(lead)
    if contact_id is None:
        return None, False, None, False, 0
    existing_meta = db.chatwoot_conversation_meta.find_one({"lead_id": {"$in": lead_id_candidates(lead)}}, sort=[("updated_at", -1)])
    conv_id, conv_created = (existing_meta.get("conversation_id"), False) if (reuse_existing_meta and existing_meta and existing_meta.get("conversation_id") is not None) else (None, False)
    if conv_id is None:
        conv_id, conv_created = client.upsert_conversation_for_lead(lead, contact_id, get_inbox_id(cfg, "Email"))
    if conv_id is None and existing_meta:
        conv_id = existing_meta.get("conversation_id")
    replayed = 0
    if conv_id is not None:
        upsert_conversation_meta(db, lead=lead, conv_id=conv_id, contact_id=contact_id, status="open", channel="Email")
        replayed = replay_unsynced_messages_for_lead(db, client, lead, conv_id, contact_id)
    return contact_id, contact_created, conv_id, conv_created, replayed


def sync_lead_thread(db, lead_id: str) -> Tuple[Dict[str, Any], int]:
    lead = find_mongo_lead(db, lead_id)
    if not lead:
        return {"error": "Lead not found"}, 404
    cfg, client = get_chatwoot_config(db, include_secrets=True), get_client(db)
    if client is None:
        return {"success": True, "chatwoot_enabled": False, "message": "Chatwoot not configured; lead stored locally only."}, 200
    contact_id, contact_created, conv_id, conv_created, replayed = _sync_single_lead(db, client, cfg, lead)
    if contact_id is None:
        return {"success": False, "chatwoot_enabled": True, "error": "Failed to reach Chatwoot. Lead stored locally."}, 200
    return {
        "success": True, "chatwoot_enabled": True, "contact_id": contact_id, "contact_created": contact_created,
        "conversation_id": conv_id, "conversation_created": conv_created, "replayed_messages": replayed,
        "lead_id": canonical_campaign_lead_id(lead),
    }, 200


def pull_chatwoot_conversations(db, client, cfg: Optional[dict] = None) -> int:
    """Pull conversations and real messages from Chatwoot with lead correlation and dedup."""
    cw_data, _ = client.list_conversations()
    if not isinstance(cw_data, dict) or "data" not in cw_data:
        return 0
    pulled = 0
    for conv in cw_data["data"].get("payload") or []:
        conv_id = conv.get("id")
        if conv_id is None:
            continue
        lead = resolve_lead_from_webhook(db, conv)
        meta_sender = (conv.get("meta") or {}).get("sender") or {}
        contact_id = conv.get("contact_id") or meta_sender.get("id")
        chan = normalise_channel(conv.get("channel") or "") or "Website"
        upsert_conversation_meta(db, lead=lead, conv_id=conv_id, contact_id=contact_id, status=conv.get("status") or "open", channel=chan)

        msgs = conv.get("messages") or []
        if not msgs:
            fetched, st = client.list_messages(conv_id)
            if st == 200 and isinstance(fetched, list):
                msgs = fetched
        for m in msgs:
            cw_msg_id, content = m.get("id"), (m.get("content") or "").strip()
            if not content or (cw_msg_id is not None and db.omnichannel_messages.count_documents({"chatwoot_message_id": cw_msg_id}) > 0):
                continue
            tp_id = (m.get("content_attributes") or {}).get("tradepulse_message_id")
            if tp_id and db.omnichannel_messages.count_documents({"message_id": tp_id}) > 0:
                db.omnichannel_messages.update_one({"message_id": tp_id}, {"$set": {"chatwoot_synced": True, "chatwoot_message_id": cw_msg_id, "chatwoot_conversation_id": conv_id}})
                continue
            direction = "inbound" if (m.get("message_type") or "incoming") in ("incoming", "inbound", 0) else "outbound"
            db.omnichannel_messages.insert_one(_build_cw_message_doc(
                msg_prefix="CW-SYNC", lead=lead, conv_id=conv_id, cw_msg_id=cw_msg_id, contact_id=contact_id,
                status=conv.get("status") or "open", channel=chan, direction=direction,
                sender_label=meta_sender.get("email") or meta_sender.get("phone_number") or meta_sender.get("name") or "",
                content=content, visitor_name=meta_sender.get("name") or "Chatwoot Visitor",
            ))
            pulled += 1
    return pulled


def run_global_chatwoot_sync(db) -> Tuple[Dict[str, Any], int]:
    client = get_client(db)
    if client is None:
        return {"success": True, "chatwoot_enabled": False, "synced": 0, "message": "Chatwoot not configured; nothing to sync."}, 200
    cfg = get_chatwoot_config(db, include_secrets=True)
    unsynced = list(db.omnichannel_messages.aggregate([
        {"$match": {"chatwoot_synced": {"$ne": True}, "is_visitor_thread": {"$ne": True}}},
        {"$group": {"_id": "$lead_id"}}, {"$limit": 50},
    ]))
    synced_count = 0
    for item in unsynced:
        if item.get("_id") and (lead := find_mongo_lead(db, str(item["_id"]))):
            try:
                if _sync_single_lead(db, client, cfg, lead, reuse_existing_meta=True)[4] > 0:
                    synced_count += 1
            except Exception:
                continue
    pulled = pull_chatwoot_conversations(db, client, cfg)
    return {
        "success": True, "chatwoot_enabled": True, "synced": synced_count,
        "pulled_messages": pulled, "message": f"Synced {synced_count} lead thread(s) to Chatwoot.",
    }, 200


def build_chatwoot_status(db) -> Dict[str, Any]:
    cfg, client = get_chatwoot_config(db, include_secrets=True), get_client(db)
    configured = bool(cfg.get("enabled") and cfg.get("base_url") and cfg.get("api_access_token"))
    reachable, inboxes, status_code = False, [], None
    if client:
        try:
            inbox_list, status_code = client.list_inboxes()
            if isinstance(inbox_list, list):
                inboxes, reachable = inbox_list, True
        except Exception:
            reachable = False
    today_rx = {"$regex": f"^{now_iso()[:10]}"}
    synced_keys = {str(x) for x in db.omnichannel_messages.distinct("lead_id", {"chatwoot_synced": True}) if x is not None}
    for meta in db.chatwoot_conversation_meta.find({"conversation_id": {"$ne": None}}):
        if (key := meta.get("lead_id") if meta.get("lead_id") is not None else meta.get("visitor_thread_id")) is not None:
            synced_keys.add(str(key))
    ch_flags = {"email": bool(cfg.get("email_inbox_id")), "whatsapp": bool(cfg.get("whatsapp_inbox_id")), "website": bool(cfg.get("website_inbox_id") or cfg.get("website_token"))}
    return {
        "configured": configured, "enabled": bool(cfg.get("enabled")), "reachable": reachable, "status_code": status_code,
        "base_url": cfg.get("base_url", ""), "public_url": cfg.get("public_url") or cfg.get("base_url") or "",
        "account_id": cfg.get("account_id", ""), "inboxes": inboxes, "inboxes_count": len(inboxes),
        "total_synced_messages": db.omnichannel_messages.count_documents({"chatwoot_synced": True}),
        "synced_threads": len(synced_keys),
        "today": {
            k: db.omnichannel_messages.count_documents({"channel": ch, "direction": d, "timestamp": today_rx})
            for k, ch, d in (("email_outbound", "Email", "outbound"), ("whatsapp_outbound", "WhatsApp", "outbound"), ("website_inbound", "Website", "inbound"))
        },
        "channels": ch_flags,
        "channel_details": {k: {"inbox_id": cfg.get(f"{k}_inbox_id", ""), "configured": v, "status": "Active" if v else "Unconfigured"} for k, v in ch_flags.items()},
    }


def _corr_fields(lead: Optional[dict], conv_id: Any) -> Dict[str, Any]:
    lid = canonical_campaign_lead_id(lead) if lead else None
    return {
        "tradepulse_lead_id": lid,
        "tradepulse_company_name": lead.get("company_name", "") if lead else "",
        "thread_id": str(lid) if lead else f"cw_conv_{conv_id}",
    }


def correlate_conversations(db, page: int = 1) -> Dict[str, Any]:
    client = get_client(db)
    if client:
        try:
            data, _ = client.list_conversations(page=page)
            if isinstance(data, dict) and "data" in data:
                enriched = [{**conv, **_corr_fields(resolve_lead_from_webhook(db, conv), conv.get("id"))} for conv in (data["data"].get("payload") or [])]
                return {"source": "chatwoot", "conversations": enriched, "total": len(enriched)}
        except Exception:
            pass
    seen, local_convs = set(), []
    for meta in db.chatwoot_conversation_meta.find({"conversation_id": {"$ne": None}}).sort("updated_at", -1).limit(50):
        cid = meta.get("conversation_id")
        if cid in seen:
            continue
        seen.add(cid)
        lead = find_mongo_lead(db, str(meta["lead_id"])) if meta.get("lead_id") else None
        local_convs.append({"id": cid, "status": meta.get("conversation_status", "open"), **_corr_fields(lead, cid)})
    return {"source": "local_fallback", "conversations": local_convs, "total": len(local_convs)}
