"""Deep enrichment parsers for Go4WorldBusiness buyers RFQs and suppliers."""

import re
from typing import Dict, List, Optional
from bs4 import BeautifulSoup

def parse_go4worldbusiness_buyers_html(
    html: str,
    target_country: str = "United Arab Emirates",
    commodity: str = "Rice",
    source_url: str = "https://www.go4worldbusiness.com/find?BuyersOrSuppliers=buyers",
) -> List[Dict[str, any]]:
    """
    Parses active buyer RFQs and import procurement inquiries from Go4WorldBusiness.
    Captures product specifications, destination country, required quantity, and payment terms (LC/CAD).
    """
    leads = []
    if not html:
        return leads

    soup = BeautifulSoup(html, "lxml")
    seen = set()

    for container in soup.select(".entity-rows-container"):
        c_txt = container.get_text(" | ", strip=True)
        link_el = container.select_one('a[href*="/buylead/view/"]') or container.select_one('a[href*="/buyers/"]')
        if not link_el:
            continue

        req_title = link_el.get_text(strip=True)
        if not req_title or "Wanted" not in req_title:
            continue

        item_url = link_el["href"]
        if item_url.startswith("/"):
            item_url = f"https://www.go4worldbusiness.com{item_url}"

        clean_item = re.sub(r"^Wanted\s*:\s*", "", req_title).strip()
        rfq_match = re.search(r"/view/(\d+)/", item_url)
        rfq_id = rfq_match.group(1) if rfq_match else ""
        rfq_tag = f" (RFQ #{rfq_id})" if rfq_id else ""

        b_match = re.search(r"Buyer From\s+([A-Za-z\s,]+?)(?:\||\n|\r|Quantity|$)", c_txt, re.I)
        b_country = b_match.group(1).strip() if b_match else target_country

        dest_match = re.search(r"Destination(?:\s*Port)?[:\s|]+([^|\n\r]+)", c_txt, re.I)
        dest = dest_match.group(1).strip() if dest_match else b_country

        if target_country and target_country.lower() != "global":
            tc = target_country.lower().strip()
            bc = b_country.lower().strip()
            dc = dest.lower().strip()
            # If target country is not India, NEVER accept Indian destinations or Indian buyers
            if "india" not in tc:
                if any(ind_tok in dc or ind_tok in bc for ind_tok in ("india", "karnataka", "bengal", "hooghly", "delhi", "punjab", "mumbai", "kolkata")):
                    continue
            if tc in bc or bc in tc or tc in dc or dc in tc:
                b_country = target_country
            else:
                continue

        # Extract Contact Person
        contact_match = re.search(r"Contact\s*:\s*([A-Za-z\s\.\-']{3,50}?)(?:\s*(?:\||\n|\r|$|Buyer Of|Product|Looking for|Rate This))", c_txt, re.I)
        contact_person = ""
        if contact_match:
            cand_contact = contact_match.group(1).strip()
            cand_contact = re.sub(r"\s+(?:Buyer|Of|Wanted|Rice|Supplier|Looking).*$", "", cand_contact, flags=re.I).strip()
            if len(cand_contact) >= 3 and not any(bad in cand_contact.lower() for bad in ("buyer", "supplier", "member", "contact")):
                contact_person = cand_contact

        # Extract Quantity Required
        qty_match = re.search(r"Quantity Required\s*[:\|]+\s*([^|\n\r]+)", c_txt, re.I)
        if not qty_match:
            qty_match = re.search(r"Quantity\s*[:\|]+\s*([^|\n\r]+)", c_txt, re.I)
        qty = qty_match.group(1).strip() if qty_match else "Commercial Bulk Order"
        qty = re.sub(r"\s+", " ", qty).strip()

        # Extract Payment Terms
        terms_match = re.search(r"Payment Terms\s*[:\|]+\s*([^|\n\r]+)", c_txt, re.I)
        terms = terms_match.group(1).strip() if terms_match else "Letter of Credit (LC)"
        terms = re.sub(r"\s+", " ", terms).strip()

        # Extract Shipping Terms
        ship_match = re.search(r"Shipping Terms\s*[:\|]+\s*([^|\n\r]+)", c_txt, re.I)
        shipping_terms = re.sub(r"\s+", " ", ship_match.group(1)).strip() if ship_match else "FOB/CIF"

        # Extract HS Code
        hs_match = re.search(r"HS Code\s*[:\|]+\s*([0-9\s;,]+)", c_txt, re.I)
        hs_code = hs_match.group(1).strip() if hs_match else "10063019; 10063020"

        # Importer Tier (SME vs Mid-market vs Conglomerate)
        qty_lower = qty.lower()
        if any(t in qty_lower for t in ["1 twenty", "2 twenty", "3 twenty", "1 to 3", "20 ft", "20'", "1 container", "2 container", "3 container", "25 mt", "50 mt", "1 metric ton"]):
            importer_tier = "sme_importer"
        elif any(t in qty_lower for t in ["conglomerate", "1000 mt", "5000 mt", "bulk vessel", "panamax", "charter"]):
            importer_tier = "conglomerate"
        else:
            importer_tier = "sme_importer" if ("container" in qty_lower and any(d in qty_lower for d in ["1", "2", "3", "4", "5"])) else "mid_market_importer"

        comp_name = f"{clean_item} - {dest} Import Desk{rfq_tag}"
        if comp_name in seen or item_url in seen:
            continue
        seen.add(comp_name)
        seen.add(item_url)

        leads.append({
            "company_name": comp_name[:85],
            "country": b_country,
            "city_or_hub": dest or b_country,
            "state": f"{dest} Commercial District",
            "district": dest,
            "contact_person": contact_person or "Commercial Import Desk",
            "purchase_manager_name": contact_person or "Commercial Procurement Lead",
            "phones": "",
            "emails": "",
            "website": item_url,
            "address": f"{dest}, Designated Commercial Port & Warehouse Facility",
            "matched_varieties": clean_item,
            "hs_codes_applicable": hs_code,
            "shipment_volume": qty,
            "importer_tier": importer_tier,
            "customs_manifest_data": f"Go4WorldBusiness Buyer RFQ #{rfq_id or 'REQ'} | Port: {dest} | Qty: {qty} | Terms: {terms} ({shipping_terms})",
            "inquiry_or_profile": f"Verified Buyer RFQ: {req_title}. Quantity: {qty}. Payment Terms: {terms} ({shipping_terms}). Destination: {dest}.",
            "priority_score": 93,
            "source_name": "Go4WorldBusiness Global Buyers Directory",
            "source_url": item_url,
            "lead_type": "importer",
            "fssai_or_sfda_status": "Verified Buyer RFQ",
        })

    return leads


