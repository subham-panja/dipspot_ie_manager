import os
from datetime import datetime, timezone
from typing import Optional
import pymongo
from pymongo import MongoClient
from pymongo.database import Database
from dotenv import load_dotenv
from app.models import db  # noqa: F401
from app.seed_demo import seed_demo_data  # noqa: F401

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("MONGO_DB_NAME", "trade_suite")

_client: Optional[MongoClient] = None
_db: Optional[Database] = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    return _client


def get_db() -> Database:
    global _db
    db_name = os.getenv("MONGO_DB_NAME", "trade_suite")
    if _db is None or _db.name != db_name:
        _db = get_client()[db_name]
    return _db


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


DEFAULT_PIPELINE_STAGES = [
    {"stage_id": "new_lead", "name": "New Lead", "order": 1, "color": "#64748b", "description": "New prospective lead identified from international directories or customs registry"},
    {"stage_id": "qualified", "name": "Qualified", "order": 2, "color": "#0ea5e9", "description": "Verified importer with confirmed trade requirement and valid contact dossier"},
    {"stage_id": "inquiry", "name": "RFQ Received", "order": 3, "color": "#3b82f6", "description": "Customer inquiry or RFQ logged with target volume and incoterms"},
    {"stage_id": "price_quoted", "name": "CIF Quoted", "order": 4, "color": "#f59e0b", "description": "Commercial CIF quotation submitted with payment terms and spec sheets"},
    {"stage_id": "sample_sent", "name": "Sample Sent", "order": 5, "color": "#8b5cf6", "description": "Physical grain sample and third-party laboratory test certificates dispatched"},
    {"stage_id": "contract_signed", "name": "Contract / PI Signed", "order": 6, "color": "#10b981", "description": "Proforma Invoice & Sales contract confirmed by buyer"},
    {"stage_id": "lc_opened", "name": "LC Issued", "order": 7, "color": "#06b6d4", "description": "Irrevocable LC received and authenticated via international bank"},
    {"stage_id": "production", "name": "Milling, Bagging & QC", "order": 8, "color": "#6366f1", "description": "Paddy milling, sortexing and container stuffing at accredited mill"},
    {"stage_id": "inspection", "name": "Pre-Shipment Inspection (SGS)", "order": 9, "color": "#ec4899", "description": "Third-party surveyor lab test & fit-to-load cert"},
    {"stage_id": "customs_bl", "name": "Port Clearance & BL Issued", "order": 10, "color": "#14b8a6", "description": "Customs clearance passed and Bill of Lading released"},
    {"stage_id": "closed_won", "name": "Closed Won (Completed)", "order": 11, "color": "#22c55e", "description": "Goods delivered and final settlement closed", "is_terminal": True},
    {"stage_id": "closed_lost", "name": "Closed Lost", "order": 12, "color": "#ef4444", "description": "Deal lost or cancelled", "is_terminal": True},
]

DEFAULT_SHIPMENT_STAGES = [
    {"stage_id": "order_confirmed", "name": "Order Confirmed & Booked", "order": 1, "description": "Container booking confirmed with carrier line"},
    {"stage_id": "milling_qc", "name": "Milling, Sortex & Bagging", "order": 2, "description": "Grain processed in certified mill with branded packaging"},
    {"stage_id": "quality_inspection", "name": "Pre-Shipment Lab & QC Passed", "order": 3, "description": "SGS/Bureau Veritas inspection of moisture, broken %, polish"},
    {"stage_id": "cfs_ingate", "name": "Port CFS Gate-In (Kolkata / Haldia)", "order": 4, "description": "Containers gated in and customs shipping bill generated"},
    {"stage_id": "bl_issued", "name": "Customs Passed & Clean On Board BL", "order": 5, "description": "Export duty paid, APEDA registration verified, BL issued"},
    {"stage_id": "vessel_sailed", "name": "Vessel Departed Origin Port", "order": 6, "description": "Vessel departed origin port en route to destination"},
    {"stage_id": "in_transit", "name": "Ocean Transit & Transshipment", "order": 7, "description": "Vessel in transit across Indian Ocean / Arabian Sea"},
    {"stage_id": "port_clearance", "name": "Arrived Destination Port / Customs", "order": 8, "description": "Vessel berthed; import documents submitted to port authority"},
    {"stage_id": "delivered", "name": "Cargo Delivered to Buyer Warehouse", "order": 9, "description": "Customs cleared, de-stuffed and delivered", "is_terminal": True},
]


