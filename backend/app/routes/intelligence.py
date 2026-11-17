import uuid
from flask import Blueprint, jsonify, request
from app.db import get_db, now_iso

intelligence_bp = Blueprint("intelligence", __name__, url_prefix="/api/intelligence")


def serialize_doc(doc):
    if not doc:
        return None
    d = dict(doc)
    if "_id" in d:
        d["_id"] = str(d["_id"])
    return d


DEFAULT_COMPETITOR_QUOTES = [
    {
        "quote_id": "CPQ-2026-001",
        "competitor_name": "Pattabhi Agro Foods",
        "commodity": "IR-64 Parboiled Rice 5% Broken",
        "category": "Agricultural Grains",
        "origin_country": "India (Kakinada)",
        "fob_price_usd_mt": 440.0,
        "cif_price_usd_mt": 485.0,
        "destination_port": "Jebel Ali Port, Dubai (AEJEA)",
        "packaging": "50kg White PP Bags with Single Stitching",
        "payment_terms": "100% Irrevocable Sight LC",
        "our_price_usd_mt": 435.0,
        "spread_usd": -5.0,
        "price_advantage": "TradePulse offers $5/MT discount advantage",
        "verified_date": now_iso()[:10],
        "notes": "Direct bulk conveyor loading rate at Kakinada Deepwater Port",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "quote_id": "CPQ-2026-002",
        "competitor_name": "Olam International Gulf",
        "commodity": "Non-Basmati Swarna Parboiled",
        "category": "Agricultural Grains",
        "origin_country": "India (Kolkata/Haldia)",
        "fob_price_usd_mt": 450.0,
        "cif_price_usd_mt": 505.0,
        "destination_port": "King Abdulaziz Port, Dammam (SADMM)",
        "packaging": "25kg Branded Polypropylene Bags",
        "payment_terms": "CAD against original bank documents",
        "our_price_usd_mt": 442.0,
        "spread_usd": -8.0,
        "price_advantage": "TradePulse offers $8/MT discount advantage",
        "verified_date": now_iso()[:10],
        "notes": "High volume tender quote verified from Riyadh commodity exchange",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "quote_id": "CPQ-2026-003",
        "competitor_name": "KRBL Limited",
        "commodity": "1121 Extra Long Grain Steam Basmati",
        "category": "Basmati Specialties",
        "origin_country": "India (Mundra)",
        "fob_price_usd_mt": 1180.0,
        "cif_price_usd_mt": 1245.0,
        "destination_port": "Jebel Ali Port, Dubai (AEJEA)",
        "packaging": "10kg Non-Woven Zipper Pouches",
        "payment_terms": "30% Advance + 70% LC at Sight",
        "our_price_usd_mt": 1150.0,
        "spread_usd": -30.0,
        "price_advantage": "TradePulse offers $30/MT discount advantage",
        "verified_date": now_iso()[:10],
        "notes": "Premium retail brand quote. Premium packaging charges included",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "quote_id": "CPQ-2026-004",
        "competitor_name": "Wilmar Sugar & Agri",
        "commodity": "Refined White Cane Sugar ICUMSA 45",
        "category": "Sweeteners & Sugar",
        "origin_country": "Brazil (Santos)",
        "fob_price_usd_mt": 535.0,
        "cif_price_usd_mt": 595.0,
        "destination_port": "Hamad Port, Doha (QAHMD)",
        "packaging": "50kg Food Grade Liner Bags",
        "payment_terms": "100% Irrevocable Confirmed LC",
        "our_price_usd_mt": 528.0,
        "spread_usd": -7.0,
        "price_advantage": "TradePulse offers $7/MT discount advantage",
        "verified_date": now_iso()[:10],
        "notes": "Bulk break-bulk vessel discharge into Hamad terminal silos",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
    {
        "quote_id": "CPQ-2026-005",
        "competitor_name": "Vardhman Textiles Ltd",
        "commodity": "100% Combed Cotton Ring Spun Yarn (30s Count)",
        "category": "Textiles & Yarns",
        "origin_country": "India (JNPT)",
        "fob_price_usd_mt": 3150.0,
        "cif_price_usd_mt": 3320.0,
        "destination_port": "Chittagong Port, Bangladesh (BDCGP)",
        "packaging": "Cartons on fumigated wooden pallets",
        "payment_terms": "Letter of Credit 90 Days Usance",
        "our_price_usd_mt": 3100.0,
        "spread_usd": -50.0,
        "price_advantage": "TradePulse offers $50/MT discount advantage",
        "verified_date": now_iso()[:10],
        "notes": "Garment manufacturing factory export order under bonded warehouse license",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    },
]


DEFAULT_COMPETITOR_PROFILES = [
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

DEFAULT_FREIGHT_INDEX = [
    {"intel_type": "freight_index", "origin_port": "Kolkata Port (INCCU)", "destination_port": "Jebel Ali (AEJEA), Dubai", "rate_20ft_usd": 650, "rate_40ft_usd": 1050, "transit_days": 14, "carrier": "Maersk / MSC", "trend": "Stable (+1.5%)", "updated_at": now_iso()},
    {"intel_type": "freight_index", "origin_port": "Kolkata Port (INCCU)", "destination_port": "Dammam (SADMM), Saudi Arabia", "rate_20ft_usd": 780, "rate_40ft_usd": 1250, "transit_days": 18, "carrier": "Hapag-Lloyd", "trend": "Decreasing (-2.0%)", "updated_at": now_iso()},
    {"intel_type": "freight_index", "origin_port": "Haldia Port (INHAL)", "destination_port": "Hamad Port (QAHMD), Qatar", "rate_20ft_usd": 720, "rate_40ft_usd": 1180, "transit_days": 16, "carrier": "CMA CGM", "trend": "Stable", "updated_at": now_iso()},
    {"intel_type": "freight_index", "origin_port": "Kolkata Port (INCCU)", "destination_port": "Sohar Port (OMSOH), Oman", "rate_20ft_usd": 690, "rate_40ft_usd": 1100, "transit_days": 15, "carrier": "MSC", "trend": "Stable", "updated_at": now_iso()},
    {"intel_type": "freight_index", "origin_port": "Nhava Sheva (INNSA)", "destination_port": "Jebel Ali (AEJEA), Dubai", "rate_20ft_usd": 480, "rate_40ft_usd": 750, "transit_days": 5, "carrier": "ONE / Evergreen", "trend": "Increasing (+3.2%)", "updated_at": now_iso()},
    {"intel_type": "freight_index", "origin_port": "Kakinada (INKAK)", "destination_port": "Cotonou (BJCOO), Benin", "rate_20ft_usd": 1850, "rate_40ft_usd": 2900, "transit_days": 32, "carrier": "MSC / Maersk", "trend": "Volatile (+5.0%)", "updated_at": now_iso()},
]

DEFAULT_PRICE_BENCHMARKS = [
    {"intel_type": "price_benchmark", "commodity": "IR-64 Parboiled Rice (5% Broken)", "grade": "Sortex Cleaned", "fob_price_usd_mt": 445, "cif_jebel_ali_usd_mt": 472, "change_wow_usd": "+5.00", "trend": "Bullish", "updated_at": now_iso()},
    {"intel_type": "price_benchmark", "commodity": "Swarna Parboiled Rice", "grade": "Silky Polish, max 13.5% moist", "fob_price_usd_mt": 420, "cif_jebel_ali_usd_mt": 448, "change_wow_usd": "-2.00", "trend": "Neutral", "updated_at": now_iso()},
    {"intel_type": "price_benchmark", "commodity": "Miniket Parboiled Rice (WB Cluster)", "grade": "Export Grade 1", "fob_price_usd_mt": 580, "cif_jebel_ali_usd_mt": 615, "change_wow_usd": "+12.00", "trend": "Bullish", "updated_at": now_iso()},
    {"intel_type": "price_benchmark", "commodity": "100% Broken White Rice (HS 10064000)", "grade": "Clean Brewery Spec", "fob_price_usd_mt": 360, "cif_jebel_ali_usd_mt": 388, "change_wow_usd": "0.00", "trend": "Stable", "updated_at": now_iso()},
    {"intel_type": "price_benchmark", "commodity": "Sona Masoori Raw Rice", "grade": "Aged 1 Year", "fob_price_usd_mt": 720, "cif_jebel_ali_usd_mt": 755, "change_wow_usd": "+8.00", "trend": "Bullish", "updated_at": now_iso()},
]

DEFAULT_TARIFF_INTEL = [
    {"intel_type": "tariff_intel", "hs_code": "10063019", "commodity": "Parboiled Rice - Other (Non-Basmati IR-64, Swarna, Miniket)", "india_export_duty": "0% (Exempted under DGFT 2025-26 notification)", "apeda_registration_mandate": "Required (Contract RC generated via APEDA portal)", "uae_import_duty": "0% (GCC Customs Union Basic Foodstuff Exemption)", "saudi_import_duty": "0% (SFDA Licensed Importer Certificate Required)", "eu_import_duty": "€175 / MT (Specific duty under TRQ quotas)", "notes": "Created under DGFT Trade Notice 04/2025-26 splitting legacy 10063010", "updated_at": now_iso()},
    {"intel_type": "tariff_intel", "hs_code": "10063012", "commodity": "Parboiled Basmati Rice", "india_export_duty": "0% (MEP removed by DGFT Sept 2024)", "apeda_registration_mandate": "Mandatory Basmati Verification Contract", "uae_import_duty": "0%", "saudi_import_duty": "0% (Subject to mandatory SASO / SFDA standard 2062)", "eu_import_duty": "Zero duty under EC Regulation 972/2006 for verified DNA varieties", "notes": "Basmati GI varieties only", "updated_at": now_iso()},
    {"intel_type": "tariff_intel", "hs_code": "10064000", "commodity": "Broken Rice", "india_export_duty": "Permitted under specific quotas to friendly countries", "apeda_registration_mandate": "Required", "uae_import_duty": "0%", "saudi_import_duty": "0%", "eu_import_duty": "€65 / MT", "notes": "Export allowed on G2G and approved commercial allocations", "updated_at": now_iso()},
]


def _ensure_default_intelligence(db):
    if db.competitive_intelligence.count_documents({}) == 0:
        db.competitive_intelligence.insert_many(
            DEFAULT_COMPETITOR_PROFILES + DEFAULT_FREIGHT_INDEX + DEFAULT_PRICE_BENCHMARKS + DEFAULT_TARIFF_INTEL
        )


@intelligence_bp.route("/summary", methods=["GET"])
def get_intelligence_summary():
    db = get_db()
    _ensure_default_intelligence(db)
    competitors = list(db.competitive_intelligence.find({"intel_type": "competitor"}))
    freight = list(db.competitive_intelligence.find({"intel_type": "freight_index"}))
    pricing = list(db.competitive_intelligence.find({"intel_type": "price_benchmark"}))
    tariffs = list(db.competitive_intelligence.find({"intel_type": "tariff_intel"}))
    quotes = list(db.competitor_pricing.find({}))
    if len(quotes) == 0:
        db.competitor_pricing.insert_many(DEFAULT_COMPETITOR_QUOTES)
        quotes = list(db.competitor_pricing.find({}))

    avg_freight_20ft = round(sum(f.get("rate_20ft_usd", 0) for f in freight) / max(len(freight), 1), 2)
    avg_fob_price = round(sum(p.get("fob_price_usd_mt", 0) for p in pricing) / max(len(pricing), 1), 2)
    total_competitor_volume = sum(c.get("estimated_volume_mt_month", 0) for c in competitors)

    return jsonify({
        "total_tracked_competitors": len(competitors),
        "total_monitored_freight_routes": len(freight),
        "total_commodity_benchmarks": len(pricing),
        "total_tariff_codes": len(tariffs),
        "total_competitor_quotes": len(quotes),
        "avg_freight_rate_20ft_usd": avg_freight_20ft,
        "avg_fob_price_usd_mt": avg_fob_price,
        "total_competitor_monthly_volume_mt": total_competitor_volume,
    })


@intelligence_bp.route("/competitor-pricing", methods=["GET"])
def get_competitor_pricing():
    db = get_db()
    count = db.competitor_pricing.count_documents({})
    if count == 0:
        db.competitor_pricing.insert_many(DEFAULT_COMPETITOR_QUOTES)

    category = request.args.get("category")
    competitor = request.args.get("competitor")
    query = {}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    if competitor:
        query["competitor_name"] = {"$regex": competitor, "$options": "i"}

    quotes = list(db.competitor_pricing.find(query).sort("verified_date", -1))
    return jsonify({"quotes": [serialize_doc(q) for q in quotes], "total": len(quotes)})


@intelligence_bp.route("/competitor-pricing", methods=["POST"])
def add_competitor_pricing():
    db = get_db()
    data = request.get_json() or {}
    if not data.get("competitor_name") or not data.get("commodity"):
        return jsonify({"error": "competitor_name and commodity are required"}), 400

    quote_id = data.get("quote_id") or f"CPQ-{now_iso()[:4]}-{uuid.uuid4().hex[:4].upper()}"
    fob = float(data.get("fob_price_usd_mt", 0))
    cif = float(data.get("cif_price_usd_mt", fob + 45))
    our_price = float(data.get("our_price_usd_mt", fob - 10))
    spread = round(our_price - fob, 2)

    doc = {
        "quote_id": quote_id,
        "competitor_name": data["competitor_name"],
        "commodity": data["commodity"],
        "category": data.get("category", "General Commodities"),
        "origin_country": data.get("origin_country", "India"),
        "fob_price_usd_mt": fob,
        "cif_price_usd_mt": cif,
        "destination_port": data.get("destination_port", "Jebel Ali Port (AEJEA)"),
        "packaging": data.get("packaging", "Standard Export Bags"),
        "payment_terms": data.get("payment_terms", "100% LC at Sight"),
        "our_price_usd_mt": our_price,
        "spread_usd": spread,
        "price_advantage": f"TradePulse advantage: ${abs(spread)}/MT {'cheaper' if spread < 0 else 'premium'}",
        "verified_date": data.get("verified_date", now_iso()[:10]),
        "notes": data.get("notes", "Direct spot offer verified from commercial broker"),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    db.competitor_pricing.insert_one(doc)
    return jsonify({"quote": serialize_doc(doc), "message": "Competitor pricing quote recorded"}), 201


@intelligence_bp.route("/competitor-pricing/<quote_id>", methods=["PATCH"])
def update_competitor_pricing(quote_id):
    db = get_db()
    data = request.get_json() or {}
    update_fields = {"updated_at": now_iso()}

    for k in ["competitor_name", "commodity", "category", "origin_country", "destination_port", "packaging", "payment_terms", "notes", "verified_date"]:
        if k in data:
            update_fields[k] = data[k]

    if "fob_price_usd_mt" in data:
        update_fields["fob_price_usd_mt"] = float(data["fob_price_usd_mt"])
    if "cif_price_usd_mt" in data:
        update_fields["cif_price_usd_mt"] = float(data["cif_price_usd_mt"])
    if "our_price_usd_mt" in data:
        update_fields["our_price_usd_mt"] = float(data["our_price_usd_mt"])

    db.competitor_pricing.update_one({"quote_id": quote_id}, {"$set": update_fields})
    updated = db.competitor_pricing.find_one({"quote_id": quote_id})
    if not updated:
        return jsonify({"error": "Quote not found"}), 404
    return jsonify({"quote": serialize_doc(updated), "message": "Competitor quote updated"})


@intelligence_bp.route("/competitor-pricing/<quote_id>", methods=["DELETE"])
def delete_competitor_pricing(quote_id):
    db = get_db()
    res = db.competitor_pricing.delete_one({"quote_id": quote_id})
    if res.deleted_count == 0:
        return jsonify({"error": "Quote not found"}), 404
    return jsonify({"message": f"Quote {quote_id} deleted successfully"})


@intelligence_bp.route("/competitors", methods=["GET"])
def get_competitors():
    db = get_db()
    _ensure_default_intelligence(db)
    profiles = list(db.competitive_intelligence.find({"intel_type": "competitor"}))
    return jsonify({"competitors": [serialize_doc(p) for p in profiles]})


@intelligence_bp.route("/competitors", methods=["POST"])
def add_competitor():
    db = get_db()
    data = request.get_json() or {}
    if not data.get("company_name"):
        return jsonify({"error": "company_name is required"}), 400

    doc = {
        "intel_type": "competitor",
        "company_name": data["company_name"],
        "hq_country": data.get("hq_country", "India"),
        "estimated_volume_mt_month": float(data.get("estimated_volume_mt_month", 5000)),
        "core_varieties": data.get("core_varieties", "General Commodities"),
        "primary_export_markets": data.get("primary_export_markets", ["UAE", "Saudi Arabia"]),
        "export_ports": data.get("export_ports", ["Kolkata Port", "JNPT Mumbai"]),
        "pricing_strategy": data.get("pricing_strategy", "Competitive tender"),
        "market_share_tier": data.get("market_share_tier", "Mid-Tier Exporter"),
        "strengths": data.get("strengths", ""),
        "vulnerabilities": data.get("vulnerabilities", ""),
        "updated_at": now_iso(),
    }
    db.competitive_intelligence.insert_one(doc)
    return jsonify({"competitor": serialize_doc(doc), "message": "Competitor profile added"}), 201


@intelligence_bp.route("/freight", methods=["GET"])
def get_freight_index():
    db = get_db()
    _ensure_default_intelligence(db)
    routes = list(db.competitive_intelligence.find({"intel_type": "freight_index"}))
    return jsonify({"freight_index": [serialize_doc(r) for r in routes]})


@intelligence_bp.route("/freight", methods=["POST"])
def add_freight_route():
    db = get_db()
    data = request.get_json() or {}
    if not data.get("origin_port") or not data.get("destination_port"):
        return jsonify({"error": "origin_port and destination_port are required"}), 400

    doc = {
        "intel_type": "freight_index",
        "origin_port": data["origin_port"],
        "destination_port": data["destination_port"],
        "rate_20ft_usd": float(data.get("rate_20ft_usd", 650)),
        "rate_40ft_usd": float(data.get("rate_40ft_usd", 1100)),
        "transit_days": int(data.get("transit_days", 14)),
        "carrier": data.get("carrier", "Major Carrier"),
        "trend": data.get("trend", "Stable"),
        "updated_at": now_iso(),
    }
    db.competitive_intelligence.insert_one(doc)
    return jsonify({"route": serialize_doc(doc), "message": "Freight route added"}), 201


@intelligence_bp.route("/pricing", methods=["GET"])
def get_pricing_benchmarks():
    db = get_db()
    _ensure_default_intelligence(db)
    prices = list(db.competitive_intelligence.find({"intel_type": "price_benchmark"}))
    return jsonify({"price_benchmarks": [serialize_doc(p) for p in prices]})


@intelligence_bp.route("/pricing", methods=["POST"])
def add_price_benchmark():
    db = get_db()
    data = request.get_json() or {}
    if not data.get("commodity"):
        return jsonify({"error": "commodity is required"}), 400

    doc = {
        "intel_type": "price_benchmark",
        "commodity": data["commodity"],
        "grade": data.get("grade", "Standard Export Grade"),
        "fob_price_usd_mt": float(data.get("fob_price_usd_mt", 450)),
        "cif_jebel_ali_usd_mt": float(data.get("cif_jebel_ali_usd_mt", 480)),
        "change_wow_usd": data.get("change_wow_usd", "0.00"),
        "trend": data.get("trend", "Stable"),
        "updated_at": now_iso(),
    }
    db.competitive_intelligence.insert_one(doc)
    return jsonify({"benchmark": serialize_doc(doc), "message": "Price benchmark added"}), 201


@intelligence_bp.route("/tariffs", methods=["GET"])
def get_tariffs():
    db = get_db()
    _ensure_default_intelligence(db)
    tariffs = list(db.competitive_intelligence.find({"intel_type": "tariff_intel"}))
    return jsonify({"tariffs": [serialize_doc(t) for t in tariffs]})
