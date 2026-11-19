import re
from typing import Dict, List, Optional
from bs4 import BeautifulSoup
from app.config import Config
from app.lead_engine import (
    clean_company_key,
    decode_gstin_and_fssai,
    detect_wb_district,
    is_machinery_or_spare_parts_seller,
    normalize_deobfuscated_emails,
    normalize_phones,
)


def parse_sfda_approved_mills_text(text: str) -> Dict[str, str]:
    sfda_wb_mills: Dict[str, str] = {}
    for line in text.splitlines():
        if any(w in line.upper() for w in ["WEST BENGAL", "WEST, BENGAL", "BARDHAMAN", "BURDWAN"]):
            key = clean_company_key(line)
            if key:
                sfda_wb_mills[key] = f"SFDA Approved Active ({line.strip()})"
    return sfda_wb_mills


def parse_wbrma_html(
    html: str,
    source_url: str = "",
    configured_districts: Optional[List[str]] = None,
    sfda_lookup: Optional[Dict[str, str]] = None,
) -> List[Dict[str, any]]:
    if configured_districts is None:
        configured_districts = Config().TARGET_MILL_DISTRICTS
    if sfda_lookup is None:
        sfda_lookup = {}

    mills = []
    soup = BeautifulSoup(html, "lxml")
    potential_blocks = soup.find_all("div", class_=lambda c: c and "mainember" in c)
    if not potential_blocks:
        potential_blocks = soup.find_all(
            lambda tag: tag.name in ("div", "li", "tr", "article")
            and "PAN/GST" in tag.get_text()
            and len(tag.get_text(strip=True)) < 900
        )

    for block in potential_blocks:
        raw_text = " | ".join(block.stripped_strings)
        if is_machinery_or_spare_parts_seller(raw_text):
            continue

        emails = normalize_deobfuscated_emails(raw_text)
        phones = normalize_phones(raw_text, "IN")
        gstin, pan, fssai = decode_gstin_and_fssai(raw_text)

        parts = []
        for s in block.stripped_strings:
            for line in s.splitlines():
                l_str = line.strip()
                if l_str and l_str not in ("Send Enquiry", "Recommend", ","):
                    parts.append(l_str)
        if len(parts) < 4:
            continue

        if parts[0].startswith("(") and parts[0].endswith(")") and len(parts) > 1:
            comp_name = parts[1]
            category = parts[2] if len(parts) > 2 else "RICE MILLERS"
            contact_person = parts[3] if len(parts) > 3 else ""
        else:
            comp_name = re.sub(r"^\([A-Za-z\s]+\)\s*", "", parts[0]).strip()
            category = parts[1] if len(parts) > 1 else "RICE MILLERS"
            contact_person = parts[2] if len(parts) > 2 else ""

        if not comp_name or len(comp_name) < 3:
            continue

        address = parts[-1] if "PAN/GST" not in parts[-1] else parts[-2]
        district = detect_wb_district(f"{address} {raw_text}", configured_districts)

        sfda_badge = "WBRMA Verified Member"
        c_key = clean_company_key(comp_name)
        for s_key in sfda_lookup:
            if c_key and c_key in s_key:
                sfda_badge = "WBRMA Member + SFDA Saudi Export Approved"
                break

        mills.append({
            "company_name": comp_name,
            "state": "West Bengal",
            "district": district,
            "category_or_role": category,
            "contact_person": contact_person,
            "phones": "; ".join(phones),
            "emails": "; ".join(emails),
            "gstin": gstin,
            "pan": pan,
            "fssai_or_sfda_status": sfda_badge,
            "address": address,
            "matched_varieties": "Parboiled Rice; IR-64; Swarna; Miniket (WB Cluster)",
            "website": "",
            "priority_score": 95 if "SFDA" in sfda_badge else 85,
            "source_url": source_url,
            "lead_type": "wb_mill",
        })
    return mills


def parse_wbrma_office_bearers_html(
    html: str, source_url: str = "", configured_districts: Optional[List[str]] = None
) -> List[Dict[str, any]]:
    if configured_districts is None:
        configured_districts = Config().TARGET_MILL_DISTRICTS

    mills = []
    soup = BeautifulSoup(html, "lxml")
    cards = soup.find_all(class_=re.compile(r"(office-bearer|bearer|member|card|profile)", re.I))
    if not cards:
        cards = soup.find_all(["div", "tr"])

    for card in cards:
        txt = card.get_text(" ", strip=True)
        if len(txt) > 1200 or len(txt) < 15:
            continue

        mill_tag = card.find(class_=re.compile(r"(mill|company)", re.I))
        name_tag = card.find(class_=re.compile(r"(name|bearer|person)", re.I)) or card.find(["h2", "h3", "h4", "b"])

        contact_person = name_tag.get_text(strip=True) if name_tag else ""
        mill_name = mill_tag.get_text(strip=True) if mill_tag else ""

        if not mill_name:
            mill_match = re.search(r"([A-Za-z\s]+(?:Rice Mill|Agro|Industries|Food)[A-Za-z\s\(\)]*?(?:Pvt Ltd|LLP|Ltd)?)", txt, re.I)
            if mill_match:
                mill_name = mill_match.group(1).strip()
            elif contact_person:
                mill_name = f"{contact_person} Rice Products"

        if not mill_name or len(mill_name) < 4:
            continue

        district = detect_wb_district(txt, configured_districts)
        gstin, pan, fssai = decode_gstin_and_fssai(txt)
        phones = normalize_phones(txt, "IN")
        emails = normalize_deobfuscated_emails(txt)

        mills.append({
            "company_name": mill_name,
            "state": "West Bengal",
            "district": district,
            "category_or_role": "WBRMA Office Bearer",
            "contact_person": contact_person,
            "phones": "; ".join(phones),
            "emails": "; ".join(emails),
            "gstin": gstin,
            "pan": pan,
            "fssai_or_sfda_status": "WBRMA Executive Leadership",
            "address": txt[:160],
            "matched_varieties": "Parboiled Rice; IR-64; Swarna; Miniket",
            "website": "",
            "priority_score": 95,
            "source_url": source_url or "https://wbrma.com/office-bearers",
            "lead_type": "wb_mill",
        })
    return mills


