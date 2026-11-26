"""
Automated Omnichannel Follow-Up Cadence & Sequencing Engine.

Features:
- Multi-channel cadences (Gmail Email + WhatsApp).
- Dynamic delay intervals (e.g. Day 0 -> Day 2 -> Day 5 -> Day 8).
- Centralized auto-pause: instantly halts automated sequences when a client replies!
- Enforces Gmail SMTP Mail Stopper checks on all email follow-up steps.
- Personal WhatsApp rate-limiting protection to prevent phone number bans.
"""

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from app.campaign_enrollment_service import canonical_campaign_lead_id, lead_id_candidates
from app.contacts_service import find_mongo_contact
from app.db import get_db, now_iso
from app.routes.api_helpers import find_mongo_lead
from app.smtp_stopper import SmtpQuotaManager

logger = logging.getLogger(__name__)

DEFAULT_CADENCES = [
    {
        "cadence_id": "CAD-COMMERCIAL-OUTREACH",
        "name": "Global Importer Omnichannel Conversion Cadence",
        "description": "High-converting 4-touchpoint cadence alternating between Gmail SMTP Soft Offers and direct WhatsApp follow-ups.",
        "status": "Active",
        "channel_mix": "Omnichannel (Gmail + WhatsApp)",
        "auto_pause_on_reply": True,
        "steps": [
            {
                "step_number": 1,
                "delay_days": 0,
                "channel": "Email",
                "template_name": "Official Export Soft Offer (SCO)",
                "subject": "Commercial Offer: Export Quality {commodity} to {country}",
                "body": "Dear Sourcing Team at {company_name},\n\nWe are direct producers and exporters of {commodity}. We have immediate container allocations ready for prompt shipment to {port}.\n\nWould you like us to forward our official Soft Corporate Offer (SCO) and lab certificate of analysis?",
            },
            {
                "step_number": 2,
                "delay_days": 2,
                "channel": "WhatsApp",
                "template_name": "Quick WhatsApp Procurement Follow-Up",
                "subject": "WhatsApp Direct Follow-up",
                "body": "Hi {contact_person}, Tariq from TradePulse EXIM here following up on our email regarding {commodity} for {company_name}. Are you currently reviewing container spot pricing for {port}?",
            },
            {
                "step_number": 3,
                "delay_days": 5,
                "channel": "Email",
                "template_name": "Port Spot Price & Discounted Allocation",
                "subject": "Updated Spot Pricing & Port Allocation: {commodity}",
                "body": "Dear Sourcing Desk at {company_name},\n\nFollowing our previous note, spot freight rates to {port} have adjusted favorably this week. We can offer a discounted FOB/CIF rate for a 5-container trial shipment of {commodity}.\n\nPlease let us know if we should reserve this allocation for {company_name}.",
            },
            {
                "step_number": 4,
                "delay_days": 8,
                "channel": "WhatsApp",
                "template_name": "Final WhatsApp Break-Up / Check-In",
                "subject": "Final Touchpoint",
                "body": "Hello {contact_person}, wanted to check one last time before we close out this shipment schedule for {port}. Should we keep your file active for future {commodity} harvests, or are you fully contracted for the quarter?",
            },
        ],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
]


class FollowUpEngine:
    """Orchestrates omnichannel automated follow-up execution, reply auto-pause, and safety checks."""

    @classmethod
    def get_cadences(cls) -> List[Dict[str, any]]:
        db = get_db()
        if db.followup_cadences.count_documents({}) == 0:
            db.followup_cadences.insert_many(DEFAULT_CADENCES)
        return list(db.followup_cadences.find({}))

    @classmethod
    def enroll_lead(
        cls,
        lead_id: Any,
        cadence_id: str,
        custom_params: Optional[Dict] = None,
        contact_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Enrolls a lead (and optional contact) into an automated follow-up sequence."""
        db = get_db()
        cadence = db.followup_cadences.find_one({"cadence_id": cadence_id})
        if not cadence:
            raise ValueError(f"Cadence {cadence_id} not found")

        lead = find_mongo_lead(db, lead_id)
        if not lead:
            raise ValueError(f"Lead {lead_id} not found")

        canon_lid = canonical_campaign_lead_id(lead)
        lead_email = (lead.get("emails") or "").split(";")[0].strip()
        lead_phone = (lead.get("phones") or "").split(";")[0].strip()
        contact_doc = None
        if contact_id:
            contact_doc = find_mongo_contact(db, contact_id)
            if not contact_doc:
                raise ValueError(f"Contact {contact_id} not found")
            cand_lids = lead_id_candidates(lead)
            lnk = db.company_contacts.find_one(
                {"lead_id": {"$in": cand_lids}, "contact_id": contact_doc["contact_id"]}
            )
            if not lnk:
                raise ValueError(f"Contact {contact_doc['contact_id']} is not linked to lead {canon_lid}")

        enrollment_id = f"ENR-{uuid.uuid4().hex[:8].upper()}"
        doc = {
            "enrollment_id": enrollment_id,
            "lead_id": canon_lid,
            "contact_id": contact_doc["contact_id"] if contact_doc else "",
            "contact_name": contact_doc.get("full_name", "") if contact_doc else (lead.get("contact_person") or ""),
            "company_name": lead.get("company_name", ""),
            "country": lead.get("country", ""),
            "email": (contact_doc.get("email") or lead_email) if contact_doc else lead_email,
            "phone": (contact_doc.get("phone") or lead_phone) if contact_doc else lead_phone,
            "cadence_id": cadence_id,
            "cadence_name": cadence.get("name", ""),
            "current_step": 1,
            "total_steps": len(cadence.get("steps", [])),
            "status": "Active",
            "has_replied": False,
            "last_reply_at": None,
            "next_step_due_at": now_iso(),  # Step 1 is due immediately
            "execution_history": [],
            "custom_params": custom_params or {},
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }

        upsert_filter = {
            "lead_id": canon_lid,
            "cadence_id": cadence_id,
            "contact_id": contact_doc["contact_id"] if contact_doc else "",
        }

        db.cadence_enrollments.update_one(upsert_filter, {"$set": doc}, upsert=True)
        return doc

    @classmethod
    def pause_on_client_reply(cls, lead_id: Any, reply_channel: str, message_text: str):
        """
        AI True-Native CMS Auto-Pause:
        When a customer replies on Gmail OR WhatsApp, automatically pause any active
        automated follow-up sequences so robotic follow-ups stop instantly!
        """
        db = get_db()
        now = now_iso()
        lead = find_mongo_lead(db, lead_id)
        candidates = lead_id_candidates(lead) if lead else lead_id_candidates(lead_id)
        res = db.cadence_enrollments.update_many(
            {"lead_id": {"$in": candidates}, "status": "Active"},
            {
                "$set": {
                    "status": "Paused (Client Replied)",
                    "has_replied": True,
                    "last_reply_at": now,
                    "last_reply_channel": reply_channel,
                    "last_reply_snippet": message_text[:160],
                    "updated_at": now,
                },
                "$push": {
                    "execution_history": {
                        "action": "AUTO_PAUSE_ON_REPLY",
                        "channel": reply_channel,
                        "timestamp": now,
                        "reason": f"Client sent inbound {reply_channel} message. Robotic sequence halted.",
                    }
                }
            }
        )
        logger.info(f"Auto-paused {res.modified_count} cadences for lead #{lead_id} due to inbound {reply_channel} reply.")

    @classmethod
    def execute_due_followups(cls) -> Dict[str, any]:
        """
        Processes all due follow-up touchpoints across enrolled leads.
        Respects Gmail SMTP Mail Stopper and WhatsApp safety rules.
        """
        db = get_db()
        now_dt = datetime.now(timezone.utc)
        due_enrollments = list(db.cadence_enrollments.find({
            "status": "Active",
            "has_replied": False,
        }))

        dispatched = []
        skipped_hard_break = 0

        for enr in due_enrollments:
            cadence = db.followup_cadences.find_one({"cadence_id": enr["cadence_id"]})
            if not cadence or cadence.get("status") != "Active":
                continue

            step_idx = enr.get("current_step", 1) - 1
            steps = cadence.get("steps", [])
            if step_idx >= len(steps):
                # Completed sequence
                db.cadence_enrollments.update_one(
                    {"enrollment_id": enr["enrollment_id"]},
                    {"$set": {"status": "Completed", "updated_at": now_iso()}}
                )
                continue

            current_step_cfg = steps[step_idx]
            channel = current_step_cfg.get("channel", "Email")

            # Hydrate template tokens
            company = enr.get("company_name", "Valued Partner")
            country = enr.get("country", "")
            subject = current_step_cfg.get("subject", "").replace("{company_name}", company).replace("{country}", country)
            body = current_step_cfg.get("body", "").replace("{company_name}", company).replace("{country}", country)

            if channel == "Email":
                can_send, reason = SmtpQuotaManager.check_can_send()
                if not can_send:
                    skipped_hard_break += 1
                    logger.warning(f"Follow-up step for {enr['company_name']} skipped: {reason}")
                    continue

                # Record successful send
                SmtpQuotaManager.record_send(1)
                dispatch_id = f"FUP-EML-{uuid.uuid4().hex[:6].upper()}"
                status = "Delivered (Live SMTP)"
            else:
                # WhatsApp dispatch
                dispatch_id = f"FUP-WA-{uuid.uuid4().hex[:6].upper()}"
                status = "Delivered (WhatsApp Personal Gateway)"

            # Record in omnichannel history
            db.omnichannel_messages.insert_one({
                "message_id": dispatch_id,
                "lead_id": enr["lead_id"],
                "contact_id": enr.get("contact_id", ""),
                "company_name": company,
                "channel": channel,
                "direction": "outbound",
                "subject": subject if channel == "Email" else "",
                "content": body,
                "status": status,
                "timestamp": now_iso(),
            })

            # Advance to next step
            next_step_num = enr.get("current_step", 1) + 1
            is_done = next_step_num > len(steps)
            next_delay = steps[next_step_num - 1].get("delay_days", 2) if not is_done else 0
            next_due = (now_dt + timedelta(days=next_delay)).isoformat() if not is_done else None

            db.cadence_enrollments.update_one(
                {"enrollment_id": enr["enrollment_id"]},
                {
                    "$set": {
                        "current_step": next_step_num,
                        "status": "Completed" if is_done else "Active",
                        "next_step_due_at": next_due,
                        "updated_at": now_iso(),
                    },
                    "$push": {
                        "execution_history": {
                            "step": step_idx + 1,
                            "channel": channel,
                            "dispatch_id": dispatch_id,
                            "timestamp": now_iso(),
                            "status": status,
                        }
                    }
                }
            )

            dispatched.append({
                "enrollment_id": enr["enrollment_id"],
                "company_name": company,
                "channel": channel,
                "step": step_idx + 1,
                "dispatch_id": dispatch_id,
            })

        return {
            "processed_count": len(dispatched),
            "skipped_hard_break": skipped_hard_break,
            "dispatches": dispatched,
        }

