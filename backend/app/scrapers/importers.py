import re
from typing import Dict, List, Optional
from bs4 import BeautifulSoup
from app.lead_engine import (
    classify_non_basmati_relevance,
    normalize_deobfuscated_emails,
    normalize_phones,
)


def parse_apeda_saudi_text(text: str, source_url: str = "") -> List[Dict[str, any]]:
    leads = []
    blocks = re.split(r"\n(?=\d{1,2}\.\s+[A-Z])", text)
    for block in blocks:
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        if len(lines) < 2:
            continue
        first_line = re.sub(r"^\d{1,2}\.\s*", "", lines[0])
        if "Name of Importer" in first_line or len(first_line) < 3:
            continue

        raw = " | ".join(lines)
        emails = normalize_deobfuscated_emails(raw)
        phones = normalize_phones(raw, "SA")
        web_match = re.search(r"(?:www\.[a-zA-Z0-9.\-]+\.[a-z]{2,6})", raw, re.I)
        website = web_match.group(0) if web_match else (emails[0].split("@")[1] if emails else "")

        city = "Riyadh" if "riyadh" in raw.lower() else (
            "Jeddah" if "jeddah" in raw.lower() else (
                "Dammam" if "dammam" in raw.lower() else "Saudi Arabia"
            )
        )
        leads.append({
            "company_name": first_line[:90],
            "country": "Saudi Arabia",
            "city_or_hub": city,
            "contact_person": "Procurement / Import Desk",
            "phones": "; ".join(phones),
            "emails": "; ".join(emails),
            "website": website,
            "address": raw[:180],
            "matched_varieties": "rice; parboiled; non-basmati",
            "hs_codes_applicable": "10063019; 10063099",
            "inquiry_or_profile": "APEDA Listed Saudi Importer of Rice",
            "priority_score": 85,
            "source_url": source_url,
            "lead_type": "importer",
        })
    return leads


def parse_exportmandi_html(html: str, source_url: str = "") -> List[Dict[str, any]]:
    leads = []
    soup = BeautifulSoup(html, "lxml")
    for exp in soup.find_all("div", class_="exporter"):
        content = exp.find("div", class_="exporter-content")
        if not content:
            continue
        b_tag = content.find("b")
        name = b_tag.get_text(strip=True) if b_tag else ""
        if not name or len(name) < 3:
            continue
        txt = content.get_text(" ", strip=True)
        emails = normalize_deobfuscated_emails(txt)
        phones = normalize_phones(txt, "AE")
        link = content.find("a", href=True)
        website = link["href"] if (link and "facebook" not in link["href"]) else ""
        leads.append({
            "company_name": name,
            "country": "United Arab Emirates",
            "city_or_hub": "Dubai / Al Ras / Deira",
            "contact_person": "Wholesale Grain Desk",
            "phones": "; ".join(phones),
            "emails": "; ".join(emails),
            "website": website,
            "address": txt[:160],
            "matched_varieties": "rice; parboiled; non-basmati; foodstuff",
            "hs_codes_applicable": "10063019; 10063099",
            "inquiry_or_profile": "Verified UAE Rice Importer",
            "priority_score": 90,
            "source_url": source_url or "https://exportmandi.com/rice-importers-in-dubai-uae/",
            "lead_type": "importer",
        })
    return leads


def parse_cannedfood_html(html: str, source_url: str = "") -> List[Dict[str, any]]:
    leads = []
    soup = BeautifulSoup(html, "lxml")
    for li in soup.find_all(["li", "div", "p"]):
        txt = li.get_text(" ", strip=True)
        if "United Arab Emirates" not in txt and "Dubai" not in txt:
            continue
        accepted, tags, score = classify_non_basmati_relevance(txt)
        if not accepted:
            continue
        a_tag = li.find("a", href=re.compile(r"^https?://(?!.*facebook)"))
        website = a_tag["href"] if a_tag else ""
        comp_name = txt.split(".")[0][:75].strip()
        if len(comp_name) > 4:
            leads.append({
                "company_name": comp_name,
                "country": "United Arab Emirates",
                "city_or_hub": "Dubai / Sharjah / Abu Dhabi",
                "contact_person": "Import Division",
                "phones": "; ".join(normalize_phones(txt, "AE")),
                "emails": "; ".join(normalize_deobfuscated_emails(txt)),
                "website": website,
                "address": txt[:160],
                "matched_varieties": tags,
                "hs_codes_applicable": "10063019; 10063099",
                "inquiry_or_profile": txt[:200],
                "priority_score": score,
                "source_url": source_url,
                "lead_type": "importer",
            })
    return leads


