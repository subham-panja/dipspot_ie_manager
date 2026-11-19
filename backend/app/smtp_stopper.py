"""
Gmail SMTP Quota Tracker & Automated Emergency Hard-Break Stopper.

Enforces personal Gmail and Google Workspace daily sending quotas:
- Personal Gmail (@gmail.com): 500 emails/rolling 24 hours (safe threshold: 100-450)
- Google Workspace (@domain.com): 2,000 emails/day
- Hard-breaks campaigns immediately when quota is exceeded or SMTP 550/421 error occurs.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Tuple
from app.db import get_db, now_iso

logger = logging.getLogger(__name__)

DEFAULT_PERSONAL_GMAIL_LIMIT = 450
DEFAULT_STRICT_SAFE_LIMIT = 100


class SMTPQuotaExceededError(Exception):
    """Raised when email sending exceeds the daily Gmail SMTP quota ceiling."""
    pass


class SmtpQuotaManager:
    """Manages rolling 24-hour SMTP usage tracking and hard-break campaign enforcement."""

    @staticmethod
    def get_quota_doc() -> Dict[str, any]:
        """Retrieves or initializes the singleton SMTP quota document."""
        db = get_db()
        doc = db.system_config.find_one({"_id": "smtp_quota_tracker"})
        if not doc:
            doc = {
                "_id": "smtp_quota_tracker",
                "sent_today": 0,
                "window_started_at": now_iso(),
                "daily_limit": DEFAULT_PERSONAL_GMAIL_LIMIT,
                "is_hard_stopped": False,
                "stop_reason": "",
                "stopped_at": None,
                "total_lifetime_sent": 0,
                "last_sent_at": None,
                "consecutive_failures": 0,
                "auto_resume_hours": 24,
            }
            db.system_config.insert_one(doc)
            return doc

        # Ensure all required fields exist on existing document
        if "window_started_at" not in doc:
            doc["window_started_at"] = now_iso()
            doc["sent_today"] = doc.get("sent_today", 0)
            doc["daily_limit"] = doc.get("daily_limit", DEFAULT_PERSONAL_GMAIL_LIMIT)
            doc["is_hard_stopped"] = doc.get("is_hard_stopped", False)
            db.system_config.update_one(
                {"_id": "smtp_quota_tracker"},
                {"$set": {
                    "window_started_at": doc["window_started_at"],
                    "sent_today": doc["sent_today"],
                    "daily_limit": doc["daily_limit"],
                    "is_hard_stopped": doc["is_hard_stopped"],
                }}
            )

        # Check if the 24-hour rolling window has elapsed; if so, reset the daily counter
        window_start = datetime.fromisoformat(doc["window_started_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) - window_start >= timedelta(hours=24):
            db.system_config.update_one(
                {"_id": "smtp_quota_tracker"},
                {
                    "$set": {
                        "sent_today": 0,
                        "window_started_at": now_iso(),
                        "is_hard_stopped": False,
                        "stop_reason": "",
                        "stopped_at": None,
                        "consecutive_failures": 0,
                    }
                }
            )
            doc["sent_today"] = 0
            doc["is_hard_stopped"] = False
            doc["stop_reason"] = ""
            doc["window_started_at"] = now_iso()

        return doc

    @classmethod
    def get_status(cls) -> Dict[str, any]:
        """Returns the current SMTP quota status for UI meters and safety checks."""
        doc = cls.get_quota_doc()
        limit = int(doc.get("daily_limit", DEFAULT_PERSONAL_GMAIL_LIMIT))
        sent = int(doc.get("sent_today", 0))
        pct = round((sent / limit) * 100, 1) if limit > 0 else 100.0

        window_start = datetime.fromisoformat(doc["window_started_at"].replace("Z", "+00:00"))
        window_ends = window_start + timedelta(hours=24)
        rem_sec = max(0, int((window_ends - datetime.now(timezone.utc)).total_seconds()))
        hours, rem = divmod(rem_sec, 3600)
        minutes, _ = divmod(rem, 60)

        return {
            "sent_today": sent,
            "daily_limit": limit,
            "remaining": max(0, limit - sent),
            "percent_used": min(100.0, pct),
            "is_hard_stopped": bool(doc.get("is_hard_stopped", False)),
            "stop_reason": doc.get("stop_reason", ""),
            "stopped_at": doc.get("stopped_at"),
            "total_lifetime_sent": doc.get("total_lifetime_sent", 0),
            "window_resets_in": f"{hours:02d}h {minutes:02d}m",
            "last_sent_at": doc.get("last_sent_at"),
        }

    @classmethod
    def check_can_send(cls) -> Tuple[bool, Optional[str]]:
        """Pre-send gatekeeper: checks whether SMTP sending is allowed."""
        status = cls.get_status()
        if status["is_hard_stopped"]:
            return False, f"Gmail SMTP is HARD-STOPPED: {status['stop_reason']}"
        if status["sent_today"] >= status["daily_limit"]:
            # Automatically trigger hard break if quota reached
            cls.trigger_hard_break(
                f"Personal Gmail daily SMTP sending limit reached ({status['sent_today']}/{status['daily_limit']}). Emergency stopper activated."
            )
            return False, f"Personal Gmail daily SMTP limit reached ({status['sent_today']}/{status['daily_limit']})"
        return True, None

    @classmethod
    def record_send(cls, count: int = 1):
        """Records an authorized SMTP transmission, incrementing the daily and lifetime counters."""
        db = get_db()
        db.system_config.update_one(
            {"_id": "smtp_quota_tracker"},
            {
                "$inc": {"sent_today": count, "total_lifetime_sent": count},
                "$set": {"last_sent_at": now_iso(), "consecutive_failures": 0},
                "$setOnInsert": {
                    "window_started_at": now_iso(),
                    "daily_limit": DEFAULT_PERSONAL_GMAIL_LIMIT,
                    "is_hard_stopped": False,
                    "stop_reason": "",
                    "stopped_at": None,
                    "auto_resume_hours": 24,
                },
            },
            upsert=True,
        )

        # Check if this send reached the quota limit
        doc = db.system_config.find_one({"_id": "smtp_quota_tracker"}) or {}
        limit = doc.get("daily_limit", DEFAULT_PERSONAL_GMAIL_LIMIT)
        if doc.get("sent_today", 0) >= limit:
            cls.trigger_hard_break(
                f"Personal Gmail daily SMTP limit of {limit} reached. Automatic campaign stopper engaged."
            )

    @classmethod
    def trigger_hard_break(cls, reason: str, error_details: Optional[str] = None):
        """
        Activates the Emergency Gmail Mail Stopper:
        - Freezes the SMTP gateway.
        - Immediately transitions all active email campaigns to 'Hard-Stopped (SMTP Quota Exceeded)'.
        - Records an audit alert in MongoDB.
        """
        db = get_db()
        now = now_iso()
        logger.warning(f"🚨 [GMAIL MAIL STOPPER ACTIVATED] Reason: {reason} | Details: {error_details}")

        db.system_config.update_one(
            {"_id": "smtp_quota_tracker"},
            {
                "$set": {
                    "is_hard_stopped": True,
                    "stop_reason": reason,
                    "stopped_at": now,
                    "error_details": error_details or "",
                },
                "$setOnInsert": {
                    "sent_today": 0,
                    "window_started_at": now_iso(),
                    "daily_limit": DEFAULT_PERSONAL_GMAIL_LIMIT,
                    "total_lifetime_sent": 0,
                },
            },
            upsert=True,
        )

        # Hard-stop all currently active email campaigns
        stopped_res = db.campaigns.update_many(
            {"status": "Active", "channel": {"$in": ["Email", "Omnichannel", "All"]}},
            {
                "$set": {
                    "status": "Hard-Stopped (SMTP Quota Exceeded)",
                    "hard_stop_reason": reason,
                    "hard_stopped_at": now,
                    "updated_at": now,
                }
            }
        )

        # Record critical incident alert
        db.system_alerts.insert_one({
            "type": "SMTP_HARD_STOPPER_TRIGGERED",
            "severity": "CRITICAL",
            "reason": reason,
            "error_details": error_details,
            "campaigns_halted_count": stopped_res.modified_count,
            "timestamp": now,
        })

    @classmethod
    def resume_and_clear_hard_break(cls) -> Dict[str, any]:
        """Manually resumes email campaigns and clears the emergency hard-break flag."""
        db = get_db()
        db.system_config.update_one(
            {"_id": "smtp_quota_tracker"},
            {
                "$set": {
                    "is_hard_stopped": False,
                    "stop_reason": "",
                    "stopped_at": None,
                    "error_details": "",
                }
            }
        )

        # Resume previously hard-stopped campaigns back to Active
        res = db.campaigns.update_many(
            {"status": "Hard-Stopped (SMTP Quota Exceeded)"},
            {"$set": {"status": "Active", "updated_at": now_iso()}}
        )

        return {
            "resumed": True,
            "campaigns_resumed": res.modified_count,
            "message": "Gmail Mail Stopper disengaged. Campaigns returned to Active state.",
        }

    @classmethod
    def configure_quota(cls, daily_limit: int, auto_resume_hours: int = 24) -> Dict[str, any]:
        """Configures safe daily limit (e.g. 100 for personal Gmail, 450 for standard, 1900 for Workspace)."""
        db = get_db()
        db.system_config.update_one(
            {"_id": "smtp_quota_tracker"},
            {
                "$set": {
                    "daily_limit": max(1, min(daily_limit, 2000)),
                    "auto_resume_hours": auto_resume_hours,
                    "updated_at": now_iso(),
                },
                "$setOnInsert": {
                    "sent_today": 0,
                    "window_started_at": now_iso(),
                    "is_hard_stopped": False,
                    "stop_reason": "",
                    "stopped_at": None,
                    "total_lifetime_sent": 0,
                },
            },
            upsert=True,
        )
        return cls.get_status()

    @classmethod
    def reset_counter(cls) -> Dict[str, any]:
        """Manually resets the daily counter (e.g. when switching to a fresh Gmail account)."""
        db = get_db()
        db.system_config.update_one(
            {"_id": "smtp_quota_tracker"},
            {
                "$set": {
                    "sent_today": 0,
                    "window_started_at": now_iso(),
                    "is_hard_stopped": False,
                    "stop_reason": "",
                    "stopped_at": None,
                },
                "$setOnInsert": {
                    "daily_limit": DEFAULT_PERSONAL_GMAIL_LIMIT,
                    "total_lifetime_sent": 0,
                },
            },
            upsert=True,
        )
        return cls.get_status()