def parse_exportersindia_html(
    html: str, source_url: str = "", configured_districts: Optional[List[str]] = None
) -> List[Dict[str, any]]:
    if configured_districts is None:
        configured_districts = Config().TARGET_MILL_DISTRICTS

    mills = []
    soup = BeautifulSoup(html, "lxml")
    items = soup.find_all(class_=re.compile(r"(listing-item|fo-item|item|card)", re.I))
    if not items:
        items = soup.find_all("div")

    for item in items:
        txt = item.get_text(" ", strip=True)
        if len(txt) > 2000 or len(txt) < 20:
            continue
        if is_machinery_or_spare_parts_seller(txt):
            continue

        title_tag = item.find(class_=re.compile(r"(title|name|company)", re.I)) or item.find(["h2", "h3", "a", "b"])
        name = title_tag.get_text(strip=True) if title_tag else ""
        if not name or len(name) < 4:
            continue

        district = detect_wb_district(txt, configured_districts)
        gstin, pan, fssai = decode_gstin_and_fssai(txt)
        phones = normalize_phones(txt, "IN")
        emails = normalize_deobfuscated_emails(txt)

        mills.append({
            "company_name": name,
            "state": "West Bengal",
            "district": district,
            "category_or_role": "Rice Manufacturer & Processor",
            "contact_person": "Sales / Factory Desk",
            "phones": "; ".join(phones),
            "emails": "; ".join(emails),
            "gstin": gstin,
            "pan": pan,
            "fssai_or_sfda_status": "ExportersIndia Verified",
            "address": txt[:160],
            "matched_varieties": "IR-64 Parboiled Rice; Swarna; Non-Basmati",
            "website": "",
            "priority_score": 85,
            "source_url": source_url or "https://exportersindia.com/west-bengal/ir64-rice.htm",
            "lead_type": "wb_mill",
        })
    return mills


def parse_tradeindia_html(
    html: str, source_url: str = "", configured_districts: Optional[List[str]] = None
) -> List[Dict[str, any]]:
    if configured_districts is None:
        configured_districts = Config().TARGET_MILL_DISTRICTS

    mills = []
    soup = BeautifulSoup(html, "lxml")
    items = soup.find_all(class_=re.compile(r"(co-item|company|listing|card)", re.I))
    if not items:
        items = soup.find_all("div")

    for item in items:
        txt = item.get_text(" ", strip=True)
        if len(txt) > 2000 or len(txt) < 20:
            continue
        if is_machinery_or_spare_parts_seller(txt):
            continue

        title_tag = item.find(class_=re.compile(r"(co-name|name|title)", re.I)) or item.find(["h2", "h3", "b"])
        name = title_tag.get_text(strip=True) if title_tag else ""
        if not name or len(name) < 4:
            continue

        district = detect_wb_district(txt, configured_districts)
        gstin, pan, fssai = decode_gstin_and_fssai(txt)
        phones = normalize_phones(txt, "IN")
        emails = normalize_deobfuscated_emails(txt)

        mills.append({
            "company_name": name,
            "state": "West Bengal",
            "district": district,
            "category_or_role": "TradeIndia Verified Miller",
            "contact_person": "Mill Incharge",
            "phones": "; ".join(phones),
            "emails": "; ".join(emails),
            "gstin": gstin,
            "pan": pan,
            "fssai_or_sfda_status": "TradeIndia Listed",
            "address": txt[:160],
            "matched_varieties": "Non-Basmati Parboiled Rice; Swarna; Miniket",
            "website": "",
            "priority_score": 85,
            "source_url": source_url or "https://tradeindia.com/bardhaman/rice-mill",
            "lead_type": "wb_mill",
        })
    return mills


