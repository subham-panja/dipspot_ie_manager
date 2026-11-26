"""Many-to-Many Contact <-> Company service with deduplication and zero-fabrication backfill."""

import re
import uuid
from typing import Any, Dict, List, Optional, Tuple
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from app.contacts_normalizers import (
    GENERIC_CONTACT_NAMES,
    LI_BLOCKED_SEGMENTS,
    canonical_lead_id,
    normalize_email,
    normalize_linkedin_url,
    normalize_name_phone_key,
    normalize_phone_digits,
    parse_contact_person,
    possible_lead_ids,
)
from app.db import now_iso

_LI_BLOCKED_SEGMENTS = LI_BLOCKED_SEGMENTS
_GENERIC_NAMES = GENERIC_CONTACT_NAMES
_parse_contact_person = parse_contact_person


class ContactConflictError(ValueError):
    """Raised when merging a contact would violate another contact's unique key."""


def find_mongo_contact(mongo_db, contact_id: str) -> Optional[dict]:
    conds: List[dict] = [{"contact_id": str(contact_id)}]
    if ObjectId.is_valid(str(contact_id)):
        conds.append({"_id": ObjectId(str(contact_id))})
    return mongo_db.contacts.find_one({"$or": conds})


def find_existing_contact(
    mongo_db, norm_li: str, norm_email: str, norm_np: str
) -> Optional[dict]:
    if norm_li:
        found = mongo_db.contacts.find_one({"norm_linkedin": norm_li})
        if found:
            return found
    if norm_email:
        found = mongo_db.contacts.find_one({"norm_email": norm_email})
        if found:
            return found
    if norm_np:
        found = mongo_db.contacts.find_one({"norm_name_phone": norm_np})
        if found:
            return found
    return None


def _sync_sqlite_contact(contact_doc: dict, lead_doc: Optional[dict] = None, link_doc: Optional[dict] = None) -> None:
    try:
        from app.models import Lead, db
        from app.models_contacts import CompanyContact, Contact

        cid = contact_doc["contact_id"]
        sq_contact = Contact.query.filter_by(contact_id=cid).first()
        if not sq_contact:
            sq_contact = Contact(contact_id=cid)
            db.session.add(sq_contact)
        sq_contact.full_name = contact_doc.get("full_name", "")
        sq_contact.job_title = contact_doc.get("job_title", "")
        sq_contact.email = contact_doc.get("email", "")
        sq_contact.phone = contact_doc.get("phone", "")
        sq_contact.whatsapp_url = contact_doc.get("whatsapp_url", "")
        sq_contact.linkedin_profile_url = contact_doc.get("linkedin_profile_url", "")
        sq_contact.source = contact_doc.get("source", "manual")
        sq_contact.verified = bool(contact_doc.get("verified", False))
        db.session.flush()

        if lead_doc and isinstance(lead_doc.get("id"), (int, float)) and link_doc:
            sq_lead = db.session.get(Lead, int(lead_doc["id"]))
            if sq_lead:
                sq_link = CompanyContact.query.filter_by(
                    lead_id=sq_lead.id, contact_id=sq_contact.id
                ).first()
                if not sq_link:
                    sq_link = CompanyContact(lead_id=sq_lead.id, contact_id=sq_contact.id)
                    db.session.add(sq_link)
                sq_link.role_at_company = link_doc.get("role_at_company", "")
                sq_link.is_primary = bool(link_doc.get("is_primary", False))
                sq_link.source = link_doc.get("source", "manual")
        db.session.commit()
    except Exception:
        try:
            from app.models import db
            db.session.rollback()
        except Exception:
            pass


