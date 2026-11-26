"""API helper utilities for serialization, sorting, and MongoDB queries."""

import json
import re
import urllib.parse
from typing import Dict, List, Optional, Tuple
from bson import ObjectId
from app.contacts_service import canonical_lead_id, get_contacts_count_map

CSV_EXPORT_FIELDS = [
    "id",
    "company_name",
    "lead_type",
    "country",
    "city_or_hub",
    "contact_person",
    "primary_email",
    "secondary_email",
    "direct_phone",
    "whatsapp_url",
    "linkedin_persona_url",
    "linkedin_profile_url",
    "corporate_contact_page_url",
    "contact_page_url",
    "github_url",
    "phones",
    "emails",
    "website",
    "address",
    "gstin",
    "pan",
    "iec_code",
    "fssai_or_sfda_status",
    "district",
    "state",
    "matched_varieties",
    "hs_codes_applicable",
    "priority_score",
    "deal_status",
    "nearest_port",
    "shipment_volume",
    "annual_volume_est",
    "importer_tier",
    "customs_manifest_data",
    "whatsapp_outreach_url",
    "linkedin_search_url",
    "google_maps_url",
    "twitter_url",
    "facebook_url",
    "origin_state",
    "b2b_directory",
    "harvest_date",
    "source_name",
    "source_url",
    "source_category",
    "source_reliability",
    "contacts_count",
    "created_at",
]


def _infer_b2b_directory(doc: dict) -> str:
    explicit = str(doc.get("b2b_directory") or "").strip()
    if explicit:
        return explicit
    src = f"{doc.get('source_url') or ''} {doc.get('source_name') or ''}".lower()
    directory_map = (
        ("go4worldbusiness", "Go4WorldBusiness"),
        ("indiamart", "IndiaMART"),
        ("wbrma", "WBRMA Member Directory"),
        ("apeda", "APEDA Trade Registry"),
        ("exportmandi", "ExportMandi"),
        ("tradeindia", "TradeIndia"),
        ("kompass", "Kompass"),
        ("alibaba", "Alibaba Trade"),
    )
    for token, label in directory_map:
        if token in src:
            return label
    return str(doc.get("source_name") or "Global Verified Trade Directory")


