"""Many-to-Many Contact and CompanyContact SQLAlchemy models + SQLite migration helper."""

from datetime import datetime, timezone
from sqlalchemy import text
from app.models import db

ADDITIVE_LEAD_COLUMNS = {
    "origin_state": "VARCHAR(100) DEFAULT ''",
    "b2b_directory": "VARCHAR(200) DEFAULT ''",
    "harvest_date": "VARCHAR(50) DEFAULT ''",
    "customs_manifest_data": "TEXT DEFAULT ''",
    "source_name": "VARCHAR(200) DEFAULT ''",
    "source_category": "VARCHAR(150) DEFAULT ''",
    "source_reliability": "INTEGER DEFAULT 96",
    "shipment_volume": "VARCHAR(150) DEFAULT ''",
    "annual_volume_est": "VARCHAR(150) DEFAULT ''",
    "nearest_port": "VARCHAR(150) DEFAULT ''",
    "extraction_notes": "TEXT DEFAULT ''",
}


class Contact(db.Model):
    __tablename__ = "contacts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    contact_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(200), nullable=False, default="")
    job_title = db.Column(db.String(150), default="")
    email = db.Column(db.String(200), default="", index=True)
    phone = db.Column(db.String(80), default="")
    whatsapp_url = db.Column(db.Text, default="")
    linkedin_profile_url = db.Column(db.String(350), default="", index=True)
    source = db.Column(db.String(100), default="manual")
    verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    company_links = db.relationship("CompanyContact", back_populates="contact", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.contact_id,
            "contact_id": self.contact_id,
            "full_name": self.full_name,
            "job_title": self.job_title,
            "email": self.email,
            "phone": self.phone,
            "whatsapp_url": self.whatsapp_url,
            "linkedin_profile_url": self.linkedin_profile_url,
            "source": self.source,
            "verified": bool(self.verified),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Contact {self.contact_id}: {self.full_name}>"


class CompanyContact(db.Model):
    __tablename__ = "company_contacts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    lead_id = db.Column(db.Integer, db.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_id = db.Column(db.Integer, db.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    role_at_company = db.Column(db.String(150), default="")
    is_primary = db.Column(db.Boolean, default=False)
    source = db.Column(db.String(100), default="manual")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (db.UniqueConstraint("lead_id", "contact_id", name="uq_company_contact"),)

    contact = db.relationship("Contact", back_populates="company_links")
    lead = db.relationship("Lead", back_populates="contact_links")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "lead_id": self.lead_id,
            "contact_id": self.contact_id,
            "role_at_company": self.role_at_company,
            "is_primary": bool(self.is_primary),
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def ensure_sqlite_lead_columns(db_instance) -> None:
    """Idempotently add additive F4 columns to an existing SQLite leads table."""
    try:
        engine = db_instance.engine
        if engine.dialect.name != "sqlite":
            return
        rows = db_instance.session.execute(text("PRAGMA table_info(leads)")).fetchall()
        if not rows:
            return
        existing = {row[1] for row in rows}
        added = False
        for col_name, col_def in ADDITIVE_LEAD_COLUMNS.items():
            if col_name not in existing:
                db_instance.session.execute(text(f"ALTER TABLE leads ADD COLUMN {col_name} {col_def}"))
                added = True
        if added:
            db_instance.session.commit()
    except Exception:
        db_instance.session.rollback()