def parse_go4wb_html(
    html: str, source_url: str = "", target_countries: Optional[List[str]] = None
) -> List[Dict[str, any]]:
    if target_countries is None:
        target_countries = ["United Arab Emirates", "Saudi Arabia", "Qatar", "Oman", "Kuwait", "Bahrain"]

    target_low = [c.lower() for c in target_countries]
    leads = []
    soup = BeautifulSoup(html, "lxml")
    cards = soup.find_all(["div", "article"], class_=re.compile(r"(entity|item|card|lead|result)", re.I))
    if not cards:
        cards = soup.find_all("div")

    for card in cards:
        txt = card.get_text(" ", strip=True)
        if "Wanted :" not in txt and "Buyer From" not in txt:
            continue
        if len(txt) > 1500:
            continue

        accepted, tags, score = classify_non_basmati_relevance(txt)
        if not accepted:
            continue

        matched_country = "Global"
        for tc in target_low:
            if tc in txt.lower() or (tc == "united arab emirates" and "uae" in txt.lower()):
                matched_country = tc.title()
                score = min(score + 15, 100)
                break

        if "all" not in target_low and matched_country == "Global":
            continue

        contact_match = re.search(r"Contact\s*:\s*([A-Za-z\.\s/\-]{3,40}?)(?:Buyer Of|$|\.)", txt)
        contact_person = contact_match.group(1).strip() if contact_match else "Verified Buyer"

        port_match = re.search(r"Destination(?:\s*Port)?\s*:\s*([A-Za-z\s,]{3,45}?)(?:Looking|Product|Contact|HS|$)", txt)
        city_hub = port_match.group(1).strip() if port_match else matched_country

        leads.append({
            "company_name": f"{contact_person} ({matched_country} Rice Buyer)",
            "country": matched_country,
            "city_or_hub": city_hub,
            "contact_person": contact_person,
            "phones": "; ".join(normalize_phones(txt, matched_country)),
            "emails": "; ".join(normalize_deobfuscated_emails(txt)),
            "website": "",
            "address": city_hub,
            "matched_varieties": tags,
            "hs_codes_applicable": "10063019 (Legacy 10063010)",
            "inquiry_or_profile": txt[:240],
            "priority_score": score,
            "source_url": source_url,
            "lead_type": "importer",
        })
    return leads


def parse_atninfo_html(html: str, source_url: str = "") -> List[Dict[str, any]]:
    leads = []
    soup = BeautifulSoup(html, "lxml")
    cards = soup.find_all(class_=re.compile(r"(company|listing|business)", re.I))
    if not cards:
        cards = soup.find_all("div")

    for card in cards:
        txt = card.get_text(" ", strip=True)
        if len(txt) > 2000:
            continue
        title_tag = card.find(["h1", "h2", "h3", "h4", "a", "b"], class_=re.compile(r"(title|name|header)", re.I))
        if not title_tag:
            title_tag = card.find(["h2", "h3", "a", "b"])
        name = title_tag.get_text(strip=True) if title_tag else ""
        if not name or len(name) < 4:
            continue

        accepted, tags, score = classify_non_basmati_relevance(txt)
        if not accepted and "rice" not in txt.lower() and "food" not in txt.lower():
            continue

        emails = normalize_deobfuscated_emails(txt)
        phones = normalize_phones(txt, "AE")
        web_link = card.find("a", href=re.compile(r"^https?://(?!.*(facebook|twitter|instagram|linkedin|atninfo))"))
        website = web_link["href"] if web_link else ""

        leads.append({
            "company_name": name,
            "country": "United Arab Emirates",
            "city_or_hub": "Dubai / Sharjah / UAE",
            "contact_person": "Import / Trade Desk",
            "phones": "; ".join(phones),
            "emails": "; ".join(emails),
            "website": website,
            "address": txt[:160],
            "matched_varieties": tags or "rice; parboiled; non-basmati",
            "hs_codes_applicable": "10063019; 10063099",
            "inquiry_or_profile": txt[:200],
            "priority_score": max(score, 80),
            "source_url": source_url or "https://atninfo.com/uae/all/rice-1263",
            "lead_type": "importer",
        })
    return leads