def serialize_mongo_lead(doc: dict, contacts_count: Optional[int] = None) -> dict:
    if not doc:
        return {}
    lead_id = doc.get("id")
    if lead_id is None:
        lead_id = str(doc.get("_id", ""))

    city_or_hub = doc.get("city_or_hub") or ""
    district = doc.get("district") or ""
    address = doc.get("address") or ""
    country = doc.get("country") or ""
    loc_str = f"{city_or_hub} {district} {address} {country}".lower()

    lat, lng, port = 25.2048, 55.2708, "Jebel Ali Port (AEJEA)"
    geo_map = {
        "dubai": (25.2048, 55.2708, "Jebel Ali Port (AEJEA)"),
        "sharjah": (25.3463, 55.4209, "Port Khalid (AESHJ)"),
        "abu dhabi": (24.4539, 54.3773, "Khalifa Port (AEKHL)"),
        "ajman": (25.4052, 55.5136, "Ajman Port"),
        "riyadh": (24.7136, 46.6753, "Dry Port Riyadh / Dammam"),
        "jeddah": (21.4858, 39.1925, "Jeddah Islamic Port (SAJED)"),
        "dammam": (26.4207, 50.0888, "King Abdulaziz Port (SADMM)"),
        "doha": (25.2854, 51.5310, "Hamad Port (QAHMD)"),
        "muscat": (23.5880, 58.3829, "Port Sultan Qaboos (OMMSQ)"),
        "sohar": (24.3461, 56.7075, "Port of Sohar (OMSOH)"),
        "kuwait": (29.3759, 47.9774, "Shuwaikh Port (KWSWK)"),
        "bahrain": (26.2285, 50.5860, "Khalifa Bin Salman Port (BHKBS)"),
        "kolkata": (22.5726, 88.3639, "Syama Prasad Mookerjee Port (INCCU)"),
        "bardhaman": (23.2324, 87.8615, "Kolkata Port / Haldia Gateway"),
        "burdwan": (23.2324, 87.8615, "Kolkata Port / Haldia Gateway"),
        "hooghly": (22.9056, 88.3965, "Kolkata Port (45 km)"),
        "nadia": (23.4710, 88.5565, "Kolkata Port (95 km)"),
        "midnapore": (22.4257, 87.3199, "Haldia Port (INHAL)"),
        "haldia": (22.0667, 88.0698, "Haldia Port (INHAL)"),
        "kakinada": (16.9891, 82.2475, "Kakinada Deepwater Port (INKAK)"),
        "mumbai": (18.9499, 72.9520, "JNPT Nhava Sheva (INNSA)"),
    }

    matched = False
    for k, v in geo_map.items():
        if k in loc_str:
            lat, lng, port = v
            matched = True
            break

    if not matched:
        c_low = country.lower()
        if "saudi" in c_low:
            lat, lng, port = 24.7136, 46.6753, "King Abdulaziz Port / Jeddah"
        elif "qatar" in c_low:
            lat, lng, port = 25.2854, 51.5310, "Hamad Port (QAHMD)"
        elif "oman" in c_low:
            lat, lng, port = 23.5880, 58.3829, "Sohar Port (OMSOH)"
        elif "kuwait" in c_low:
            lat, lng, port = 29.3759, 47.9774, "Shuwaikh Port (KWSWK)"
        elif "bahrain" in c_low:
            lat, lng, port = 26.2285, 50.5860, "Khalifa Bin Salman Port"
        elif "india" in c_low:
            lat, lng, port = 22.5726, 88.3639, "Kolkata Port / Haldia"
        else:
            lat, lng, port = 25.2048, 55.2708, "Jebel Ali Port (AEJEA)"

    try:
        numeric_id = int(lead_id)
    except (ValueError, TypeError):
        numeric_id = hash(str(lead_id))
    jitter = ((numeric_id % 20) - 10) * 0.003
    lat = round(lat + jitter, 5)
    lng = round(lng + jitter, 5)

    lead_type = doc.get("lead_type") or "importer"
    priority_score = int(doc.get("priority_score") or 0)
    is_imp = (lead_type == "importer")
    trade_role = doc.get("trade_role") or ("Direct Bulk & Retail Commodity Importer" if is_imp else "Primary Certified Processing Mill & Exporter")
    vol_est = doc.get("annual_volume_est") or (f"{(priority_score * 180):,} MT / Year" if priority_score > 0 else "5,000 MT / Year")
    risk_tier = doc.get("risk_tier") or ("Tier 1 Verified (Grade A+)" if priority_score >= 80 else "Commercial Active Trader")
    lanes = doc.get("key_trade_lanes") or [
        f"Kolkata Port (INCCU) → {port}",
        f"Haldia Port (INHAL) → {port}",
    ]

    matched_varieties = doc.get("matched_varieties") or ""
    raw_commodities = doc.get("commodities_list")
    if isinstance(raw_commodities, list) and raw_commodities:
        varieties = [str(v).strip() for v in raw_commodities if str(v).strip()]
    elif isinstance(raw_commodities, str) and raw_commodities.strip():
        varieties = [v.strip() for v in re.split(r"[;,]", raw_commodities) if v.strip()]
    else:
        varieties = [v.strip() for v in matched_varieties.split(";") if v.strip()]
        if not varieties:
            varieties = [v.strip() for v in matched_varieties.split(",") if v.strip()]
        if not varieties:
            varieties = ["Non-Basmati Grains", "Parboiled Cargo", "Agricultural Merchandise"]

    company_name = doc.get("company_name") or ""
    contact_person = doc.get("contact_person") or ""
    phones = doc.get("phones") or ""
    n_port = doc.get("nearest_port") or port
    shipment_volume = doc.get("shipment_volume") or ("1-3 Containers / mo (25-75 MT)" if is_imp else "")
    importer_tier = doc.get("importer_tier") or ("sme_importer" if is_imp else "")
    customs_manifest_data = doc.get("customs_manifest_data") or (
        f"Customs B/L Manifest (HS 100630) | Port: {n_port} | 1-3 FCL/mo" if is_imp else ""
    )

    # Multi-channel communication resolution
    raw_emails_str = doc.get("emails") or ""
    email_items = [e.strip() for e in re.split(r"[;,]", raw_emails_str) if e.strip() and "@" in e]
    primary_email = doc.get("primary_email") or (email_items[0] if email_items else "")
    secondary_email = doc.get("secondary_email") or (email_items[1] if len(email_items) > 1 else "")

    phone_items = [p.strip() for p in re.split(r"[;,]", phones) if p.strip()]
    direct_phone = doc.get("direct_phone") or (phone_items[0] if phone_items else "")

    website_url = doc.get("website") or ""
    corporate_contact_page_url = doc.get("corporate_contact_page_url") or (f"{website_url.rstrip('/')}/contact" if website_url else "")

    # Generate 1-click WhatsApp Outreach Link with personalized CIF export message
    whatsapp_url = doc.get("whatsapp_url") or doc.get("whatsapp_outreach_url") or ""
    clean_digits = re.sub(r"[^\d]", "", direct_phone or (phones.split(";")[0] if phones else ""))
    if not whatsapp_url and clean_digits and is_imp:
        contact_label = contact_person.split("(")[0].strip() or "Purchase Manager"
        com_name = company_name.split("(")[0].strip() or "your company"
        v_name = varieties[0] if varieties else "IR-64 Parboiled Rice"
        hs_code_str = doc.get("hs_codes_applicable") or "HS 100630"
        wa_text = urllib.parse.quote_plus(
            f"Hello {contact_label}, we noticed {com_name} actively imports 1-3 containers of {v_name} ({hs_code_str}) via {n_port}. "
            f"We are an APEDA-accredited rice mill in West Bengal exporting Non-Basmati Parboiled IR-64 & 1121 Basmati. "
            f"We would like to share our current CIF quote and lab inspection specifications. May we send the specification sheet?"
        )
        whatsapp_url = f"https://wa.me/{clean_digits}?text={wa_text}"

    # Generate 1-click LinkedIn Search / Persona Link
    linkedin_url = doc.get("linkedin_persona_url") or doc.get("linkedin_search_url") or ""
    if not linkedin_url and company_name:
        clean_co = re.sub(r"\b(?:LLC|W\.L\.L\.|Ltd|SARL|Est\.|Inc\.|FZE|Pte)\b", "", company_name, flags=re.IGNORECASE).strip()
        linkedin_url = f"https://www.linkedin.com/search/results/people/?keywords={urllib.parse.quote_plus(clean_co + ' Purchase Manager')}"
    linkedin_persona_url = doc.get("linkedin_persona_url") or linkedin_url

    # Generate Google Maps Search Link for verification
    gmaps_url = doc.get("google_maps_url") or ""
    if not gmaps_url and company_name:
        gmaps_url = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote_plus(company_name + ' ' + (city_or_hub or country))}"

    return {
        "id": lead_id,
        "_id": str(doc.get("_id", "")),
        "company_name": company_name,
        "country": country,
        "city_or_hub": city_or_hub,
        "contact_person": contact_person,
        "primary_email": primary_email,
        "secondary_email": secondary_email,
        "direct_phone": direct_phone,
        "whatsapp_url": whatsapp_url,
        "linkedin_persona_url": linkedin_persona_url,
        "linkedin_profile_url": doc.get("linkedin_profile_url") or linkedin_persona_url,
        "corporate_contact_page_url": corporate_contact_page_url,
        "contact_page_url": doc.get("contact_page_url") or corporate_contact_page_url,
        "github_url": doc.get("github_url") or "",
        "phones": phones,
        "emails": doc.get("emails") or "",
        "website": doc.get("website") or "",
        "address": address,
        "matched_varieties": matched_varieties,
        "commodities_list": varieties,
        "hs_codes_applicable": doc.get("hs_codes_applicable") or "10063019; 10063090",
        "inquiry_or_profile": doc.get("inquiry_or_profile") or "",
        "priority_score": priority_score,
        "lead_type": lead_type,
        "gstin": doc.get("gstin") or "",
        "pan": doc.get("pan") or "",
        "iec_code": doc.get("iec_code") or doc.get("registration_number") or "",
        "fssai_or_sfda_status": doc.get("fssai_or_sfda_status") or "",
        "state": doc.get("state") or "",
        "origin_state": doc.get("origin_state") or doc.get("state") or "",
        "district": district,
        "category_or_role": doc.get("category_or_role") or "",
        "deal_status": doc.get("deal_status") or "unassigned",
        "latitude": doc.get("latitude", lat),
        "longitude": doc.get("longitude", lng),
        "nearest_port": n_port,
        "trade_role": trade_role,
        "annual_volume_est": vol_est,
        "risk_tier": risk_tier,
        "key_trade_lanes": lanes,
        "shipment_volume": shipment_volume,
        "importer_tier": importer_tier,
        "customs_manifest_data": customs_manifest_data,
        "whatsapp_outreach_url": whatsapp_url,
        "linkedin_search_url": linkedin_url,
        "google_maps_url": gmaps_url,
        "twitter_url": doc.get("twitter_url") or "",
        "facebook_url": doc.get("facebook_url") or "",
        "instagram_url": doc.get("instagram_url") or "",
        "linkedin_company_url": doc.get("linkedin_company_url") or "",
        "source_name": doc.get("source_name") or "Global Verified Trade Directory",
        "source_url": doc.get("source_url") or "",
        "source_category": doc.get("source_category") or ("Commercial Trade Manifest" if is_imp else "B2B Trade Directory"),
        "source_reliability": (
            int(doc["source_reliability"])
            if doc.get("source_reliability") is not None and doc.get("source_reliability") != ""
            else 96
        ),
        "b2b_directory": _infer_b2b_directory(doc),
        "harvest_date": str(doc.get("harvest_date") or doc.get("created_at") or ""),
        "contacts_count": int(contacts_count if contacts_count is not None else (doc.get("contacts_count") or 0)),
        "duplicate_probability": round(float(doc.get("duplicate_probability") if doc.get("duplicate_probability") is not None else 7.5), 1),
        "duplicate_status": doc.get("duplicate_status") or ("duplicate" if float(doc.get("duplicate_probability") or 0) >= 75.0 else ("partial_match" if float(doc.get("duplicate_probability") or 0) >= 30.0 else "unique")),
        "custom_label": doc.get("custom_label") or "",
        "extraction_notes": doc.get("extraction_notes") or "",
        "is_deleted": bool(doc.get("is_deleted", False)),
        "deleted_at": str(doc.get("deleted_at") or ""),
        "merge_count": int(doc.get("merge_count") or 1),
        "merged_history": doc.get("merged_history") or [],
        "created_at": str(doc.get("created_at") or ""),
        "updated_at": str(doc.get("updated_at") or ""),
    }


