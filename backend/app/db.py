import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import pymongo
from pymongo import MongoClient
from pymongo.database import Database
from dotenv import load_dotenv

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
    {"stage_id": "inquiry", "name": "Inquiry / RFQ Received", "order": 1, "color": "#3b82f6", "description": "Customer inquiry or RFQ logged"},
    {"stage_id": "sample_sent", "name": "Grain Spec & Sample Sent", "order": 2, "color": "#8b5cf6", "description": "Physical rice sample / spec sheet dispatched"},
    {"stage_id": "price_quoted", "name": "FOB/CIF Quote Submitted", "order": 3, "color": "#f59e0b", "description": "Commercial quotation sent with payment terms"},
    {"stage_id": "contract_signed", "name": "Sales Contract / PI Signed", "order": 4, "color": "#10b981", "description": "Proforma Invoice & Sales contract confirmed"},
    {"stage_id": "lc_opened", "name": "LC Opened / Payment Confirmed", "order": 5, "color": "#06b6d4", "description": "Irrevocable LC received and authenticated via bank"},
    {"stage_id": "production", "name": "Milling, Bagging & QC", "order": 6, "color": "#6366f1", "description": "Paddy milling, sortexing and container stuffing"},
    {"stage_id": "inspection", "name": "Pre-Shipment Inspection (SGS)", "order": 7, "color": "#ec4899", "description": "Third-party surveyor lab test & fit-to-load cert"},
    {"stage_id": "customs_bl", "name": "Port Clearance & BL Issued", "order": 8, "color": "#14b8a6", "description": "Customs clearance passed and Bill of Lading released"},
    {"stage_id": "closed_won", "name": "Closed Won (Completed)", "order": 9, "color": "#22c55e", "description": "Goods delivered and final settlement closed", "is_terminal": True},
    {"stage_id": "closed_lost", "name": "Closed Lost", "order": 10, "color": "#ef4444", "description": "Deal lost or cancelled", "is_terminal": True},
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

    if db.master_stages.count_documents({"type": "shipment"}) == 0:
        for s in DEFAULT_SHIPMENT_STAGES:
            doc = dict(s)
            doc["type"] = "shipment"
            doc["is_active"] = True
            doc["is_terminal"] = s.get("is_terminal", False)
            db.master_stages.insert_one(doc)