def parse_hidubai_html(html: str, source_url: str = "") -> List[Dict[str, any]]:
    leads = []
    soup = BeautifulSoup(html, "lxml")
    cards = soup.find_all(class_=re.compile(r"(business-card|card|item|listing)", re.I))
    if not cards:
        cards = soup.find_all("div")

    for card in cards:
        txt = card.get_text(" ", strip=True)
        if len(txt) > 2000:
            continue
        title_tag = card.find(class_=re.compile(r"(title|name)", re.I)) or card.find(["h2", "h3", "b"])
        name = title_tag.get_text(strip=True) if title_tag else ""
        if not name or len(name) < 4:
            continue

        accepted, tags, score = classify_non_basmati_relevance(txt)
        if not accepted and "rice" not in txt.lower() and "food" not in txt.lower():
            continue

        emails = normalize_deobfuscated_emails(txt)
        phones = normalize_phones(txt, "AE")
        web_link = card.find("a", href=re.compile(r"^https?://(?!.*(facebook|twitter|instagram|linkedin|hidubai))"))
        website = web_link["href"] if web_link else ""

        leads.append({
            "company_name": name,
            "country": "United Arab Emirates",
            "city_or_hub": "Dubai",
            "contact_person": "General Manager / Procurement",
            "phones": "; ".join(phones),
            "emails": "; ".join(emails),
            "website": website,
            "address": txt[:160],
            "matched_varieties": tags or "parboiled; non-basmati; foodstuff",
            "hs_codes_applicable": "10063019; 10063099",
            "inquiry_or_profile": txt[:200],
            "priority_score": max(score, 80),
            "source_url": source_url or "https://hidubai.com/lists/knam-marketing/rice-importers",
            "lead_type": "importer",
        })
    return leads


def parse_spices_board_bsm_text(text: str, source_url: str = "") -> List[Dict[str, any]]:
    leads = []
    blocks = re.split(r"\n(?=\d{1,2}\.\s+[A-Z])", text)
    for block in blocks:
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        if len(lines) < 2:
            continue
        raw = " | ".join(lines)
        name = re.sub(r"^\d{1,2}\.\s*", "", lines[0]).strip()
        if len(name) < 3 or "ENQUIRY LIST" in name:
            continue

        raw_low = raw.lower()
        country = "United Arab Emirates"
        if "oman" in raw_low or "muscat" in raw_low:
            country = "Oman"
        elif "saudi" in raw_low or "riyadh" in raw_low or "jeddah" in raw_low:
            country = "Saudi Arabia"
        elif "qatar" in raw_low or "doha" in raw_low:
            country = "Qatar"
        elif "kuwait" in raw_low:
            country = "Kuwait"
        elif "bahrain" in raw_low or "manama" in raw_low:
            country = "Bahrain"

        contact_match = re.search(r"Contact\s*:\s*([^|]+)", raw, re.I)
        contact_person = contact_match.group(1).strip() if contact_match else "Procurement Manager"

        emails = normalize_deobfuscated_emails(raw)
        phones = normalize_phones(raw, country)
        accepted, tags, score = classify_non_basmati_relevance(raw)

        leads.append({
            "company_name": name,
            "country": country,
            "city_or_hub": country,
            "contact_person": contact_person,
            "phones": "; ".join(phones),
            "emails": "; ".join(emails),
            "website": (emails[0].split("@")[1] if emails else ""),
            "address": raw[:160],
            "matched_varieties": tags or "parboiled; non-basmati; rice",
            "hs_codes_applicable": "10063019; 10063099",
            "inquiry_or_profile": raw[:220],
            "priority_score": max(score, 85),
            "source_url": source_url,
            "lead_type": "importer",
        })
    return leads