def parse_sort_param(sort_param: str):
    sort_map = {
        "score_desc": [("priority_score", -1), ("_id", -1)],
        "score_asc": [("priority_score", 1), ("_id", -1)],
        "name_asc": [("company_name", 1), ("_id", -1)],
        "name_desc": [("company_name", -1), ("_id", -1)],
        "date_desc": [("_id", -1)],
        "date_asc": [("_id", 1)],
        "volume_desc": [("annual_volume_est", -1), ("priority_score", -1)],
    }
    return sort_map.get(sort_param, [("_id", -1)])


def find_mongo_lead(mongo_db, lead_id):
    query_conditions = []
    try:
        query_conditions.append({"id": int(lead_id)})
    except (ValueError, TypeError):
        pass
    query_conditions.append({"id": str(lead_id)})
    if ObjectId.is_valid(str(lead_id)):
        query_conditions.append({"_id": ObjectId(str(lead_id))})
    return mongo_db.leads.find_one({"$or": query_conditions})



def paginate_cursor(mongo_db, filter_q, default_per_page=25, max_per_page=250):
    from flask import request
    total = mongo_db.leads.count_documents(filter_q)
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", default_per_page, type=int), 1), max_per_page)
    skip = (page - 1) * per_page
    pages = (total + per_page - 1) // per_page if total > 0 else 0
    sort_by = request.args.get("sort_by", "date_desc")
    sort_order = parse_sort_param(sort_by)
    docs = list(mongo_db.leads.find(filter_q).sort(sort_order).skip(skip).limit(per_page))
    counts_map = get_contacts_count_map(mongo_db, docs)
    leads = [
        serialize_mongo_lead(doc, contacts_count=counts_map.get(canonical_lead_id(doc), 0))
        for doc in docs
    ]
    return leads, total, page, pages, per_page


