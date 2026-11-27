"""
Omnichannel Chatwoot-specific routes: webhook, sync, status, widget-config, conversations.

Registered as chatwoot_bp under /api/omnichannel; business logic lives in app.chatwoot_sync.
"""

import json

from flask import Blueprint, jsonify, request
from app.chatwoot_client import compute_hmac
from app.chatwoot_sync import (
    build_chatwoot_status,
    correlate_conversations,
    handle_webhook_event,
    is_duplicate_delivery,
    run_global_chatwoot_sync,
    sync_lead_thread,
    verify_webhook_with_expiry,
)
from app.config import get_chatwoot_config
from app.db import get_db

chatwoot_bp = Blueprint("chatwoot", __name__, url_prefix="/api/omnichannel")


@chatwoot_bp.route("/chatwoot/webhook", methods=["POST"])
def chatwoot_webhook():
    """Verify HMAC + expiry, deduplicate X-Chatwoot-Delivery, and handle Chatwoot webhook events."""
    db = get_db()
    raw_body = request.get_data()
    cfg = get_chatwoot_config(db, include_secrets=True)
    webhook_secret = cfg.get("webhook_secret") or ""

    if webhook_secret and not verify_webhook_with_expiry(raw_body, webhook_secret, request):
        return jsonify({"error": "Invalid signature"}), 401

    try:
        payload = json.loads(raw_body)
    except (json.JSONDecodeError, ValueError):
        return jsonify({"error": "Invalid JSON"}), 400

    if not isinstance(payload, dict):
        return jsonify({"error": "Expected JSON object"}), 400

    event = str(payload.get("event") or "")
    delivery_id = request.headers.get("X-Chatwoot-Delivery", "")
    if delivery_id and is_duplicate_delivery(db, delivery_id, event):
        return jsonify({"success": True, "event": event, "note": "duplicate delivery skipped"}), 200

    result = handle_webhook_event(db, payload, cfg)
    return jsonify(result), 200


@chatwoot_bp.route("/threads/<lead_id>/sync", methods=["POST"])
def sync_lead_to_chatwoot(lead_id: str):
    """Sync a lead to Chatwoot (contact + conversation) and replay unsynced messages."""
    db = get_db()
    body, status_code = sync_lead_thread(db, lead_id)
    return jsonify(body), status_code


@chatwoot_bp.route("/chatwoot/status", methods=["GET"])
def get_chatwoot_status():
    """Return Chatwoot connection status, channel flags, and union synced thread counts."""
    db = get_db()
    return jsonify(build_chatwoot_status(db)), 200


@chatwoot_bp.route("/chatwoot/widget-config", methods=["GET"])
def get_widget_config():
    """Return public Chatwoot website widget config and optional server-computed HMAC hash."""
    db = get_db()
    cfg = get_chatwoot_config(db, include_secrets=True)
    identifier = request.args.get("identifier", "")

    website_token = cfg.get("website_token") or ""
    public_url = cfg.get("public_url") or cfg.get("base_url") or ""
    hmac_secret = cfg.get("website_hmac_secret") or ""
    enabled = bool(cfg.get("enabled")) and bool(website_token)

    identifier_hash = compute_hmac(hmac_secret, identifier) if (hmac_secret and identifier) else ""

    return jsonify({
        "enabled": enabled,
        "website_token": website_token,
        "base_url": public_url,
        "identifier": identifier,
        "identifier_hash": identifier_hash,
        "identity_validation_token": identifier_hash,
    })


@chatwoot_bp.route("/chatwoot/conversations", methods=["GET"])
def get_chatwoot_conversations():
    """Proxy Chatwoot conversations list with TradePulse lead correlation metadata."""
    db = get_db()
    try:
        page = max(int(request.args.get("page", 1)), 1)
    except (ValueError, TypeError):
        page = 1
    return jsonify(correlate_conversations(db, page=page)), 200


@chatwoot_bp.route("/chatwoot/sync", methods=["POST"])
def global_chatwoot_sync():
    """Replay unsynced lead messages to Chatwoot and pull Chatwoot conversations in."""
    db = get_db()
    body, status_code = run_global_chatwoot_sync(db)
    return jsonify(body), status_code