def link_contact_to_lead(
    mongo_db,
    lead_doc: dict,
    contact_doc: dict,
    role_at_company: str = "",
    is_primary: bool = False,
    source: str = "manual",
) -> dict:
    canon_lid = canonical_lead_id(lead_doc)
    cand_ids = possible_lead_ids(lead_doc)
    cid = contact_doc["contact_id"]

    if is_primary:
        mongo_db.company_contacts.update_many(
            {"lead_id": {"$in": cand_ids}},
            {"$set": {"is_primary": False}},
        )

    existing_link = mongo_db.company_contacts.find_one(
        {"lead_id": {"$in": cand_ids}, "contact_id": cid}
    )
    now = now_iso()
    role = (role_at_company or contact_doc.get("job_title") or "").strip()

    if existing_link:
        updates = {"updated_at": now}
        if role:
            updates["role_at_company"] = role
        if is_primary:
            updates["is_primary"] = True
        if source:
            updates["source"] = source
        mongo_db.company_contacts.update_one({"_id": existing_link["_id"]}, {"$set": updates})
        link_doc = mongo_db.company_contacts.find_one({"_id": existing_link["_id"]})
    else:
        link_doc = {
            "lead_id": canon_lid,
            "contact_id": cid,
            "role_at_company": role,
            "is_primary": bool(is_primary),
            "source": source,
            "created_at": now,
        }
        mongo_db.company_contacts.insert_one(link_doc)

    _sync_sqlite_contact(contact_doc, lead_doc=lead_doc, link_doc=link_doc)
    return link_doc


def upsert_and_link_contact(
    mongo_db,
    payload: dict,
    lead_doc: Optional[dict] = None,
    source: str = "manual",
) -> Tuple[dict, bool]:
    raw_name = str(payload.get("full_name") or "").strip()
    raw_title = str(payload.get("job_title") or "").strip()
    raw_email = str(payload.get("email") or "").strip()
    raw_phone = str(payload.get("phone") or "").strip()
    raw_li = str(payload.get("linkedin_profile_url") or payload.get("linkedin_url") or "").strip()
    raw_wa = str(payload.get("whatsapp_url") or "").strip()

    norm_li = normalize_linkedin_url(raw_li)
    norm_email = normalize_email(raw_email)
    digits = normalize_phone_digits(raw_phone)
    norm_np = normalize_name_phone_key(raw_name, raw_phone)

    clean_li = norm_li or (raw_li if not any(seg in raw_li.lower() for seg in _LI_BLOCKED_SEGMENTS) else "")
    wa_url = raw_wa or (f"https://wa.me/{digits}" if digits else "")
    verified = bool(payload.get("verified", bool(norm_li or norm_email)))
    now = now_iso()

    existing = find_existing_contact(mongo_db, norm_li, norm_email, norm_np)
    deduplicated = existing is not None

    if existing:
        set_fields: Dict[str, Any] = {"updated_at": now}
        curr_name = (existing.get("full_name") or "").strip()
        if raw_name and (not curr_name or curr_name.lower() in _GENERIC_NAMES):
            set_fields["full_name"] = raw_name
        if raw_title and not existing.get("job_title"):
            set_fields["job_title"] = raw_title
        if raw_email and not existing.get("email"):
            set_fields["email"] = raw_email
        if raw_phone and not existing.get("phone"):
            set_fields["phone"] = raw_phone
        if wa_url and not existing.get("whatsapp_url"):
            set_fields["whatsapp_url"] = wa_url
        if clean_li and not existing.get("linkedin_profile_url"):
            set_fields["linkedin_profile_url"] = clean_li
        if norm_li and not existing.get("norm_linkedin"):
            if mongo_db.contacts.find_one({"norm_linkedin": norm_li, "_id": {"$ne": existing["_id"]}}):
                raise ContactConflictError("Another contact already uses this LinkedIn profile URL")
            set_fields["norm_linkedin"] = norm_li
        if norm_email and not existing.get("norm_email"):
            if mongo_db.contacts.find_one({"norm_email": norm_email, "_id": {"$ne": existing["_id"]}}):
                raise ContactConflictError("Another contact already uses this email")
            set_fields["norm_email"] = norm_email
        if norm_np and not existing.get("norm_name_phone"):
            set_fields["norm_name_phone"] = norm_np
        if verified and not existing.get("verified"):
            set_fields["verified"] = True

        try:
            mongo_db.contacts.update_one({"_id": existing["_id"]}, {"$set": set_fields})
        except DuplicateKeyError as exc:
            raise ContactConflictError("Contact deduplication conflict") from exc
        contact_doc = mongo_db.contacts.find_one({"_id": existing["_id"]})
    else:
        cid = f"CNT-{uuid.uuid4().hex[:10].upper()}"
        contact_doc = {
            "contact_id": cid,
            "full_name": raw_name or (raw_email.split("@")[0] if raw_email else "Contact"),
            "job_title": raw_title,
            "email": raw_email,
            "phone": raw_phone,
            "whatsapp_url": wa_url,
            "linkedin_profile_url": clean_li,
            "source": str(payload.get("source") or source or "manual"),
            "verified": verified,
            "created_at": now,
            "updated_at": now,
        }
        if norm_li:
            contact_doc["norm_linkedin"] = norm_li
        if norm_email:
            contact_doc["norm_email"] = norm_email
        if norm_np:
            contact_doc["norm_name_phone"] = norm_np
        try:
            mongo_db.contacts.insert_one(contact_doc)
        except DuplicateKeyError as exc:
            raise ContactConflictError("Contact deduplication conflict") from exc

    if lead_doc is not None:
        link_contact_to_lead(
            mongo_db,
            lead_doc,
            contact_doc,
            role_at_company=str(payload.get("role_at_company") or raw_title),
            is_primary=bool(payload.get("is_primary", False)),
            source=str(payload.get("source") or source or "manual"),
        )
    else:
        _sync_sqlite_contact(contact_doc)

    return contact_doc, deduplicated