def init_db(db: Optional[Database] = None):
    if db is None:
        db = get_db()

    # Create indexes
    db.leads.create_index([("company_name", pymongo.ASCENDING)])
    db.leads.create_index([("country", pymongo.ASCENDING)])
    db.leads.create_index([("lead_type", pymongo.ASCENDING)])
    db.leads.create_index([("priority_score", pymongo.DESCENDING)])
    db.deals.create_index([("deal_id", pymongo.ASCENDING)], unique=True)
    db.deals.create_index([("stage_id", pymongo.ASCENDING)])
    db.shipments.create_index([("tracking_number", pymongo.ASCENDING)], unique=True)
    db.campaigns.create_index([("campaign_id", pymongo.ASCENDING)], unique=True)
    db.master_stages.create_index([("type", pymongo.ASCENDING), ("stage_id", pymongo.ASCENDING)], unique=True)
    db.contacts.create_index([("contact_id", pymongo.ASCENDING)], unique=True)
    db.contacts.create_index([("norm_linkedin", pymongo.ASCENDING)], unique=True, sparse=True)
    db.contacts.create_index([("norm_email", pymongo.ASCENDING)], unique=True, sparse=True)
    db.contacts.create_index([("norm_name_phone", pymongo.ASCENDING)])
    db.company_contacts.create_index([("lead_id", pymongo.ASCENDING), ("contact_id", pymongo.ASCENDING)], unique=True)
    db.company_contacts.create_index([("contact_id", pymongo.ASCENDING)])
    db.lead_notes.create_index([("lead_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
    db.campaign_enrollments.create_index(
        [("campaign_id", pymongo.ASCENDING), ("lead_id", pymongo.ASCENDING), ("contact_id", pymongo.ASCENDING)],
        unique=True,
    )

    # 1. Seed System Configuration if missing
    if not db.system_config.find_one({"_id": "singleton_config"}):
        from app.config import Config
        cfg = Config()
        db.system_config.insert_one({
            "_id": "singleton_config",
            "user_agent": cfg.USER_AGENT,
            "request_delay_seconds": cfg.REQUEST_DELAY_SECONDS,
            "timeout_seconds": cfg.TIMEOUT_SECONDS,
            "target_importer_countries": cfg.TARGET_IMPORTER_COUNTRIES,
            "target_importer_cities": cfg.TARGET_IMPORTER_CITIES,
            "target_hs_codes": cfg.TARGET_HS_CODES,
            "exclude_hs_codes": cfg.EXCLUDE_HS_CODES,
            "positive_keywords": cfg.POSITIVE_RICE_KEYWORDS,
            "target_mill_districts": cfg.TARGET_MILL_DISTRICTS,
            "strict_no_basmati": cfg.STRICT_NO_BASMATI,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })

    # 2. Seed Master Stages
    if db.master_stages.count_documents({"type": "pipeline"}) == 0:
        for s in DEFAULT_PIPELINE_STAGES:
            doc = dict(s)
            doc["type"] = "pipeline"
            doc["is_active"] = True
            doc["is_terminal"] = s.get("is_terminal", False)
            db.master_stages.insert_one(doc)
    else:
        for s in DEFAULT_PIPELINE_STAGES:
            doc = dict(s)
            doc["type"] = "pipeline"
            doc["is_active"] = True
            doc["is_terminal"] = s.get("is_terminal", False)
            db.master_stages.update_one(
                {"type": "pipeline", "stage_id": s["stage_id"]},
                {"$set": doc},
                upsert=True
            )

    if db.master_stages.count_documents({"type": "shipment"}) == 0:
        for s in DEFAULT_SHIPMENT_STAGES:
            doc = dict(s)
            doc["type"] = "shipment"
            doc["is_active"] = True
            doc["is_terminal"] = s.get("is_terminal", False)
            db.master_stages.insert_one(doc)


if __name__ == "__main__":
    init_db()
    print("MongoDB trade_suite initialization and seeding completed successfully!")