def seed_demo_data(db: Optional[Database] = None) -> dict:
    """Explicitly seeds realistic trade demo data into MongoDB.
    ONLY invoked upon explicit user command (e.g. --seed flag or /api/seed/demo).
    MongoDB remains clean and strictly truth-based unless explicitly seeded.
    """
    if db is None:
        db = get_db()

    inserted = {"leads": 0, "deals": 0, "campaigns": 0, "shipments": 0, "intelligence": 0}

    # 1. Seed Initial Leads from seed_data if empty
    if db.leads.count_documents({}) == 0:
        leads_to_insert = []
        from app.seed_data import SEED_IMPORTERS, SEED_WB_MILLS
        lead_counter = 1
        for item in SEED_IMPORTERS:
            d = dict(item)
            d["id"] = lead_counter
            lead_counter += 1
            d["created_at"] = now_iso()
            d["updated_at"] = now_iso()
            d["deal_status"] = "unassigned"
            leads_to_insert.append(d)
        for item in SEED_WB_MILLS:
            d = dict(item)
            d["id"] = lead_counter
            lead_counter += 1
            d["created_at"] = now_iso()
            d["updated_at"] = now_iso()
            d["deal_status"] = "unassigned"
            leads_to_insert.append(d)

        if leads_to_insert:
            db.leads.insert_many(leads_to_insert)
            inserted["leads"] = len(leads_to_insert)

    # 2. Seed Initial Deals (Funnel Pipeline)
    if db.deals.count_documents({}) == 0:
        sample_deals = [
            {
                "deal_id": "DEAL-2026-001",
                "title": "500 MT IR-64 Parboiled Rice (5% Broken)",
                "company_name": "LuLu Group International",
                "country": "United Arab Emirates",
                "stage_id": "contract_signed",
                "stage_name": "Sales Contract / PI Signed",
                "commodity": "IR-64 Parboiled Rice 5% Broken",
                "quantity_mt": 500,
                "value_usd": 245000,
                "incoterm": "CIF Jebel Ali Port, Dubai",
                "payment_terms": "100% Irrevocable Confirmed L/C at Sight",
                "probability": 85,
                "expected_close_date": "2026-12-15",
                "notes": ["Sample tested with 13.5% moisture and <2% broken. Contract signed by Dubai head office."],
                "created_at": now_iso(),
                "updated_at": now_iso(),
            },
            {
                "deal_id": "DEAL-2026-002",
                "title": "1,000 MT Swarna Parboiled Rice in 25kg PP Bags",
                "company_name": "Al Maya Group",
                "country": "United Arab Emirates",
                "stage_id": "price_quoted",
                "stage_name": "FOB/CIF Quote Submitted",
                "commodity": "Swarna Parboiled Rice Sortex Cleaned",
                "quantity_mt": 1000,
                "value_usd": 480000,
                "incoterm": "CIF Jebel Ali, Dubai",
                "payment_terms": "20% Advance, 80% CAD",
                "probability": 65,
                "expected_close_date": "2026-12-28",
                "notes": ["FOB quote $460/MT + Freight $20/MT submitted for review by procurement committee."],
                "created_at": now_iso(),
                "updated_at": now_iso(),
            },
            {
                "deal_id": "DEAL-2026-003",
                "title": "250 MT Miniket Parboiled Rice (Silky Polish)",
                "company_name": "Al-Faris Est.",
                "country": "Saudi Arabia",
                "stage_id": "lc_opened",
                "stage_name": "LC Opened / Payment Confirmed",
                "commodity": "Miniket Parboiled Rice",
                "quantity_mt": 250,
                "value_usd": 155000,
                "incoterm": "CIF Dammam Port, KSA",
                "payment_terms": "Irrevocable L/C 60 Days",
                "probability": 90,
                "expected_close_date": "2026-12-10",
                "notes": ["SFDA approved mill certificate verified. Bank issued LC advice via Riyad Bank."],
                "created_at": now_iso(),
                "updated_at": now_iso(),
            },
            {
                "deal_id": "DEAL-2026-004",
                "title": "2,000 MT Non-Basmati Broken Rice for Brewing",
                "company_name": "Olam Agri Gulf",
                "country": "United Arab Emirates",
                "stage_id": "inquiry",
                "stage_name": "Inquiry / RFQ Received",
                "commodity": "100% Broken White Rice (HS 10064000)",
                "quantity_mt": 2000,
                "value_usd": 760000,
                "incoterm": "FOB Kolkata Port",
                "payment_terms": "100% TT against scan of Original BL",
                "probability": 40,
                "expected_close_date": "2027-01-15",
                "notes": ["Initial inquiry received via TradeNexus Lead Engine."],
                "created_at": now_iso(),
                "updated_at": now_iso(),
            },
            {
                "deal_id": "DEAL-2026-005",
                "title": "300 MT IR-64 5% Broken to Hamad Port",
                "company_name": "Al Meera Consumer Goods",
                "country": "Qatar",
                "stage_id": "customs_bl",
                "stage_name": "Port Clearance & BL Issued",
                "commodity": "IR-64 Parboiled Rice 5% Broken",
                "quantity_mt": 300,
                "value_usd": 147000,
                "incoterm": "CFR Hamad Port, Doha",
                "payment_terms": "100% Sight LC",
                "probability": 95,
                "expected_close_date": "2026-11-30",
                "notes": ["12x20ft containers loaded at Kolkata Port. Bill of Lading MAEU9921388 released."],
                "created_at": now_iso(),
                "updated_at": now_iso(),
            },
        ]
        db.deals.insert_many(sample_deals)
        inserted["deals"] = len(sample_deals)

    # 3. Seed Initial Campaigns
    if db.campaigns.count_documents({}) == 0:
        sample_campaigns = [
            {
                "campaign_id": "CMP-2026-01",
                "name": "Q1 2026 GCC Parboiled Sourcing Push",
                "channel": "Email",
                "status": "Active",
                "target_commodity": "IR-64 & Swarna Parboiled Rice",
                "target_countries": ["United Arab Emirates", "Saudi Arabia", "Qatar", "Oman"],
                "template_subject": "Direct Mill Export: Non-Basmati Parboiled Rice (HS 10063019) from Bengal Mill Cluster",
                "template_body": "Dear Procurement Team,\n\nWe offer direct supply of Sortex Cleaned Non-Basmati IR-64 Parboiled Rice (5% Broken, max 13.5% moisture) FOB Kolkata or CIF Jebel Ali / Dammam. Certified under APEDA and SFDA with SGS lab inspection.\n\nLet us know your prompt container quantity for competitive quotations.\n\nBest regards,\nExport Desk",
                "enrolled_leads_count": 84,
                "sent_count": 84,
                "opened_count": 52,
                "replied_count": 18,
                "conversions_count": 5,
                "created_at": now_iso(),
                "updated_at": now_iso(),
            },
            {
                "campaign_id": "CMP-2026-02",
                "name": "Saudi Arabia SFDA Approved Mills Direct Connect",
                "channel": "WhatsApp",
                "status": "Active",
                "target_commodity": "SFDA Listed Parboiled Rice",
                "target_countries": ["Saudi Arabia"],
                "template_subject": "SFDA Approved Rice Establishments - Direct Shipment to Jeddah & Dammam",
                "template_body": "Salam Alaikum. We represent SFDA-listed West Bengal parboiled rice processing units (#29, #717). Ready for bulk 25kg & 50kg private label packing. Inquire for latest FOB/CIF quotes.",
                "enrolled_leads_count": 32,
                "sent_count": 32,
                "opened_count": 28,
                "replied_count": 11,
                "conversions_count": 3,
                "created_at": now_iso(),
                "updated_at": now_iso(),
            },
        ]
        db.campaigns.insert_many(sample_campaigns)
        inserted["campaigns"] = len(sample_campaigns)

    # 4. Seed Shipments (Progression Tracking System)
    if db.shipments.count_documents({}) == 0:
        sample_shipments = [
            {
                "tracking_number": "TRK-2026-8841",
                "deal_id": "DEAL-2026-005",
                "customer_name": "Al Meera Consumer Goods QPSC",
                "destination_country": "Qatar",
                "cargo_description": "300 MT IR-64 Parboiled Rice 5% Broken (12 x 20ft Dry Vans)",
                "container_numbers": ["MSKU9012345", "MSKU9012346", "MSKU9012347", "MSKU9012348"],
                "bl_number": "MAEU9921388",
                "vessel_name": "MAERSK VISBY / Voy 2611W",
                "carrier": "Maersk Line",
                "origin_port": "Kolkata Port (INCCU)",
                "destination_port": "Hamad Port (QAHMD), Doha",
                "etd": "2026-11-18",
                "eta": "2026-11-29",
                "current_stage_id": "vessel_sailed",
                "current_stage_name": "Vessel Departed Origin Port",
                "progress_percent": 65,
                "is_delivered": False,
                "milestones": [
                    {"stage_id": "order_confirmed", "name": "Order Confirmed & Booked", "status": "completed", "location": "Kolkata HQ", "actual_date": "2026-11-05", "notes": "Contract signed, booking confirmed on Maersk Voy 2611W"},
                    {"stage_id": "milling_qc", "name": "Milling, Sortex & Bagging", "status": "completed", "location": "Burdwan Mill Unit #2", "actual_date": "2026-11-09", "notes": "12,000 bags (25kg PP) processed and color sortexed"},
                    {"stage_id": "quality_inspection", "name": "Pre-Shipment Lab & QC Passed", "status": "completed", "location": "Burdwan Lab", "actual_date": "2026-11-11", "notes": "SGS certificate SGS-CCU-98421: Moisture 13.2%, Broken 4.4%"},
                    {"stage_id": "cfs_ingate", "name": "Port CFS Gate-In (Kolkata)", "status": "completed", "location": "Kolkata Dock CFS", "actual_date": "2026-11-14", "notes": "12 containers stuffed and customs seal verified"},
                    {"stage_id": "bl_issued", "name": "Customs Passed & Clean On Board BL", "status": "completed", "location": "Kolkata Customs", "actual_date": "2026-11-16", "notes": "APEDA registration certified. Clean On Board Bill of Lading issued"},
                    {"stage_id": "vessel_sailed", "name": "Vessel Departed Origin Port", "status": "completed", "location": "Bay of Bengal", "actual_date": "2026-11-17", "notes": "Vessel slipped mooring at 04:30 UTC"},
                    {"stage_id": "in_transit", "name": "Ocean Transit & Transshipment", "status": "in_progress", "location": "Colombo Transshipment Hub", "planned_date": "2026-11-22", "notes": "Connecting to mother vessel MSC Alesia"},
                    {"stage_id": "port_clearance", "name": "Arrived Destination Port / Customs", "status": "pending", "location": "Hamad Port, Qatar", "planned_date": "2026-11-28", "notes": "Consignee delivery order documents forwarded to bank"},
                    {"stage_id": "delivered", "name": "Cargo Delivered to Buyer Warehouse", "status": "pending", "location": "Al Meera Central Hub, Doha", "planned_date": "2026-11-30", "notes": "Final handover upon customs release"},
                ],
                "created_at": now_iso(),
                "updated_at": now_iso(),
            },
            {
                "tracking_number": "TRK-2026-7729",
                "deal_id": "DEAL-2026-001",
                "customer_name": "LuLu Group International LLC",
                "destination_country": "United Arab Emirates",
                "cargo_description": "500 MT Parboiled Rice (20 x 20ft Containers)",
                "container_numbers": ["TGHU1122334", "TGHU1122335"],
                "bl_number": "MEDU9912039",
                "vessel_name": "MSC KALAMATA / Voy 402E",
                "carrier": "Mediterranean Shipping Company (MSC)",
                "origin_port": "Haldia Dock Complex (INHAL)",
                "destination_port": "Jebel Ali Port (AEJEA), Dubai",
                "etd": "2026-11-24",
                "eta": "2026-12-05",
                "current_stage_id": "milling_qc",
                "current_stage_name": "Milling, Sortex & Bagging",
                "progress_percent": 25,
                "is_delivered": False,
                "milestones": [
                    {"stage_id": "order_confirmed", "name": "Order Confirmed & Booked", "status": "completed", "location": "Kolkata HO", "actual_date": "2026-11-12", "notes": "LC opened via Emirates NBD"},
                    {"stage_id": "milling_qc", "name": "Milling, Sortex & Bagging", "status": "in_progress", "location": "Chakdaha Processing Facility", "planned_date": "2026-11-19", "notes": "Satake optical sortex line running 192 MT/day"},
                    {"stage_id": "quality_inspection", "name": "Pre-Shipment Lab & QC Passed", "status": "pending", "location": "Nadia Mill", "planned_date": "2026-11-20", "notes": "Inspector appointment scheduled with Bureau Veritas"},
                    {"stage_id": "cfs_ingate", "name": "Port CFS Gate-In (Haldia)", "status": "pending", "location": "Haldia Port", "planned_date": "2026-11-22", "notes": "Rake movement booked from Burdwan to Haldia"},
                    {"stage_id": "bl_issued", "name": "Customs Passed & Clean On Board BL", "status": "pending", "location": "Haldia Port", "planned_date": "2026-11-24", "notes": "Shipping bill filing under HS 10063019"},
                    {"stage_id": "vessel_sailed", "name": "Vessel Departed Origin Port", "status": "pending", "location": "Haldia", "planned_date": "2026-11-25", "notes": "Estimated sailing date"},
                    {"stage_id": "in_transit", "name": "Ocean Transit & Transshipment", "status": "pending", "location": "Arabian Sea", "planned_date": "2026-11-30", "notes": "Direct calling vessel"},
                    {"stage_id": "port_clearance", "name": "Arrived Destination Port / Customs", "status": "pending", "location": "Jebel Ali, UAE", "planned_date": "2026-12-04", "notes": "Dubai Municipality food safety inspection"},
                    {"stage_id": "delivered", "name": "Cargo Delivered to Buyer Warehouse", "status": "pending", "location": "Al Quoz Logistics Park, Dubai", "planned_date": "2026-12-06", "notes": "Final handover"},
                ],
                "created_at": now_iso(),
                "updated_at": now_iso(),
            },
        ]
        db.shipments.insert_many(sample_shipments)
        inserted["shipments"] = len(sample_shipments)

    # 5. Seed Competitive Intelligence Data
    if db.competitive_intelligence.count_documents({}) == 0:
        competitor_profiles = [
            {
                "intel_type": "competitor",
                "company_name": "KRBL Limited (India Gate)",
                "hq_country": "India",
                "estimated_volume_mt_month": 35000,
                "core_varieties": "Traditional Basmati, 1121, Pusa Basmati",
                "primary_export_markets": ["Saudi Arabia", "UAE", "Iraq", "Iran", "USA"],
                "export_ports": ["Mundra", "Nhava Sheva (JNPT)"],
                "pricing_strategy": "Premium brand pricing (15-20% above commodity benchmark)",
                "market_share_tier": "Tier 1 Global Leader",
                "strengths": "Household brand equity, extensive distributor network across GCC",
                "vulnerabilities": "Does not actively participate in non-basmati parboiled mass contracts",
                "updated_at": now_iso(),
            },
            {
                "intel_type": "competitor",
                "company_name": "Pattabhi Agro Foods Pvt. Ltd.",
                "hq_country": "India",
                "estimated_volume_mt_month": 45000,
                "core_varieties": "IR-64 Parboiled, Swarna, Sona Masoori, 10063019",
                "primary_export_markets": ["West Africa (Benin, Togo, Ivory Coast)", "UAE", "Somalia"],
                "export_ports": ["Kakinada Deepwater", "Visakhapatnam"],
                "pricing_strategy": "Aggressive high-volume bulk parboiled competitive tender pricing",
                "market_share_tier": "Tier 1 Parboiled Exporter",
                "strengths": "Direct mechanized conveyor ship loading at Kakinada Port",
                "vulnerabilities": "High freight sensitivity to East Coast container availability",
                "updated_at": now_iso(),
            },
            {
                "intel_type": "competitor",
                "company_name": "GRM Overseas Ltd.",
                "hq_country": "India",
                "estimated_volume_mt_month": 22000,
                "core_varieties": "Non-Basmati 10063019, 1121 Basmati, 1509",
                "primary_export_markets": ["United Kingdom", "Saudi Arabia", "Qatar", "Kuwait"],
                "export_ports": ["Kandla", "Mundra"],
                "pricing_strategy": "Value-added private label packaging for hypermarket chains",
                "market_share_tier": "Tier 2 Mid-Enterprise",
                "strengths": "Strong private label packaging certifications (BRC, IFS)",
                "vulnerabilities": "Concentrated in West Coast ports with higher freight to SE Asia",
                "updated_at": now_iso(),
            },
            {
                "intel_type": "competitor",
                "company_name": "Lalbaba Rice (Bhadreswar Rice Mill)",
                "hq_country": "India (West Bengal)",
                "estimated_volume_mt_month": 12000,
                "core_varieties": "Burdwan Miniket, Swarna Parboiled, Gobindobhog",
                "primary_export_markets": ["Bangladesh", "UAE (Al Ras)", "Nepal", "Saudi Arabia"],
                "export_ports": ["Kolkata Port (Syama Prasad Mookerjee)", "Haldia"],
                "pricing_strategy": "Regional Bengal cluster quality advantage with silky sortex finish",
                "market_share_tier": "Regional Powerhouse",
                "strengths": "Direct proximity to Bardhaman paddy mandis with low procurement cost",
                "vulnerabilities": "Draft limitations at Kolkata Port requiring feeder transshipment",
                "updated_at": now_iso(),
            },
        ]

        freight_index = [
            {"intel_type": "freight_index", "origin_port": "Kolkata Port (INCCU)", "destination_port": "Jebel Ali (AEJEA), Dubai", "rate_20ft_usd": 650, "rate_40ft_usd": 1050, "transit_days": 14, "carrier": "Maersk / MSC", "trend": "Stable (+1.5%)", "updated_at": now_iso()},
            {"intel_type": "freight_index", "origin_port": "Kolkata Port (INCCU)", "destination_port": "Dammam (SADMM), Saudi Arabia", "rate_20ft_usd": 780, "rate_40ft_usd": 1250, "transit_days": 18, "carrier": "Hapag-Lloyd", "trend": "Decreasing (-2.0%)", "updated_at": now_iso()},
            {"intel_type": "freight_index", "origin_port": "Haldia Port (INHAL)", "destination_port": "Hamad Port (QAHMD), Qatar", "rate_20ft_usd": 720, "rate_40ft_usd": 1180, "transit_days": 16, "carrier": "CMA CGM", "trend": "Stable", "updated_at": now_iso()},
            {"intel_type": "freight_index", "origin_port": "Kolkata Port (INCCU)", "destination_port": "Sohar Port (OMSOH), Oman", "rate_20ft_usd": 690, "rate_40ft_usd": 1100, "transit_days": 15, "carrier": "MSC", "trend": "Stable", "updated_at": now_iso()},
            {"intel_type": "freight_index", "origin_port": "Nhava Sheva (INNSA)", "destination_port": "Jebel Ali (AEJEA), Dubai", "rate_20ft_usd": 480, "rate_40ft_usd": 750, "transit_days": 5, "carrier": "ONE / Evergreen", "trend": "Increasing (+3.2%)", "updated_at": now_iso()},
            {"intel_type": "freight_index", "origin_port": "Kakinada (INKAK)", "destination_port": "Cotonou (BJCOO), Benin", "rate_20ft_usd": 1850, "rate_40ft_usd": 2900, "transit_days": 32, "carrier": "MSC / Maersk", "trend": "Volatile (+5.0%)", "updated_at": now_iso()},
        ]

        price_benchmarks = [
            {"intel_type": "price_benchmark", "commodity": "IR-64 Parboiled Rice (5% Broken)", "grade": "Sortex Cleaned", "fob_price_usd_mt": 445, "cif_jebel_ali_usd_mt": 472, "change_wow_usd": "+5.00", "trend": "Bullish", "updated_at": now_iso()},
            {"intel_type": "price_benchmark", "commodity": "Swarna Parboiled Rice", "grade": "Silky Polish, max 13.5% moist", "fob_price_usd_mt": 420, "cif_jebel_ali_usd_mt": 448, "change_wow_usd": "-2.00", "trend": "Neutral", "updated_at": now_iso()},
            {"intel_type": "price_benchmark", "commodity": "Miniket Parboiled Rice (WB Cluster)", "grade": "Export Grade 1", "fob_price_usd_mt": 580, "cif_jebel_ali_usd_mt": 615, "change_wow_usd": "+12.00", "trend": "Bullish", "updated_at": now_iso()},
            {"intel_type": "price_benchmark", "commodity": "100% Broken White Rice (HS 10064000)", "grade": "Clean Brewery Spec", "fob_price_usd_mt": 360, "cif_jebel_ali_usd_mt": 388, "change_wow_usd": "0.00", "trend": "Stable", "updated_at": now_iso()},
            {"intel_type": "price_benchmark", "commodity": "Sona Masoori Raw Rice", "grade": "Aged 1 Year", "fob_price_usd_mt": 720, "cif_jebel_ali_usd_mt": 755, "change_wow_usd": "+8.00", "trend": "Bullish", "updated_at": now_iso()},
        ]

        tariff_intel = [
            {"intel_type": "tariff_intel", "hs_code": "10063019", "commodity": "Parboiled Rice - Other (Non-Basmati IR-64, Swarna, Miniket)", "india_export_duty": "0% (Exempted under DGFT 2025-26 notification)", "apeda_registration_mandate": "Required (Contract RC generated via APEDA portal)", "uae_import_duty": "0% (GCC Customs Union Basic Foodstuff Exemption)", "saudi_import_duty": "0% (SFDA Licensed Importer Certificate Required)", "eu_import_duty": "€175 / MT (Specific duty under TRQ quotas)", "notes": "Created under DGFT Trade Notice 04/2025-26 splitting legacy 10063010", "updated_at": now_iso()},
            {"intel_type": "tariff_intel", "hs_code": "10063012", "commodity": "Parboiled Basmati Rice", "india_export_duty": "0% (MEP removed by DGFT Sept 2024)", "apeda_registration_mandate": "Mandatory Basmati Verification Contract", "uae_import_duty": "0%", "saudi_import_duty": "0% (Subject to mandatory SASO / SFDA standard 2062)", "eu_import_duty": "Zero duty under EC Regulation 972/2006 for verified DNA varieties", "notes": "Basmati GI varieties only", "updated_at": now_iso()},
            {"intel_type": "tariff_intel", "hs_code": "10064000", "commodity": "Broken Rice", "india_export_duty": "Permitted under specific quotas to friendly countries", "apeda_registration_mandate": "Required", "uae_import_duty": "0%", "saudi_import_duty": "0%", "eu_import_duty": "€65 / MT", "notes": "Export allowed on G2G and approved commercial allocations", "updated_at": now_iso()},
        ]

        all_intel = competitor_profiles + freight_index + price_benchmarks + tariff_intel
        db.competitive_intelligence.insert_many(all_intel)
        inserted["intelligence"] = len(all_intel)

    return inserted


if __name__ == "__main__":
    init_db()
    print("MongoDB trade_suite initialization and seeding completed successfully!")