def unlink_contact_from_lead(mongo_db, lead_doc: dict, contact_doc: dict) -> bool:
    cand_ids = possible_lead_ids(lead_doc)
    cid = contact_doc["contact_id"]
    res = mongo_db.company_contacts.delete_many(
        {"lead_id": {"$in": cand_ids}, "contact_id": cid}
    )
    try:
        if isinstance(lead_doc.get("id"), (int, float)):
            from app.models import db
            from app.models_contacts import CompanyContact, Contact

            sq_c = Contact.query.filter_by(contact_id=cid).first()
            if sq_c:
                CompanyContact.query.filter_by(
                    lead_id=int(lead_doc["id"]), contact_id=sq_c.id
                ).delete()
                db.session.commit()
    except Exception:
        pass
    return res.deleted_count > 0


def lazy_backfill_lead_contacts(mongo_db, lead_doc: dict) -> Optional[dict]:
    cand_ids = possible_lead_ids(lead_doc)
    if mongo_db.company_contacts.count_documents({"lead_id": {"$in": cand_ids}}) > 0:
        return None

    raw_emails = [
        e.strip()
        for e in re.split(r"[;,]", str(lead_doc.get("emails") or ""))
        if normalize_email(e)
    ]
    email = normalize_email(lead_doc.get("primary_email")) or (raw_emails[0].lower() if raw_emails else "")

    raw_phones = [
        p.strip()
        for p in re.split(r"[;,]", str(lead_doc.get("phones") or ""))
        if normalize_phone_digits(p)
    ]
    direct_phone = str(lead_doc.get("direct_phone") or "").strip()
    phone = direct_phone if normalize_phone_digits(direct_phone) else (raw_phones[0] if raw_phones else "")

    li_url = normalize_linkedin_url(
        lead_doc.get("linkedin_profile_url") or lead_doc.get("linkedin_persona_url") or ""
    )

    if not email and not phone and not li_url:
        return None

    full_name, job_title = _parse_contact_person(lead_doc.get("contact_person") or "")
    if not full_name or full_name.lower() in _GENERIC_NAMES:
        if email:
            full_name = email.split("@")[0].replace(".", " ").title()
        else:
            full_name = f"{lead_doc.get('company_name') or 'Company'} Contact"

    payload = {
        "full_name": full_name,
        "job_title": job_title or str(lead_doc.get("category_or_role") or ""),
        "email": email,
        "phone": phone,
        "linkedin_profile_url": li_url,
        "is_primary": True,
        "source": "lead_backfill",
        "verified": bool(li_url or email),
    }
    try:
        contact_doc, _ = upsert_and_link_contact(
            mongo_db, payload, lead_doc=lead_doc, source="lead_backfill"
        )
    except ContactConflictError:
        return None
    return contact_doc


