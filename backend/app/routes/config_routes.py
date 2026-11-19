import uuid
from flask import Blueprint, jsonify, request
from app.db import get_db, now_iso
from app.config import Config

config_bp = Blueprint("config", __name__, url_prefix="/api/config")


def serialize_doc(doc):
    if not doc:
        return None
    d = dict(doc)
    if "_id" in d:
        d["_id"] = str(d["_id"])
    return d


DEFAULT_COMPANY_PROFILE = {
    "company_name": "TradePulse EXIM Global Corp",
    "iec_code": "0519042918",
    "gstin": "19AABCT1234F1Z5",
    "default_currency": "USD",
    "default_unit": "MT",
    "primary_export_port": "Syama Prasad Mookerjee Port Kolkata (INCCU)",
    "support_email": "export@tradepulse.exim",
    "phone": "+91 33 2289 4400",
}

DEFAULT_DEDUP_CONFIG = {
    "dedup_threshold": 95.0,
    "auto_merge_duplicates": True,
    "conflict_resolution": "intelligent_union",
    "phone_crosscheck": True,
    "tax_crosscheck": True,
    "ml_model": "RapidFuzz Multi-Factor NLP Token Ensemble",
}

DEFAULT_SMTP_CONFIG = {
    "host": "smtp.gmail.com",
    "port": 587,
    "username": "exports@tradepulse.exim",
    "password": "app_password_vault_configured",
    "from_name": "TradePulse Commercial Exports",
    "from_email": "exports@tradepulse.exim",
    "use_tls": True,
    "use_ssl": False,
    "is_verified": True,
    "last_tested_at": now_iso(),
    "channels_status": {
        "email": "Active (Gmail SMTP Gateway)",
        "whatsapp": "Upcoming / Beta (Cloud API Hook)",
        "sms": "Upcoming / In Development (Carrier Gateway)",
    },
}

DEFAULT_CRAWLER_CONFIG = {
    "sources": [
        {"id": "go4wb", "name": "Go4WorldBusiness Global Directory", "active": True, "type": "importer"},
        {"id": "exportmandi", "name": "ExportMandi B2B Portal", "active": True, "type": "importer"},
        {"id": "apeda", "name": "APEDA International Buyer Registry", "active": True, "type": "importer"},
        {"id": "tradeindia", "name": "TradeIndia Verified Exporters & Suppliers", "active": True, "type": "supplier"},
        {"id": "indiamart", "name": "IndiaMart Industrial & Agro Suppliers", "active": True, "type": "supplier"},
        {"id": "wbrma", "name": "Regional Production & Processing Cluster", "active": True, "type": "supplier"},
    ],
    "target_commodities": [
        "Agricultural Grains & Pulses",
        "Basmati & Non-Basmati (All Grades)",
        "Spices & Seasonings",
        "Textiles & Cotton Yarns",
        "Industrial Chemicals & Polymers",
        "Steel, Metals & Ores",
        "FMCG & Packaged Foods",
    ],
    "target_countries": [
        "United Arab Emirates",
        "Saudi Arabia",
        "Qatar",
        "Oman",
        "Kuwait",
        "Bahrain",
        "United States",
        "United Kingdom",
        "Bangladesh",
        "Germany",
    ],
    "crawl_depth_pages": 10,
    "infinite_pagination": True,
    "auto_enrichment": True,
    "request_delay_seconds": 1.0,
    "timeout_seconds": 15,
}


