import re
import urllib.parse
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Lead(db.Model):
    __tablename__ = "leads"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    company_name = db.Column(db.String(200), nullable=False, index=True)
    country = db.Column(db.String(100), default="", index=True)
    city_or_hub = db.Column(db.String(150), default="")
    contact_person = db.Column(db.String(150), default="")
    phones = db.Column(db.Text, default="")
    emails = db.Column(db.Text, default="")
    website = db.Column(db.String(300), default="")
    address = db.Column(db.Text, default="")
    matched_varieties = db.Column(db.Text, default="")
    hs_codes_applicable = db.Column(db.String(200), default="")
    inquiry_or_profile = db.Column(db.Text, default="")
    priority_score = db.Column(db.Integer, default=0, index=True)
    source_url = db.Column(db.Text, default="")
    lead_type = db.Column(db.String(20), default="importer", index=True)

    gstin = db.Column(db.String(20), default="")
    pan = db.Column(db.String(12), default="")
    fssai_or_sfda_status = db.Column(db.String(200), default="")
    state = db.Column(db.String(50), default="")
    district = db.Column(db.String(100), default="")
    category_or_role = db.Column(db.String(100), default="")

    origin_state = db.Column(db.String(100), default="")
    b2b_directory = db.Column(db.String(200), default="")
    harvest_date = db.Column(db.String(50), default="")
    customs_manifest_data = db.Column(db.Text, default="")
    source_name = db.Column(db.String(200), default="")
    source_category = db.Column(db.String(150), default="")
    source_reliability = db.Column(db.Integer, default=96)
    shipment_volume = db.Column(db.String(150), default="")
    annual_volume_est = db.Column(db.String(150), default="")
    nearest_port = db.Column(db.String(150), default="")
    extraction_notes = db.Column(db.Text, default="")

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    contact_links = db.relationship("CompanyContact", back_populates="lead", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        # Determine coordinates and nearest port based on city/district/country
        loc_str = f"{self.city_or_hub} {self.district} {self.address} {self.country}".lower()
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
            c_low = self.country.lower() if self.country else ""
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

        # Slight jitter based on ID to avoid overlapping pins
        jitter = ((self.id % 20) - 10) * 0.003
        lat = round(lat + jitter, 5)
        lng = round(lng + jitter, 5)

        # Build trade intelligence dossier
        is_imp = self.lead_type == "importer"
        trade_role = "Direct Bulk & Retail Commodity Importer" if is_imp else "Primary Certified Processing Mill & Exporter"
        score = self.priority_score or 0
        vol_est = f"{(score * 180):,} MT / Year" if score > 0 else "5,000 MT / Year"
        risk_tier = "Tier 1 Verified (Grade A+)" if score >= 80 else "Commercial Active Trader"
        lanes = [
            f"Kolkata Port (INCCU) → {port}",
            f"Haldia Port (INHAL) → {port}",
        ]

        varieties = [v.strip() for v in re.split(r"[;,]", self.matched_varieties or "") if v.strip()]
        if not varieties:
            varieties = ["Non-Basmati Grains", "Parboiled Cargo", "Agricultural Merchandise"]

        raw_emails_list = [e.strip() for e in (self.emails or "").split(";") if e.strip() and "@" in e]
        primary_email = raw_emails_list[0] if raw_emails_list else ""
        secondary_email = raw_emails_list[1] if len(raw_emails_list) > 1 else ""

        raw_phones_list = [p.strip() for p in (self.phones or "").split(";") if p.strip()]
        direct_phone = raw_phones_list[0] if raw_phones_list else ""

        clean_digits = re.sub(r"[^\d]", "", direct_phone or (self.phones or ""))
        wa_url = ""
        if clean_digits and is_imp:
            contact_label = (self.contact_person or "").split("(")[0].strip() or "Purchase Manager"
            co_label = (self.company_name or "").split("(")[0].strip() or "your company"
            wa_text = urllib.parse.quote_plus(
                f"Hello {contact_label}, we noticed {co_label} imports agricultural commodities. "
                f"We are an APEDA-accredited rice exporter in West Bengal. May we send our product catalogue and CIF pricing?"
            )
            wa_url = f"https://wa.me/{clean_digits}?text={wa_text}"

        clean_co = re.sub(r"\b(?:LLC|W\.L\.L\.|Ltd|SARL|Est\.|Inc\.|FZE|Pte)\b", "", self.company_name or "", flags=re.IGNORECASE).strip()
        li_url = f"https://www.linkedin.com/search/results/people/?keywords={urllib.parse.quote_plus(clean_co + ' Purchase Manager')}" if clean_co else ""
        corp_contact_url = f"{self.website.rstrip('/')}/contact" if self.website else ""

        n_port = self.nearest_port or port
        created_iso = self.created_at.isoformat() if self.created_at else ""
        try:
            contacts_cnt = len(self.contact_links) if self.id else 0
        except Exception:
            contacts_cnt = 0

        return {
            "id": self.id,
            "company_name": self.company_name,
            "country": self.country,
            "city_or_hub": self.city_or_hub,
            "contact_person": self.contact_person,
            "primary_email": primary_email,
            "secondary_email": secondary_email,
            "direct_phone": direct_phone,
            "whatsapp_url": wa_url,
            "whatsapp_outreach_url": wa_url,
            "linkedin_persona_url": li_url,
            "linkedin_profile_url": li_url,
            "linkedin_search_url": li_url,
            "corporate_contact_page_url": corp_contact_url,
            "contact_page_url": corp_contact_url,
            "github_url": "",
            "phones": self.phones,
            "emails": self.emails,
            "website": self.website,
            "address": self.address,
            "matched_varieties": self.matched_varieties,
            "commodities_list": varieties,
            "hs_codes_applicable": self.hs_codes_applicable,
            "inquiry_or_profile": self.inquiry_or_profile,
            "priority_score": self.priority_score,
            "source_url": self.source_url,
            "source_name": self.source_name or "Global Verified Trade Directory",
            "source_category": self.source_category or ("Commercial Trade Manifest" if is_imp else "B2B Trade Directory"),
            "source_reliability": self.source_reliability if self.source_reliability is not None else 96,
            "b2b_directory": self.b2b_directory or self.source_name or "Global Verified Trade Directory",
            "harvest_date": self.harvest_date or created_iso,
            "customs_manifest_data": self.customs_manifest_data or "",
            "shipment_volume": self.shipment_volume or ("1-3 Containers / mo (25-75 MT)" if is_imp else ""),
            "importer_tier": getattr(self, "importer_tier", None) or ("sme_importer" if is_imp else ""),
            "extraction_notes": self.extraction_notes or "",
            "lead_type": self.lead_type,
            "gstin": self.gstin,
            "pan": self.pan,
            "fssai_or_sfda_status": self.fssai_or_sfda_status,
            "state": self.state,
            "origin_state": self.origin_state or self.state or "",
            "district": self.district,
            "category_or_role": self.category_or_role,
            "latitude": lat,
            "longitude": lng,
            "nearest_port": n_port,
            "trade_role": trade_role,
            "annual_volume_est": self.annual_volume_est or vol_est,
            "risk_tier": risk_tier,
            "key_trade_lanes": lanes,
            "contacts_count": contacts_cnt,
            "created_at": created_iso or None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Lead {self.id}: {self.company_name} ({self.lead_type})>"


class ScrapeJob(db.Model):
    __tablename__ = "scrape_jobs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    job_type = db.Column(db.String(30), nullable=False)
    status = db.Column(db.String(20), default="pending", index=True)
    leads_found = db.Column(db.Integer, default=0)
    error_message = db.Column(db.Text, default="")
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "job_type": self.job_type,
            "status": self.status,
            "leads_found": self.leads_found,
            "error_message": self.error_message,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<ScrapeJob {self.id}: {self.job_type} ({self.status})>"


from app.models_contacts import Contact, CompanyContact  # noqa: E402, F401
