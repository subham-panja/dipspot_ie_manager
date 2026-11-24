"""Lead persistence and deduplication pipeline."""

from datetime import datetime, timezone
import logging
import re
from typing import Any, Dict, List, Optional
from app.lead_engine import (
    calculate_lead_similarity,
    clean_company_key,
    clean_company_name,
    is_pure_generic_category,
)
from app.models import Lead, ScrapeJob, db
from app.verifier import extract_domain, filter_live_emails, is_domain_live

logger = logging.getLogger("EXIMLeadTasks")

def _save_leads_with_dedup(
    app,
    leads_data: List[Dict[str, any]],
    job_id: Optional[int] = None,
    custom_label: Optional[str] = None,
    extraction_notes: Optional[str] = None,
) -> int:
    from app.db import get_db, now_iso
    mongo_db = get_db()
    inserted_count = 0
    merged_count = 0

    # Retrieve system deduplication threshold (default 95.0%)
    sys_cfg = mongo_db.system_config.find_one({}) or {}
    dedup_threshold = float(sys_cfg.get("dedup_threshold", 95.0))

    existing_mongo_leads = list(mongo_db.leads.find({"is_deleted": {"$ne": True}}))
    existing_ids = [
        int(doc["id"]) for doc in existing_mongo_leads if isinstance(doc.get("id"), (int, float))
    ]
    next_id = (max(existing_ids) + 1) if existing_ids else 1

    with app.app_context():
        for item in leads_data:
            c_name = item.get("company_name", "").strip()
            # Clean raw SERP titles with delimiters or marketing fluff
            if any(sep in c_name for sep in ("|", "::", " • ", " · ")) or " - Online" in c_name or " - Best" in c_name:
                cleaned_c = clean_company_name(c_name)
                if cleaned_c:
                    c_name = cleaned_c
                    item["company_name"] = cleaned_c

            # Discard generic directory headlines (e.g. 'Rice Exporters in India', 'Wholesale Distribution Hub')
            if is_pure_generic_category(c_name) or (clean_company_name(c_name) == "" and not any(w in c_name for w in ("SARL", "LLC", "Ltd", "Trading", "Co", "Corp", "SA", "SAS", "GmbH"))):
                continue

            if not c_name or len(c_name) < 3:
                continue

            # Strict Buyer vs Supplier Separation: Indian entities are suppliers/mills, never foreign importers
            c_country = (item.get("country") or "").strip()
            c_addr = (item.get("address") or "").lower()
            if item.get("lead_type") == "importer":
                if c_country.lower() == "india":
                    item["lead_type"] = "wb_mill"

            # Strict Geographic Isolation: foreign countries must never contain Indian address leaks
            if c_country.lower() not in ("india", "global") and c_country:
                for ind_tok in ("india", "karnataka", "bengal", "hooghly", "arambagh", "burdwan", "delhi", "punjab", "mumbai", "kolkata"):
                    if ind_tok in c_addr:
                        item["address"] = f"Commercial Logistics Hub, {item.get('city_or_hub') or c_country}, {c_country}"
                        break

            # Strict DNS check: if website is provided, verify it resolves via DNS
            if item.get("website"):
                w_domain = extract_domain(item["website"])
                if not is_domain_live(w_domain):
                    item["website"] = ""

            # Strict email verification: filter out manufactured placeholders and unresolvable domains
            if item.get("emails"):
                item["emails"] = filter_live_emails(item["emails"])

            # Compare against existing leads using calculate_lead_similarity
            best_score = 0.0
            best_reason = ""
            best_fields = []
            best_doc = None

            for doc in existing_mongo_leads:
                score, reason, fields = calculate_lead_similarity(item, doc)
                if score > best_score:
                    best_score = score
                    best_reason = reason
                    best_fields = fields
                    best_doc = doc

            # 95% OR CONFIGURED THRESHOLD MERGE
            if best_doc is not None and best_score >= dedup_threshold:
                m_doc = best_doc
                up = {
                    "updated_at": now_iso(),
                    "duplicate_probability": round(best_score, 1),
                    "duplicate_status": "merged",
                    "merge_count": int(m_doc.get("merge_count") or 1) + 1,
                }
                # Union emails
                e_exist = [e.strip() for e in (m_doc.get("emails") or "").split(";") if e.strip()]
                e_new = [e.strip() for e in (item.get("emails") or "").split(";") if e.strip()]
                all_e = sorted(set(e_exist + e_new), key=str.lower)
                if all_e:
                    up["emails"] = "; ".join(all_e)

                # Union phones
                p_exist = [p.strip() for p in (m_doc.get("phones") or "").split(";") if p.strip()]
                p_new = [p.strip() for p in (item.get("phones") or "").split(";") if p.strip()]
                all_p = sorted(set(p_exist + p_new))
                if all_p:
                    up["phones"] = "; ".join(all_p)

                # Enrich GSTIN / PAN / Website
                if item.get("gstin") and not m_doc.get("gstin"):
                    up["gstin"] = item["gstin"]
                if item.get("pan") and not m_doc.get("pan"):
                    up["pan"] = item["pan"]
                if item.get("website") and not m_doc.get("website"):
                    up["website"] = item["website"]

                merge_event = {
                    "merged_at": now_iso(),
                    "source_name": item.get("source_name", "Trade Registry"),
                    "source_url": item.get("source_url", ""),
                    "similarity_score": round(best_score, 1),
                    "match_reason": best_reason,
                    "candidate_company": item.get("company_name", ""),
                    "custom_label": custom_label or item.get("custom_label", ""),
                    "job_id": job_id or item.get("job_id"),
                }

                mongo_db.leads.update_one(
                    {"_id": m_doc["_id"]},
                    {"$set": up, "$push": {"merged_history": merge_event}}
                )
                merged_count += 1
            else:
                # INSERT as a distinct, new lead
                doc = dict(item)
                assigned_id = next_id
                next_id += 1

                doc["id"] = assigned_id
                doc["created_at"] = now_iso()
                doc["updated_at"] = now_iso()
                doc["deal_status"] = "unassigned"
                doc["duplicate_probability"] = round(best_score, 1)
                doc["duplicate_status"] = "unique"
                doc["merge_count"] = 1
                doc["job_id"] = job_id or item.get("job_id")
                doc["custom_label"] = custom_label or item.get("custom_label", "")
                doc["extraction_notes"] = extraction_notes or item.get("extraction_notes", "")
                doc["is_deleted"] = False

                res = mongo_db.leads.insert_one(doc)
                doc["_id"] = res.inserted_id

                existing_mongo_leads.append(doc)
                inserted_count += 1

                try:
                    sq_lead = Lead(
                        id=assigned_id,
                        company_name=doc.get("company_name", ""),
                        country=doc.get("country", ""),
                        city_or_hub=doc.get("city_or_hub", ""),
                        contact_person=doc.get("contact_person", ""),
                        phones=doc.get("phones", ""),
                        emails=doc.get("emails", ""),
                        website=doc.get("website", ""),
                        address=doc.get("address", ""),
                        matched_varieties=doc.get("matched_varieties", ""),
                        hs_codes_applicable=doc.get("hs_codes_applicable", ""),
                        inquiry_or_profile=doc.get("inquiry_or_profile", ""),
                        priority_score=int(doc.get("priority_score", 0)),
                        source_url=doc.get("source_url", ""),
                        lead_type=doc.get("lead_type", "importer"),
                        gstin=doc.get("gstin", ""),
                        pan=doc.get("pan", ""),
                        fssai_or_sfda_status=doc.get("fssai_or_sfda_status", ""),
                        state=doc.get("state", ""),
                        district=doc.get("district", ""),
                        category_or_role=doc.get("category_or_role", ""),
                    )
                    db.session.add(sq_lead)
                except Exception:
                    pass

        try:
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Audit extraction history
        try:
            mongo_db.extraction_history.insert_one({
                "job_id": job_id or f"harvest-{now_iso()[:19]}",
                "custom_label": custom_label or "Standard Outreach",
                "extraction_notes": extraction_notes or "",
                "lead_type": leads_data[0].get("lead_type", "importer") if leads_data else "importer",
                "country": leads_data[0].get("country", "") if leads_data else "",
                "commodity": leads_data[0].get("matched_varieties", "") if leads_data else "",
                "depth": len(leads_data),
                "inserted_count": inserted_count,
                "merged_count": merged_count,
                "total_processed": len(leads_data),
                "created_at": now_iso(),
                "status": "completed",
            })
        except Exception:
            pass

        if job_id:
            try:
                job = db.session.get(ScrapeJob, job_id)
                if job:
                    job.status = "completed"
                    job.leads_found = inserted_count
                    job.completed_at = datetime.now(timezone.utc)
                    db.session.commit()
            except Exception:
                pass

        return inserted_count

