"""
Shared helpers for omnichannel blueprint modules.

Preserves backward-compatible re-exports from app.chatwoot_sync.
"""

from typing import Any, Dict, List, Optional

from app.chatwoot_sync import (  # noqa: F401
    ingest_chatwoot_message,
    resolve_lead_from_webhook,
    verify_chatwoot_signature,
)

WHATSAPP_STATUS_STATIC: Dict[str, Any] = {
    "gateway_mode": "Personal WhatsApp Web Session + Meta Cloud API Hybrid",
    "daily_safe_cap": 50,
    "anti_ban_protection": {
        "human_typing_delay_ms": "4500ms - 8200ms",
        "safe_daily_limit": 50,
        "automated_stop_word_opt_out": True,
    },
    "legal_compliance_summary": {
        "meta_terms_of_service": (
            "Automating personal numbers via unofficial web tools carries high risk "
            "of temporary number ban if reported as bulk spam."
        ),
        "india_dpdp_and_trai": (
            "B2B commercial inquiries with legitimate business interest are allowed, "
            "provided immediate opt-out is respected."
        ),
        "gdpr_and_tcpa": (
            "Legitimate interest applies for commercial import/export inquiries "
            "with explicit opt-out mechanism."
        ),
    },
    "legal_analysis": {
        "is_personal_automation_legal": (
            "Automating personal WhatsApp does not violate statutory criminal law for legitimate "
            "B2B trade outreach, BUT violates Meta WhatsApp Terms of Service (Section 3)."
        ),
        "meta_terms_risk": "HIGH BAN RISK if used for cold broadcasts (>50 messages/day).",
        "statutory_law": (
            "Legal under B2B legitimate interest (India DPDP, TRAI UCC Regulations, "
            "EU GDPR Art 6.1f, US TCPA) ONLY IF opt-out ('STOP') is honored immediately."
        ),
    },
    "architectural_recommendation": (
        "Dual-mode strategy: Personal WhatsApp for 1-on-1 VIP replies (<35/day); "
        "Meta WhatsApp Cloud API for broadcast cadences."
    ),
    "safeguards_implemented": [
        "Human-like randomized typing delay (4500ms - 8200ms)",
        "Safe daily cap of 50 chats/day per personal number",
        "Automated 'STOP' detection with instant cadence auto-pause",
        "Unified Omnichannel Timeline to track every interaction",
    ],
}


def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Convert a MongoDB document to a JSON-safe dict."""
    if not doc:
        return None
    d = dict(doc)
    if "_id" in d:
        d["_id"] = str(d["_id"])
    return d


def badge_color_for_intent(intent: str) -> str:
    low = (intent or "").lower()
    if "unsubscribe" in low or "opt-out" in low:
        return "rose"
    if "negotiation" in low:
        return "amber"
    if "rfq" in low or "commercial intent" in low:
        return "emerald"
    if "out of office" in low or "auto-reply" in low:
        return "slate"
    return "cyan"


def parse_visitor_conv_id(thread_id: str):
    suffix = str(thread_id)[len("cw_conv_"):]
    try:
        return int(suffix)
    except (ValueError, TypeError):
        return suffix


def build_timeline(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [
        {
            "type": f"message_{m.get('direction', 'outbound')}",
            "channel": m.get("channel"),
            "content": m.get("content"),
            "timestamp": m.get("timestamp"),
            "message_id": m.get("message_id"),
        }
        for m in messages
    ]


def build_chatwoot_url(cfg: Optional[Dict[str, Any]], conv_id: Any) -> str:
    if not cfg or conv_id is None or conv_id == "":
        return ""
    public_url = str(cfg.get("public_url") or cfg.get("base_url") or "").strip().rstrip("/")
    account_id = str(cfg.get("account_id") or "1").strip()
    return f"{public_url}/app/accounts/{account_id}/conversations/{conv_id}" if public_url else ""


def build_thread_chatwoot_meta(
    db,
    lead_or_visitor_id: Any,
    messages: List[Dict[str, Any]],
    cfg: Optional[Dict[str, Any]],
    cands: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    """Assemble consistent Chatwoot conversation metadata for thread detail responses."""
    raw_id = str(lead_or_visitor_id)
    if raw_id.startswith("cw_conv_"):
        suffix = raw_id[len("cw_conv_"):]
        conv_vals: List[Any] = [suffix]
        try:
            conv_vals.append(int(suffix))
        except (ValueError, TypeError):
            pass
        meta = db.chatwoot_conversation_meta.find_one(
            {"$or": [{"visitor_thread_id": raw_id}, {"conversation_id": {"$in": conv_vals}}]},
            sort=[("updated_at", -1)],
        )
        fallback_conv_id = conv_vals[-1] if len(conv_vals) > 1 else suffix
    else:
        meta = db.chatwoot_conversation_meta.find_one(
            {"lead_id": {"$in": cands if cands is not None else [lead_or_visitor_id]}},
            sort=[("updated_at", -1)],
        )
        fallback_conv_id = None

    msg_conv_id = next((m.get("chatwoot_conversation_id") for m in reversed(messages) if m.get("chatwoot_conversation_id") is not None), None)
    msg_contact_id = next((m.get("chatwoot_contact_id") for m in reversed(messages) if m.get("chatwoot_contact_id") is not None), None)
    msg_status = next((m.get("chatwoot_conversation_status") for m in reversed(messages) if m.get("chatwoot_conversation_status")), None)
    conv_id = (meta.get("conversation_id") if meta else None) or msg_conv_id or fallback_conv_id
    return {
        "conversation_id": conv_id,
        "contact_id": (meta.get("contact_id") if meta else None) or msg_contact_id,
        "status": (meta.get("conversation_status") if meta else None) or msg_status,
        "synced": bool(meta) or any(bool(m.get("chatwoot_synced")) for m in messages),
        "url": build_chatwoot_url(cfg, conv_id),
    }