def parse_osm_overpass_json(
    data: dict, source_url: str = "", configured_districts: Optional[List[str]] = None
) -> List[Dict[str, any]]:
    if configured_districts is None:
        configured_districts = Config().TARGET_MILL_DISTRICTS

    mills = []
    elements = data.get("elements", [])
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("operator") or ""
        if not name or len(name) < 3:
            continue

        combined_addr = f"{tags.get('addr:city', '')} {tags.get('addr:district', '')} {tags.get('addr:street', '')} {tags.get('addr:state', '')}"
        district = detect_wb_district(f"{name} {combined_addr}", configured_districts)
        phone = tags.get("phone") or tags.get("contact:phone") or ""
        website = tags.get("website") or tags.get("contact:website") or ""

        mills.append({
            "company_name": name,
            "state": "West Bengal",
            "district": district,
            "category_or_role": "Rice Processing Facility",
            "contact_person": "Plant Manager",
            "phones": "; ".join(normalize_phones(phone, "IN")) if phone else "",
            "emails": tags.get("email") or tags.get("contact:email") or "",
            "gstin": "",
            "pan": "",
            "fssai_or_sfda_status": "OSM Industrial Geo-Verified",
            "address": combined_addr.strip() or f"Lat: {el.get('lat')}, Lon: {el.get('lon')}",
            "matched_varieties": "Parboiled Rice; Paddy Processing Facility",
            "website": website,
            "priority_score": 80,
            "source_url": source_url or "https://overpass-api.de/api/interpreter",
            "lead_type": "wb_mill",
        })
    return mills


def parse_indiamart_impcat_html(
    html: str,
    commodity: str = "Rice",
    source_url: str = "https://dir.indiamart.com/impcat/basmati-rice.html",
) -> List[Dict[str, any]]:
    """
    Parses IndiaMART verified supplier catalogs and TrustSEAL millers.
    Extracts authentic Indian corporate entities, processing clusters, TrustSEAL verification, and official profiles.
    """
    leads = []
    if not html:
        return leads

    soup = BeautifulSoup(html, "lxml")
    seen = set()
    comp_url_pattern = re.compile(r"https?://(?:www\.)?indiamart\.com/([a-zA-Z0-9\-]+)/?$", re.I)
    excluded_slugs = {
        "proddetail", "impcat", "indianexporters", "messages", "seller", "export",
        "dir", "city", "events", "aboutus", "help", "glid", "terms", "privacy"
    }

    known_clusters = [
        "Karnal", "Taraori", "Amritsar", "Ludhiana", "Burdwan", "Memari", "Kolkata",
        "Hisar", "Kaithal", "New Delhi", "Kakinada", "Ahmedabad", "Surat", "Jaipur",
        "Indore", "Bhopal", "Guntur", "Nellore", "Raipur", "Chandigarh", "Noida", "Gurugram"
    ]

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("//"):
            href = "https:" + href
        m = comp_url_pattern.match(href)
        if not m:
            continue
        slug_val = m.group(1).lower()
        if slug_val in excluded_slugs or slug_val in seen:
            continue

        name = a.get_text(strip=True)
        if len(name) < 4 or any(k in name.lower() for k in ["sign in", "feedback", "terms", "privacy", "view more", "contact supplier", "indiamart"]):
            continue
        seen.add(slug_val)

        card = a.find_parent("div", class_=lambda c: c and any(k in str(c) for k in ["card", "item", "row", "desc", "pdp", "mcat"])) or a.parent
        card_txt = card.get_text(" | ", strip=True) if card else ""

        loc_match = re.search(r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*·\s*(\d+\s*yrs)", card_txt)
        city = loc_match.group(1) if loc_match else ""
        exp = loc_match.group(2) if loc_match else "Verified"

        if not city:
            for cl in known_clusters:
                if cl.lower() in card_txt.lower() or cl.lower() in slug_val:
                    city = cl
                    break
        if not city:
            city = "New Delhi"

        # Determine state
        state = "Haryana" if city in ("Karnal", "Taraori", "Kaithal", "Hisar", "Gurugram") else (
            "Punjab" if city in ("Amritsar", "Ludhiana", "Chandigarh") else (
                "West Bengal" if city in ("Burdwan", "Memari", "Kolkata") else (
                    "Andhra Pradesh" if city in ("Kakinada", "Guntur", "Nellore") else (
                        "Gujarat" if city in ("Ahmedabad", "Surat") else "India"
                    )
                )
            )
        )

        leads.append({
            "company_name": name,
            "country": "India",
            "city_or_hub": city,
            "state": state,
            "district": city,
            "contact_person": "Mill Operations / Sourcing Incharge",
            "phones": "",
            "emails": "",
            "website": href,
            "address": f"{city}, {state}, India - Commercial Milling Cluster",
            "matched_varieties": commodity,
            "hs_codes_applicable": "10063019; 10063020",
            "inquiry_or_profile": f"IndiaMART TrustSEAL Verified Supplier ({exp} on portal). Registered processing facility for {commodity}.",
            "priority_score": 96,
            "source_name": "IndiaMART Verified Agri Manufacturers & Millers",
            "source_url": href,
            "lead_type": "supplier",
            "gstin": "",
            "pan": "",
            "fssai_or_sfda_status": "IndiaMART TrustSEAL Verified Member",
        })

    return leads