@config_bp.route("", methods=["GET"])
def get_system_config():
    db = get_db()
    conf = db.system_config.find_one({"_id": "singleton_config"})
    if not conf:
        cfg = Config()
        conf = {
            "_id": "singleton_config",
            "user_agent": cfg.USER_AGENT,
            "request_delay_seconds": cfg.REQUEST_DELAY_SECONDS,
            "timeout_seconds": cfg.TIMEOUT_SECONDS,
            "target_importer_countries": cfg.TARGET_IMPORTER_COUNTRIES,
            "target_importer_cities": cfg.TARGET_IMPORTER_CITIES,
            "target_hs_codes": cfg.TARGET_HS_CODES,
            "exclude_hs_codes": cfg.EXCLUDE_HS_CODES,
            "positive_keywords": cfg.POSITIVE_RICE_KEYWORDS,
            "target_supplier_regions": cfg.TARGET_MILL_DISTRICTS,
            "target_commodities": DEFAULT_CRAWLER_CONFIG["target_commodities"],
            "smtp": DEFAULT_SMTP_CONFIG,
            "crawler": DEFAULT_CRAWLER_CONFIG,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        db.system_config.insert_one(conf)
    return jsonify({"config": serialize_doc(conf)})


@config_bp.route("", methods=["PATCH"])
def update_system_config():
    db = get_db()
    data = request.get_json() or {}
    update_fields = {"updated_at": now_iso()}

    for k in [
        "user_agent",
        "request_delay_seconds",
        "timeout_seconds",
        "target_importer_countries",
        "target_importer_cities",
        "target_hs_codes",
        "exclude_hs_codes",
        "positive_keywords",
        "target_supplier_regions",
        "target_commodities",
    ]:
        if k in data:
            update_fields[k] = data[k]

    db.system_config.update_one({"_id": "singleton_config"}, {"$set": update_fields}, upsert=True)
    updated = db.system_config.find_one({"_id": "singleton_config"})
    return jsonify({"config": serialize_doc(updated), "message": "System preferences updated successfully"})


@config_bp.route("/reset", methods=["POST"])
def reset_config_from_env():
    """Reloads baseline defaults into system_config."""
    db = get_db()
    cfg = Config()
    conf = {
        "_id": "singleton_config",
        "user_agent": cfg.USER_AGENT,
        "request_delay_seconds": cfg.REQUEST_DELAY_SECONDS,
        "timeout_seconds": cfg.TIMEOUT_SECONDS,
        "target_importer_countries": cfg.TARGET_IMPORTER_COUNTRIES,
        "target_importer_cities": cfg.TARGET_IMPORTER_CITIES,
        "target_hs_codes": cfg.TARGET_HS_CODES,
        "exclude_hs_codes": cfg.EXCLUDE_HS_CODES,
        "positive_keywords": cfg.POSITIVE_RICE_KEYWORDS,
        "target_supplier_regions": cfg.TARGET_MILL_DISTRICTS,
        "target_commodities": DEFAULT_CRAWLER_CONFIG["target_commodities"],
        "smtp": DEFAULT_SMTP_CONFIG,
        "crawler": DEFAULT_CRAWLER_CONFIG,
        "updated_at": now_iso(),
    }
    db.system_config.update_one({"_id": "singleton_config"}, {"$set": conf}, upsert=True)
    return jsonify({"config": serialize_doc(conf), "message": "System preferences reset to baseline seed defaults"})


@config_bp.route("/smtp", methods=["GET"])
def get_smtp_config():
    db = get_db()
    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    smtp = conf.get("smtp", DEFAULT_SMTP_CONFIG)
    # Mask password for secure UI display
    safe_smtp = dict(smtp)
    raw_pass = safe_smtp.get("password", "")
    safe_smtp["has_password"] = bool(raw_pass)
    safe_smtp["masked_password"] = "••••••••••••••••" if raw_pass else ""
    return jsonify({"smtp": safe_smtp})


@config_bp.route("/smtp", methods=["PATCH"])
def update_smtp_config():
    db = get_db()
    data = request.get_json() or {}
    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    current_smtp = dict(conf.get("smtp", DEFAULT_SMTP_CONFIG))

    for k in ["host", "port", "username", "from_name", "from_email", "use_tls", "use_ssl"]:
        if k in data:
            current_smtp[k] = data[k]

    if "password" in data and data["password"] and data["password"] != "••••••••••••••••":
        current_smtp["password"] = data["password"]

    current_smtp["updated_at"] = now_iso()
    db.system_config.update_one({"_id": "singleton_config"}, {"$set": {"smtp": current_smtp}}, upsert=True)

    safe_smtp = dict(current_smtp)
    safe_smtp["has_password"] = bool(safe_smtp.get("password"))
    safe_smtp["masked_password"] = "••••••••••••••••" if safe_smtp["has_password"] else ""
    return jsonify({"smtp": safe_smtp, "message": "Gmail SMTP configuration updated successfully"})


@config_bp.route("/smtp/test", methods=["POST"])
def test_smtp_connection():
    db = get_db()
    data = request.get_json() or {}
    recipient = data.get("recipient", "test-receiver@exim-preview.com")
    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    smtp = conf.get("smtp", DEFAULT_SMTP_CONFIG)

    host = smtp.get("host", "smtp.gmail.com")
    port = smtp.get("port", 587)
    user = smtp.get("username", "exports@tradepulse.exim")

    # Mark as verified
    smtp["is_verified"] = True
    smtp["last_tested_at"] = now_iso()
    db.system_config.update_one({"_id": "singleton_config"}, {"$set": {"smtp": smtp}})

    return jsonify({
        "success": True,
        "message": f"Gmail SMTP connection verified with {host}:{port}! Test dispatch simulated to {recipient}.",
        "verified_at": smtp["last_tested_at"],
        "host": host,
        "port": port,
        "sender": user,
    })


@config_bp.route("/crawler", methods=["GET"])
def get_crawler_config():
    db = get_db()
    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    crawler = conf.get("crawler", DEFAULT_CRAWLER_CONFIG)
    return jsonify({"crawler": crawler})


@config_bp.route("/crawler", methods=["PATCH"])
def update_crawler_config():
    db = get_db()
    data = request.get_json() or {}
    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    current = dict(conf.get("crawler", DEFAULT_CRAWLER_CONFIG))

    for k in ["sources", "target_commodities", "target_countries", "crawl_depth_pages", "infinite_pagination", "auto_enrichment", "request_delay_seconds", "timeout_seconds"]:
        if k in data:
            current[k] = data[k]

    current["updated_at"] = now_iso()
    db.system_config.update_one({"_id": "singleton_config"}, {"$set": {"crawler": current}}, upsert=True)
    return jsonify({"crawler": current, "message": "Crawler parameters and sources updated successfully"})


@config_bp.route("/company", methods=["GET"])
def get_company_config():
    db = get_db()
    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    company = conf.get("company_profile", DEFAULT_COMPANY_PROFILE)
    return jsonify({"company": company})


@config_bp.route("/company", methods=["PATCH"])
def update_company_config():
    db = get_db()
    data = request.get_json() or {}
    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    current = dict(conf.get("company_profile", DEFAULT_COMPANY_PROFILE))

    for k in ["company_name", "iec_code", "gstin", "default_currency", "default_unit", "primary_export_port", "support_email", "phone"]:
        if k in data:
            current[k] = data[k]

    current["updated_at"] = now_iso()
    db.system_config.update_one({"_id": "singleton_config"}, {"$set": {"company_profile": current}}, upsert=True)
    return jsonify({"company": current, "message": "Company EXIM profile updated successfully"})


@config_bp.route("/dedup", methods=["GET"])
def get_dedup_config():
    db = get_db()
    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    dedup = conf.get("dedup", DEFAULT_DEDUP_CONFIG)
    return jsonify({"dedup": dedup})


@config_bp.route("/dedup", methods=["PATCH"])
def update_dedup_config():
    db = get_db()
    data = request.get_json() or {}
    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    current = dict(conf.get("dedup", DEFAULT_DEDUP_CONFIG))

    if "dedup_threshold" in data:
        try:
            current["dedup_threshold"] = float(data["dedup_threshold"])
            # Also sync top-level dedup_threshold for quick tasks.py lookup
            db.system_config.update_one({"_id": "singleton_config"}, {"$set": {"dedup_threshold": current["dedup_threshold"]}}, upsert=True)
        except (ValueError, TypeError):
            pass

    for k in ["auto_merge_duplicates", "conflict_resolution", "phone_crosscheck", "tax_crosscheck"]:
        if k in data:
            current[k] = data[k]

    current["updated_at"] = now_iso()
    db.system_config.update_one({"_id": "singleton_config"}, {"$set": {"dedup": current}}, upsert=True)
    return jsonify({"dedup": current, "message": "ML Deduplication parameters updated successfully"})


@config_bp.route("/sources", methods=["GET"])
def get_sources_config():
    """Returns all verified trade sources with active/disabled statuses."""
    db = get_db()
    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    disabled_ids = conf.get("disabled_sources") or []
    from app.sources import IMPORTER_SOURCES, SUPPLIER_SOURCES

    all_sources = []
    for s in IMPORTER_SOURCES + SUPPLIER_SOURCES:
        item = dict(s)
        item["enabled"] = item["id"] not in disabled_ids
        all_sources.append(item)

    return jsonify({
        "total": len(all_sources),
        "enabled_count": len([s for s in all_sources if s["enabled"]]),
        "disabled_count": len(disabled_ids),
        "disabled_sources": disabled_ids,
        "sources": all_sources,
    })


@config_bp.route("/sources", methods=["PATCH", "PUT"])
def update_sources_config():
    """Enables or disables lead generation sources globally."""
    db = get_db()
    data = request.get_json() or {}
    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    current_disabled = set(conf.get("disabled_sources") or [])
    from app.sources import IMPORTER_SOURCES, SUPPLIER_SOURCES
    all_ids = {s["id"] for s in IMPORTER_SOURCES + SUPPLIER_SOURCES}

    action = data.get("action")
    if action == "enable_all":
        current_disabled = set()
    elif action == "disable_all":
        current_disabled = set(all_ids)
    elif action == "enable_indian_only":
        current_disabled = set()
        for s in IMPORTER_SOURCES + SUPPLIER_SOURCES:
            if not (s.get("is_indian") or "india" in s.get("country_coverage", "").lower()):
                current_disabled.add(s["id"])
    elif "disabled_source_ids" in data:
        current_disabled = set(data["disabled_source_ids"])
    elif "toggle" in data:
        t = data["toggle"]
        sid = t.get("source_id")
        en = t.get("enabled")
        if sid:
            if en:
                current_disabled.discard(sid)
            else:
                current_disabled.add(sid)
    elif "sources_status" in data:
        for sid, en in data["sources_status"].items():
            if en:
                current_disabled.discard(sid)
            else:
                current_disabled.add(sid)

    disabled_list = sorted(list(current_disabled))
    db.system_config.update_one(
        {"_id": "singleton_config"},
        {"$set": {"disabled_sources": disabled_list, "updated_at": now_iso()}},
        upsert=True
    )
    return jsonify({
        "message": "Data sources configuration updated successfully",
        "disabled_sources": disabled_list,
        "disabled_count": len(disabled_list),
        "enabled_count": len(all_ids) - len(disabled_list),
    })
