"""Lead Notes, Activity Timeline, and Unified Outreach History API endpoints."""

import uuid
from flask import jsonify, request
from app.campaign_enrollment_service import lead_id_candidates
from app.contacts_service import canonical_lead_id
from app.db import get_db, now_iso
from app.routes.api_helpers import find_mongo_lead


def _serialize_doc(doc):
    if not doc:
        return None
    d = dict(doc)
    if "_id" in d:
        d["_id"] = str(d["_id"])
    return d


def _resolve_active_lead(mongo_db, lead_id: str):
    lead = find_mongo_lead(mongo_db, lead_id)
    if not lead:
        return None
    include_deleted = request.args.get("include_deleted", "").lower() == "true"
    if lead.get("is_deleted") and not include_deleted:
        return None
    return lead


def register_lead_notes_routes(bp):
    @bp.route("/leads/<lead_id>/notes", methods=["GET"])
    def get_lead_notes(lead_id):
        mongo_db = get_db()
        lead = _resolve_active_lead(mongo_db, lead_id)
        if not lead:
            return jsonify({"error": "Lead not found"}), 404

        cands = lead_id_candidates(lead)
        notes = list(mongo_db.lead_notes.find({"lead_id": {"$in": cands}}).sort("created_at", -1))
        return jsonify({
            "lead_id": canonical_lead_id(lead),
            "notes": [_serialize_doc(n) for n in notes],
            "total": len(notes),
            "extraction_notes": lead.get("extraction_notes") or "",
        })

    @bp.route("/leads/<lead_id>/notes", methods=["POST"])
    def add_lead_note(lead_id):
        mongo_db = get_db()
        lead = _resolve_active_lead(mongo_db, lead_id)
        if not lead:
            return jsonify({"error": "Lead not found"}), 404

        data = request.get_json() or {}
        text = str(data.get("text") or data.get("note") or data.get("content") or "").strip()
        if not text:
            return jsonify({"error": "Note text is required"}), 400

        note_id = f"NOTE-{uuid.uuid4().hex[:8].upper()}"
        now = now_iso()
        note_doc = {
            "id": note_id,
            "note_id": note_id,
            "lead_id": canonical_lead_id(lead),
            "author": str(data.get("author") or "Trade Specialist").strip(),
            "text": text,
            "tag": str(data.get("tag") or "Outreach Note").strip(),
            "created_at": now,
            "updated_at": now,
        }
        mongo_db.lead_notes.insert_one(note_doc)
        mongo_db.leads.update_one({"_id": lead["_id"]}, {"$set": {"updated_at": now}})

        return jsonify({
            "note": _serialize_doc(note_doc),
            "message": "Note added successfully",
        }), 201

    @bp.route("/leads/<lead_id>/notes/<note_id>", methods=["DELETE"])
    def delete_lead_note(lead_id, note_id):
        mongo_db = get_db()
        lead = _resolve_active_lead(mongo_db, lead_id)
        if not lead:
            return jsonify({"error": "Lead not found"}), 404

        cands = lead_id_candidates(lead)
        res = mongo_db.lead_notes.delete_one({
            "lead_id": {"$in": cands},
            "$or": [{"note_id": note_id}, {"id": note_id}],
        })
        if res.deleted_count == 0:
            return jsonify({"error": "Note not found"}), 404

        return jsonify({
            "success": True,
            "message": f"Note {note_id} deleted successfully",
        })

    @bp.route("/leads/<lead_id>/timeline", methods=["GET"])
    def get_lead_timeline(lead_id):
        mongo_db = get_db()
        lead = _resolve_active_lead(mongo_db, lead_id)
        if not lead:
            return jsonify({"error": "Lead not found"}), 404

        canon_lid = canonical_lead_id(lead)
        cands = lead_id_candidates(lead)
        events = []

        harvest_ts = str(lead.get("harvest_date") or lead.get("created_at") or "")
        if harvest_ts:
            events.append({
                "id": f"EVT-HARVEST-{canon_lid}",
                "type": "lead_harvested",
                "title": "Lead Harvested",
                "description": f"Ingested from {lead.get('source_name') or 'Trade Directory'} ({lead.get('country') or 'Global'})",
                "author": "Scraper Engine",
                "tag": "Harvest",
                "timestamp": harvest_ts,
            })

        for idx, m in enumerate(lead.get("merged_history") or []):
            if isinstance(m, dict):
                events.append({
                    "id": f"EVT-MERGE-{idx}",
                    "type": "lead_merged",
                    "title": "Duplicate Lead Merged",
                    "description": m.get("reason") or f"Merged with {m.get('source_company', 'record')}",
                    "author": m.get("actor") or "Deduplication Engine",
                    "tag": "Merge",
                    "timestamp": str(m.get("merged_at") or m.get("timestamp") or lead.get("updated_at") or ""),
                })

        ext_notes = str(lead.get("extraction_notes") or "").strip()
        if ext_notes:
            events.append({
                "id": f"EVT-EXTNOTE-{canon_lid}",
                "type": "extraction_note",
                "title": "Dossier Extraction Note",
                "description": ext_notes,
                "author": "Trade Analyst",
                "tag": "Dossier Note",
                "timestamp": str(lead.get("updated_at") or lead.get("created_at") or ""),
            })

        for n in mongo_db.lead_notes.find({"lead_id": {"$in": cands}}):
            events.append({
                "id": n.get("note_id") or str(n.get("_id")),
                "type": "note",
                "title": f"Note ({n.get('tag', 'Outreach Note')})",
                "description": n.get("text", ""),
                "author": n.get("author", "Trade Specialist"),
                "tag": n.get("tag", "Outreach Note"),
                "timestamp": str(n.get("created_at") or ""),
            })

        for msg in mongo_db.omnichannel_messages.find({"lead_id": {"$in": cands}}):
            events.append({
                "id": msg.get("message_id") or str(msg.get("_id")),
                "type": f"message_{msg.get('direction', 'outbound')}",
                "title": f"{msg.get('channel', 'Email')} ({msg.get('direction', 'outbound').title()})",
                "description": msg.get("subject") or msg.get("content", "")[:180],
                "channel": msg.get("channel", "Email"),
                "status": msg.get("status", ""),
                "timestamp": str(msg.get("timestamp") or ""),
            })

        for disp in mongo_db.dispatched_messages.find({"lead_id": {"$in": cands}}):
            events.append({
                "id": disp.get("dispatch_id") or str(disp.get("_id")),
                "type": "campaign_dispatch",
                "title": f"Campaign Dispatch ({disp.get('channel', 'Email')})",
                "description": f"{disp.get('campaign_name') or 'Campaign'}: {disp.get('subject') or disp.get('body', '')[:120]}",
                "channel": disp.get("channel", "Email"),
                "status": disp.get("status", ""),
                "timestamp": str(disp.get("sent_at") or ""),
            })

        for enr in mongo_db.campaign_enrollments.find({"lead_id": {"$in": cands}}):
            events.append({
                "id": enr.get("enrollment_id") or str(enr.get("_id")),
                "type": "campaign_enrollment",
                "title": f"Enrolled in {enr.get('campaign_name') or enr.get('campaign_id', 'Campaign')}",
                "description": f"Contact: {enr.get('contact_name') or lead.get('company_name', '')} ({enr.get('enrollment_mode', 'all_contacts')})",
                "tag": enr.get("status", "Enrolled"),
                "timestamp": str(enr.get("enrolled_at") or ""),
            })

        for cad in mongo_db.cadence_enrollments.find({"lead_id": {"$in": cands}}):
            events.append({
                "id": cad.get("enrollment_id") or str(cad.get("_id")),
                "type": "cadence_enrollment",
                "title": f"Cadence: {cad.get('cadence_name') or cad.get('cadence_id', '')}",
                "description": f"Status: {cad.get('status', 'Active')} (Step {cad.get('current_step', 1)}/{cad.get('total_steps', 1)})",
                "tag": cad.get("status", "Active"),
                "timestamp": str(cad.get("created_at") or cad.get("updated_at") or ""),
            })

        for deal in mongo_db.deals.find({"lead_id": {"$in": cands}, "is_deleted": {"$ne": True}}):
            events.append({
                "id": deal.get("deal_id") or str(deal.get("_id")),
                "type": "deal",
                "title": f"Deal Created: {deal.get('title') or deal.get('deal_id', '')}",
                "description": f"Stage: {deal.get('stage_name') or deal.get('deal_stage', 'qualified')} | Value: ${deal.get('value_usd', deal.get('deal_value', 0))}",
                "tag": "Pipeline",
                "timestamp": str(deal.get("created_at") or ""),
            })

        reverse = request.args.get("order", "desc").lower() != "asc"
        events.sort(key=lambda e: e.get("timestamp") or "", reverse=reverse)
        return jsonify({
            "lead_id": canon_lid,
            "company_name": lead.get("company_name", ""),
            "timeline": events,
            "total": len(events),
        })

    @bp.route("/leads/<lead_id>/outreach-history", methods=["GET"])
    def get_lead_outreach_history(lead_id):
        mongo_db = get_db()
        lead = _resolve_active_lead(mongo_db, lead_id)
        if not lead:
            return jsonify({"error": "Lead not found"}), 404

        canon_lid = canonical_lead_id(lead)
        cands = lead_id_candidates(lead)

        omni_msgs = list(mongo_db.omnichannel_messages.find({"lead_id": {"$in": cands}}))
        dispatches = list(mongo_db.dispatched_messages.find({"lead_id": {"$in": cands}}))
        campaign_enrollments = list(mongo_db.campaign_enrollments.find({"lead_id": {"$in": cands}}).sort("enrolled_at", -1))
        cadence_enrollments = list(mongo_db.cadence_enrollments.find({"lead_id": {"$in": cands}}).sort("updated_at", -1))

        unified = []
        for m in omni_msgs:
            unified.append({
                "id": m.get("message_id") or str(m.get("_id")),
                "source": "omnichannel",
                "channel": m.get("channel", "Email"),
                "direction": m.get("direction", "outbound"),
                "subject": m.get("subject", ""),
                "content": m.get("content", ""),
                "recipient": m.get("sender") or (lead.get("emails") or "").split(";")[0].strip(),
                "contact_id": m.get("contact_id", ""),
                "campaign_id": "",
                "campaign_name": "",
                "status": m.get("status", ""),
                "intent": m.get("intent", ""),
                "timestamp": str(m.get("timestamp") or ""),
            })
        for d in dispatches:
            unified.append({
                "id": d.get("dispatch_id") or str(d.get("_id")),
                "source": "campaign_dispatch",
                "channel": d.get("channel", "Email"),
                "direction": "outbound",
                "subject": d.get("subject", ""),
                "content": d.get("body", ""),
                "recipient": d.get("recipient", ""),
                "contact_id": d.get("contact_id", ""),
                "campaign_id": d.get("campaign_id", ""),
                "campaign_name": d.get("campaign_name", ""),
                "status": d.get("status", ""),
                "intent": "",
                "timestamp": str(d.get("sent_at") or ""),
            })

        unified.sort(key=lambda item: item.get("timestamp") or "")
        return jsonify({
            "lead_id": canon_lid,
            "company_name": lead.get("company_name", ""),
            "messages": unified,
            "dispatches": [_serialize_doc(d) for d in dispatches],
            "enrollments": [_serialize_doc(e) for e in campaign_enrollments],
            "cadence_enrollment": _serialize_doc(cadence_enrollments[0]) if cadence_enrollments else None,
            "cadence_enrollments": [_serialize_doc(e) for e in cadence_enrollments],
            "total": len(unified),
        })