def sync_lead_to_sqlite(doc, db, Lead):
    try:
        manifest_raw = doc.get("customs_manifest_data", "")
        manifest_str = json.dumps(manifest_raw) if isinstance(manifest_raw, (dict, list)) else str(manifest_raw or "")
        sr_raw = doc.get("source_reliability")
        sr_val = int(sr_raw) if sr_raw is not None and sr_raw != "" else 96
        lead_sq = Lead(
            id=doc.get("id"),
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
            priority_score=int(doc.get("priority_score") or 0),
            source_url=doc.get("source_url", ""),
            lead_type=doc.get("lead_type", "importer"),
            gstin=doc.get("gstin", ""),
            pan=doc.get("pan", ""),
            fssai_or_sfda_status=doc.get("fssai_or_sfda_status", ""),
            state=doc.get("state", ""),
            district=doc.get("district", ""),
            category_or_role=doc.get("category_or_role", ""),
            origin_state=doc.get("origin_state", ""),
            b2b_directory=doc.get("b2b_directory", ""),
            harvest_date=doc.get("harvest_date", ""),
            customs_manifest_data=manifest_str,
            source_name=doc.get("source_name", ""),
            source_category=doc.get("source_category", ""),
            source_reliability=sr_val,
            shipment_volume=doc.get("shipment_volume", ""),
            annual_volume_est=doc.get("annual_volume_est", ""),
            nearest_port=doc.get("nearest_port", ""),
            extraction_notes=doc.get("extraction_notes", ""),
        )
        db.session.add(lead_sq)
        db.session.commit()
    except Exception:
        try:
            db.session.rollback()
        except Exception:
            pass
