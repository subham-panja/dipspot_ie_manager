"""Contact-aware dual campaign enrollment resolution and persistence service."""

import re
import uuid
from typing import Any, Dict, List, Optional, Tuple
from app.contacts_service import (
    find_mongo_contact,
    lazy_backfill_lead_contacts,
    possible_lead_ids,
)
from app.db import now_iso


def canonical_campaign_lead_id(lead_doc: dict) -> Any:
    if lead_doc.get("id") is not None:
        return lead_doc["id"]
    return str(lead_doc.get("_id", ""))


def lead_id_candidates(lead_doc_or_raw: Any) -> List[Any]:
    if isinstance(lead_doc_or_raw, dict):
        return possible_lead_ids(lead_doc_or_raw)
    cands: List[Any] = [str(lead_doc_or_raw)]
    try:
        cands.append(int(lead_doc_or_raw))
    except (ValueError, TypeError):
        pass
    seen = set()
    out: List[Any] = []
    for c in cands:
        key = (type(c), c)
        if key not in seen:
            seen.add(key)
            out.append(c)
    return out


def _company_fallback_descriptor(lead_doc: dict) -> dict:
    emails = [e.strip() for e in re.split(r"[;,]", str(lead_doc.get("emails") or "")) if "@" in e]
    phones = [p.strip() for p in re.split(r"[;,]", str(lead_doc.get("phones") or "")) if p.strip()]
    return {
        "contact_id": "",
        "full_name": (lead_doc.get("contact_person") or lead_doc.get("company_name") or "").strip(),
        "email": str(lead_doc.get("primary_email") or (emails[0] if emails else "")).strip(),
        "phone": str(lead_doc.get("direct_phone") or (phones[0] if phones else "")).strip(),
        "linkedin_profile_url": "",
        "role_at_company": str(lead_doc.get("category_or_role") or "").strip(),
    }


def resolve_contacts_for_lead(
    mongo_db,
    lead_doc: dict,
    enrollment_mode: str,
    contact_id: Optional[str] = None,
    contact_ids: Optional[List[str]] = None,
) -> List[dict]:
    cand_lids = possible_lead_ids(lead_doc)

    if enrollment_mode == "single_contact":
        raw_ids: List[str] = []
        if isinstance(contact_ids, list):
            raw_ids.extend(str(c).strip() for c in contact_ids if str(c).strip())
        if contact_id and str(contact_id).strip():
            raw_ids.append(str(contact_id).strip())
        target_ids = list(dict.fromkeys(raw_ids))
        if not target_ids:
            raise ValueError("contact_id or contact_ids is required for single_contact mode")

        resolved: List[dict] = []
        for cid in target_ids:
            c_doc = find_mongo_contact(mongo_db, cid)
            if not c_doc:
                raise LookupError(f"Contact {cid} not found")
            lnk = mongo_db.company_contacts.find_one(
                {"lead_id": {"$in": cand_lids}, "contact_id": c_doc["contact_id"]}
            )
            if not lnk:
                raise ValueError(
                    f"Contact {c_doc['contact_id']} is not linked to lead {canonical_campaign_lead_id(lead_doc)}"
                )
            item = dict(c_doc)
            item["role_at_company"] = lnk.get("role_at_company") or c_doc.get("job_title", "")
            resolved.append(item)
        return resolved

    if enrollment_mode in ("all_contacts", "filter"):
        lazy_backfill_lead_contacts(mongo_db, lead_doc)
        links = list(mongo_db.company_contacts.find({"lead_id": {"$in": cand_lids}}))
        if links:
            link_by_cid = {lnk["contact_id"]: lnk for lnk in links}
            c_docs = list(mongo_db.contacts.find({"contact_id": {"$in": list(link_by_cid.keys())}}))
            c_docs.sort(key=lambda c: (not link_by_cid.get(c["contact_id"], {}).get("is_primary", False), c.get("full_name", "")))
            resolved = []
            for c_doc in c_docs:
                lnk = link_by_cid.get(c_doc["contact_id"], {})
                item = dict(c_doc)
                item["role_at_company"] = lnk.get("role_at_company") or c_doc.get("job_title", "")
                resolved.append(item)
            if resolved:
                return resolved
        if enrollment_mode == "filter":
            return [_company_fallback_descriptor(lead_doc)]
        return []

    raise ValueError(f"Unsupported enrollment_mode: {enrollment_mode}")


def enroll_contacts_into_campaign(
    mongo_db,
    campaign_doc: dict,
    lead_contacts_pairs: List[Tuple[dict, List[dict]]],
    enrollment_mode: str,
) -> Dict[str, Any]:
    campaign_id = campaign_doc["campaign_id"]
    existing_lead_ids = set(
        str(x) for x in mongo_db.campaign_enrollments.distinct("lead_id", {"campaign_id": campaign_id})
    )
    newly_enrolled_contacts = 0
    newly_enrolled_lead_keys = set()
    enrolled_records: List[dict] = []

    for lead_doc, contacts_list in lead_contacts_pairs:
        canon_lid = canonical_campaign_lead_id(lead_doc)
        lid_cands = lead_id_candidates(lead_doc)
        was_lead_enrolled = any(str(c) in existing_lead_ids for c in lid_cands)

        for c in contacts_list:
            cid = str(c.get("contact_id") or "")
            now = now_iso()
            filter_q = {"campaign_id": campaign_id, "lead_id": canon_lid, "contact_id": cid}
            set_fields = {
                "campaign_name": campaign_doc.get("name", ""),
                "company_name": lead_doc.get("company_name", ""),
                "country": lead_doc.get("country", ""),
                "contact_name": c.get("full_name") or c.get("contact_name") or lead_doc.get("company_name", ""),
                "contact_email": c.get("email") or c.get("primary_email") or "",
                "contact_phone": c.get("phone") or c.get("direct_phone") or "",
                "linkedin_profile_url": c.get("linkedin_profile_url") or "",
                "role_at_company": c.get("role_at_company") or c.get("job_title") or "",
                "enrollment_mode": enrollment_mode,
                "status": "Enrolled",
                "updated_at": now,
            }
            on_insert = {
                "enrollment_id": f"CENR-{uuid.uuid4().hex[:8].upper()}",
                "campaign_id": campaign_id,
                "lead_id": canon_lid,
                "contact_id": cid,
                "enrolled_at": now,
            }
            res = mongo_db.campaign_enrollments.update_one(
                filter_q,
                {"$set": set_fields, "$setOnInsert": on_insert},
                upsert=True,
            )
            if res.upserted_id is not None:
                newly_enrolled_contacts += 1
                if not was_lead_enrolled:
                    newly_enrolled_lead_keys.add(str(canon_lid))
                    existing_lead_ids.add(str(canon_lid))
                    was_lead_enrolled = True

            saved = mongo_db.campaign_enrollments.find_one(filter_q)
            if saved:
                d = dict(saved)
                d["_id"] = str(d["_id"])
                enrolled_records.append(d)

    return {
        "newly_enrolled_contacts": newly_enrolled_contacts,
        "newly_enrolled_leads": len(newly_enrolled_lead_keys),
        "enrolled_contacts": enrolled_records,
    }
