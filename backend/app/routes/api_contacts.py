"""Many-to-Many Contacts and Company-Contact association API endpoints."""

import re
from flask import jsonify, request
from pymongo.errors import DuplicateKeyError
from app.contacts_service import (
    ContactConflictError,
    _LI_BLOCKED_SEGMENTS,
    _sync_sqlite_contact,
    canonical_lead_id,
    find_mongo_contact,
    lazy_backfill_lead_contacts,
    link_contact_to_lead,
    normalize_email,
    normalize_linkedin_url,
    normalize_name_phone_key,
    normalize_phone_digits,
    possible_lead_ids,
    serialize_contact,
    serialize_contacts_batch,
    unlink_contact_from_lead,
    upsert_and_link_contact,
)
from app.db import get_db, now_iso
from app.routes.api_helpers import find_mongo_lead


def register_contact_routes(bp):
    @bp.route("/contacts", methods=["GET"])
    def list_contacts():
        mongo_db = get_db()
        q = (request.args.get("q") or "").strip()
        lead_id = (request.args.get("lead_id") or "").strip()
        mongo_q = {}

        if lead_id:
            lead_doc = find_mongo_lead(mongo_db, lead_id)
            if not lead_doc:
                return jsonify({"contacts": [], "total": 0})
            links = list(mongo_db.company_contacts.find({"lead_id": {"$in": possible_lead_ids(lead_doc)}}))
            cids = [lnk["contact_id"] for lnk in links]
            mongo_q["contact_id"] = {"$in": cids}

        if q:
            rx = {"$regex": re.escape(q), "$options": "i"}
            mongo_q["$or"] = [
                {"full_name": rx},
                {"job_title": rx},
                {"email": rx},
                {"phone": rx},
                {"linkedin_profile_url": rx},
            ]

        docs = list(mongo_db.contacts.find(mongo_q).sort("updated_at", -1).limit(200))
        contacts = serialize_contacts_batch(mongo_db, docs)
        return jsonify({"contacts": contacts, "total": len(contacts)})

    @bp.route("/contacts", methods=["POST"])
    def create_contact():
        mongo_db = get_db()
        data = request.get_json() or {}
        if not any(str(data.get(k) or "").strip() for k in ("full_name", "email", "linkedin_profile_url", "linkedin_url")):
            return jsonify({"error": "full_name, email, or linkedin_profile_url is required"}), 400

        lead_ids_raw = []
        if data.get("lead_id") is not None:
            lead_ids_raw.append(data.get("lead_id"))
        if isinstance(data.get("lead_ids"), list):
            lead_ids_raw.extend(data.get("lead_ids"))

        resolved_leads = []
        for lid in lead_ids_raw:
            ldoc = find_mongo_lead(mongo_db, lid)
            if not ldoc or ldoc.get("is_deleted"):
                return jsonify({"error": f"Lead {lid} not found"}), 404
            resolved_leads.append(ldoc)

        first_lead = resolved_leads[0] if resolved_leads else None
        try:
            contact_doc, deduplicated = upsert_and_link_contact(
                mongo_db, data, lead_doc=first_lead, source=str(data.get("source") or "manual")
            )
        except ContactConflictError as ce:
            return jsonify({"error": str(ce)}), 409
        for extra_lead in resolved_leads[1:]:
            link_contact_to_lead(
                mongo_db,
                extra_lead,
                contact_doc,
                role_at_company=str(data.get("role_at_company") or contact_doc.get("job_title") or ""),
                is_primary=bool(data.get("is_primary", False)),
                source=str(data.get("source") or "manual"),
            )

        return jsonify({
            "contact": serialize_contact(mongo_db, contact_doc),
            "deduplicated": deduplicated,
        }), 201

    @bp.route("/contacts/<contact_id>", methods=["GET"])
    def get_contact(contact_id):
        mongo_db = get_db()
        doc = find_mongo_contact(mongo_db, contact_id)
        if not doc:
            return jsonify({"error": "Contact not found"}), 404
        return jsonify({"contact": serialize_contact(mongo_db, doc)})

    @bp.route("/contacts/<contact_id>", methods=["PUT", "PATCH"])
    def update_contact(contact_id):
        mongo_db = get_db()
        doc = find_mongo_contact(mongo_db, contact_id)
        if not doc:
            return jsonify({"error": "Contact not found"}), 404

        data = request.get_json() or {}
        set_fields = {"updated_at": now_iso()}
        unset_fields = {}

        for key in ("full_name", "job_title", "email", "phone", "whatsapp_url", "linkedin_profile_url", "source"):
            if key in data:
                set_fields[key] = str(data[key] or "").strip()
        if "verified" in data:
            set_fields["verified"] = bool(data["verified"])

        new_li = set_fields.get("linkedin_profile_url", doc.get("linkedin_profile_url", ""))
        norm_li = normalize_linkedin_url(new_li)
        if "linkedin_profile_url" in data:
            raw_li = set_fields["linkedin_profile_url"]
            clean_li = norm_li or (raw_li if not any(seg in raw_li.lower() for seg in _LI_BLOCKED_SEGMENTS) else "")
            set_fields["linkedin_profile_url"] = clean_li
        if norm_li:
            clash = mongo_db.contacts.find_one({"norm_linkedin": norm_li, "_id": {"$ne": doc["_id"]}})
            if clash:
                return jsonify({"error": "Another contact already uses this LinkedIn profile URL"}), 409
            set_fields["norm_linkedin"] = norm_li
        elif "linkedin_profile_url" in data:
            unset_fields["norm_linkedin"] = ""

        new_email = set_fields.get("email", doc.get("email", ""))
        norm_email = normalize_email(new_email)
        if norm_email:
            clash = mongo_db.contacts.find_one({"norm_email": norm_email, "_id": {"$ne": doc["_id"]}})
            if clash:
                return jsonify({"error": "Another contact already uses this email"}), 409
            set_fields["norm_email"] = norm_email
        elif "email" in data:
            unset_fields["norm_email"] = ""

        new_name = set_fields.get("full_name", doc.get("full_name", ""))
        new_phone = set_fields.get("phone", doc.get("phone", ""))
        norm_np = normalize_name_phone_key(new_name, new_phone)
        if norm_np:
            set_fields["norm_name_phone"] = norm_np
        elif "full_name" in data or "phone" in data:
            unset_fields["norm_name_phone"] = ""

        if "phone" in data and "whatsapp_url" not in data:
            digits = normalize_phone_digits(new_phone)
            if digits:
                set_fields["whatsapp_url"] = f"https://wa.me/{digits}"

        update_op = {"$set": set_fields}
        if unset_fields:
            update_op["$unset"] = unset_fields

        try:
            mongo_db.contacts.update_one({"_id": doc["_id"]}, update_op)
        except DuplicateKeyError:
            return jsonify({"error": "Contact deduplication conflict"}), 409

        updated = mongo_db.contacts.find_one({"_id": doc["_id"]})
        _sync_sqlite_contact(updated)
        return jsonify({"contact": serialize_contact(mongo_db, updated)})

    @bp.route("/contacts/<contact_id>", methods=["DELETE"])
    def delete_contact(contact_id):
        mongo_db = get_db()
        doc = find_mongo_contact(mongo_db, contact_id)
        if not doc:
            return jsonify({"error": "Contact not found"}), 404

        cid = doc["contact_id"]
        mongo_db.contacts.delete_one({"_id": doc["_id"]})
        mongo_db.company_contacts.delete_many({"contact_id": cid})
        try:
            from app.models import db
            from app.models_contacts import Contact

            sq_c = Contact.query.filter_by(contact_id=cid).first()
            if sq_c:
                db.session.delete(sq_c)
                db.session.commit()
        except Exception:
            try:
                from app.models import db
                db.session.rollback()
            except Exception:
                pass
        return jsonify({"deleted": True, "contact_id": cid})

    @bp.route("/leads/<lead_id>/contacts", methods=["GET"])
    def get_lead_contacts(lead_id):
        mongo_db = get_db()
        lead_doc = find_mongo_lead(mongo_db, lead_id)
        if not lead_doc or lead_doc.get("is_deleted"):
            return jsonify({"error": "Lead not found"}), 404

        lazy_backfill_lead_contacts(mongo_db, lead_doc)
        links = list(mongo_db.company_contacts.find({"lead_id": {"$in": possible_lead_ids(lead_doc)}}))
        link_by_cid = {lnk["contact_id"]: lnk for lnk in links}
        cids = list(link_by_cid.keys())
        contact_docs = list(mongo_db.contacts.find({"contact_id": {"$in": cids}})) if cids else []
        contacts = serialize_contacts_batch(mongo_db, contact_docs, link_by_contact_id=link_by_cid)
        contacts.sort(key=lambda c: (not c.get("is_primary", False), c.get("full_name", "")))
        return jsonify({
            "lead_id": canonical_lead_id(lead_doc),
            "company_name": lead_doc.get("company_name", ""),
            "contacts": contacts,
            "total": len(contacts),
        })

    @bp.route("/leads/<lead_id>/contacts", methods=["POST"])
    def add_lead_contact(lead_id):
        mongo_db = get_db()
        lead_doc = find_mongo_lead(mongo_db, lead_id)
        if not lead_doc or lead_doc.get("is_deleted"):
            return jsonify({"error": "Lead not found"}), 404

        data = request.get_json() or {}
        existing_cid = str(data.get("contact_id") or "").strip()
        if existing_cid:
            contact_doc = find_mongo_contact(mongo_db, existing_cid)
            if not contact_doc:
                return jsonify({"error": "Contact not found"}), 404
            link_doc = link_contact_to_lead(
                mongo_db,
                lead_doc,
                contact_doc,
                role_at_company=str(data.get("role_at_company") or contact_doc.get("job_title") or ""),
                is_primary=bool(data.get("is_primary", False)),
                source=str(data.get("source") or "manual"),
            )
            return jsonify({
                "contact": serialize_contact(mongo_db, contact_doc, link_doc=link_doc),
                "linked": True,
                "deduplicated": True,
            }), 201

        if not any(str(data.get(k) or "").strip() for k in ("full_name", "email", "linkedin_profile_url", "linkedin_url")):
            return jsonify({"error": "contact_id or full_name/email/linkedin_profile_url is required"}), 400

        try:
            contact_doc, deduplicated = upsert_and_link_contact(
                mongo_db, data, lead_doc=lead_doc, source=str(data.get("source") or "manual")
            )
        except ContactConflictError as ce:
            return jsonify({"error": str(ce)}), 409
        link_doc = mongo_db.company_contacts.find_one({
            "lead_id": {"$in": possible_lead_ids(lead_doc)},
            "contact_id": contact_doc["contact_id"],
        })
        return jsonify({
            "contact": serialize_contact(mongo_db, contact_doc, link_doc=link_doc),
            "linked": True,
            "deduplicated": deduplicated,
        }), 201

    @bp.route("/leads/<lead_id>/contacts/<contact_id>", methods=["DELETE"])
    def remove_lead_contact(lead_id, contact_id):
        mongo_db = get_db()
        lead_doc = find_mongo_lead(mongo_db, lead_id)
        if not lead_doc or lead_doc.get("is_deleted"):
            return jsonify({"error": "Lead not found"}), 404

        contact_doc = find_mongo_contact(mongo_db, contact_id)
        if not contact_doc:
            return jsonify({"error": "Contact not found"}), 404

        if not unlink_contact_from_lead(mongo_db, lead_doc, contact_doc):
            return jsonify({"error": "Contact is not linked to this lead"}), 404

        remaining = mongo_db.company_contacts.count_documents({"contact_id": contact_doc["contact_id"]})
        return jsonify({
            "unlinked": True,
            "lead_id": canonical_lead_id(lead_doc),
            "contact_id": contact_doc["contact_id"],
            "remaining_companies": remaining,
        })