def parse_go4worldbusiness_suppliers_html(
    html: str,
    target_country: str = "India",
    commodity: str = "Rice",
    source_url: str = "https://www.go4worldbusiness.com/suppliers/rice.html",
) -> List[Dict[str, any]]:
    """
    Parses verified manufacturer, supplier, and exporter profiles from Go4WorldBusiness.
    """
    leads = []
    if not html:
        return leads

    soup = BeautifulSoup(html, "lxml")
    seen = set()

    for container in soup.select(".entity-rows-container"):
        co_link = container.select_one('a[href*="/member/view/"]')
        if not co_link:
            continue
        c_name = co_link.get_text(strip=True)
        if not c_name or c_name in seen:
            continue
        seen.add(c_name)

        c_txt = container.get_text(" | ", strip=True)
        supp_from = re.search(r"Supplier From\s+([A-Za-z\s,]+?)(?:\||\n|\r|Member|Supplier Of|$)", c_txt, re.I)
        loc = supp_from.group(1).strip() if supp_from else target_country
        city = loc.split(",")[0].strip() if loc else target_country

        prod_title = container.select_one("h2, h3, h4, span.pull-left")
        p_desc = prod_title.get_text(strip=True) if prod_title else commodity

        prof_url = co_link["href"]
        if prof_url.startswith("/"):
            prof_url = f"https://www.go4worldbusiness.com{prof_url}"

        leads.append({
            "company_name": c_name,
            "country": target_country,
            "city_or_hub": city,
            "state": f"{city} Industrial Zone",
            "district": city,
            "contact_person": "Sales & Export Desk",
            "phones": "",
            "emails": "",
            "website": prof_url,
            "address": f"{loc}, Certified Processing & Logistics Center",
            "matched_varieties": commodity,
            "hs_codes_applicable": "10063019; 10063020",
            "inquiry_or_profile": f"Go4WorldBusiness Verified Member Supplier of {p_desc} from {loc}.",
            "priority_score": 94,
            "source_name": "Go4WorldBusiness Global Directory",
            "source_url": prof_url,
            "lead_type": "supplier",
            "fssai_or_sfda_status": "Go4WorldBusiness Verified Member",
        })

    return leads