def serialize_contacts_batch(
    mongo_db,
    contact_docs: List[dict],
    link_by_contact_id: Optional[Dict[str, dict]] = None,
) -> List[dict]:
    if not contact_docs:
        return []
    cids = [c["contact_id"] for c in contact_docs if c.get("contact_id")]
    all_links = list(mongo_db.company_contacts.find({"contact_id": {"$in": cids}}))

    lead_ids_needed = list({lnk["lead_id"] for lnk in all_links if lnk.get("lead_id") is not None})
    lead_lookup: Dict[str, dict] = {}
    if lead_ids_needed:
        or_conds: List[dict] = [{"id": {"$in": lead_ids_needed}}]
        int_ids = []
        oid_ids = []
        for val in lead_ids_needed:
            try:
                int_ids.append(int(val))
            except (ValueError, TypeError):
                pass
            if ObjectId.is_valid(str(val)):
                oid_ids.append(ObjectId(str(val)))
        if int_ids:
            or_conds.append({"id": {"$in": int_ids}})
        if oid_ids:
            or_conds.append({"_id": {"$in": oid_ids}})
        for ldoc in mongo_db.leads.find({"$or": or_conds}):
            for cand in possible_lead_ids(ldoc):
                lead_lookup[str(cand)] = ldoc

    links_per_contact: Dict[str, List[dict]] = {}
    for lnk in all_links:
        cid = lnk.get("contact_id", "")
        ldoc = lead_lookup.get(str(lnk.get("lead_id", "")), {})
        links_per_contact.setdefault(cid, []).append({
            "lead_id": canonical_lead_id(ldoc) if ldoc else str(lnk.get("lead_id", "")),
            "company_name": ldoc.get("company_name", ""),
            "country": ldoc.get("country", ""),
            "role_at_company": lnk.get("role_at_company", ""),
            "is_primary": bool(lnk.get("is_primary", False)),
        })

    results: List[dict] = []
    for c in contact_docs:
        cid = c.get("contact_id") or str(c.get("_id", ""))
        ctx_link = (link_by_contact_id or {}).get(cid)
        companies = links_per_contact.get(cid, [])
        primary_link = ctx_link or next((x for x in companies if x.get("is_primary")), None) or (companies[0] if companies else None)
        results.append({
            "id": cid,
            "contact_id": cid,
            "full_name": c.get("full_name", ""),
            "job_title": c.get("job_title", ""),
            "email": c.get("email", ""),
            "phone": c.get("phone", ""),
            "whatsapp_url": c.get("whatsapp_url", ""),
            "linkedin_profile_url": c.get("linkedin_profile_url", ""),
            "source": c.get("source", "manual"),
            "verified": bool(c.get("verified", False)),
            "role_at_company": (ctx_link or {}).get("role_at_company") or (primary_link or {}).get("role_at_company") or c.get("job_title", ""),
            "is_primary": bool((ctx_link or {}).get("is_primary", False)),
            "companies": companies,
            "created_at": str(c.get("created_at") or ""),
            "updated_at": str(c.get("updated_at") or ""),
        })
    return results


def serialize_contact(mongo_db, contact_doc: dict, link_doc: Optional[dict] = None) -> dict:
    link_map = {contact_doc["contact_id"]: link_doc} if link_doc and contact_doc.get("contact_id") else None
    serialized = serialize_contacts_batch(mongo_db, [contact_doc], link_by_contact_id=link_map)
    return serialized[0] if serialized else {}


def get_contacts_count_map(mongo_db, lead_docs: List[dict]) -> Dict[str, int]:
    if not lead_docs:
        return {}
    cand_to_canon: Dict[Any, str] = {}
    all_cands: List[Any] = []
    for doc in lead_docs:
        canon = canonical_lead_id(doc)
        for cand in possible_lead_ids(doc):
            cand_to_canon[cand] = canon
            all_cands.append(cand)
    if not all_cands:
        return {}
    counts: Dict[str, int] = {}
    pipeline = [
        {"$match": {"lead_id": {"$in": all_cands}}},
        {"$group": {"_id": "$lead_id", "count": {"$sum": 1}}},
    ]
    for row in mongo_db.company_contacts.aggregate(pipeline):
        canon = cand_to_canon.get(row["_id"]) or cand_to_canon.get(str(row["_id"]))
        if canon:
            counts[canon] = counts.get(canon, 0) + int(row.get("count") or 0)
    return counts
