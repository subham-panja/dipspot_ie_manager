"""
M2 — Chatwoot REST API Client for TradePulse EXIM.

Wraps Chatwoot v3.x API endpoints used by the backend omnichannel sync:
 - Healthcheck (/api)
 - Inboxes (list / create)
 - Contacts (search / create / get / contact_inboxes)
 - Conversations (list / create / get / toggle_status)
 - Messages (list / create with content_attributes)
 - Webhooks (list / register)

All methods return (data_dict_or_list, http_status_int).
On connection failure, returns ({"error": str, "reachable": False}, 502).
"""

import hashlib
import hmac as _hmac
import json
import re
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.config import get_chatwoot_config


# ---------------------------------------------------------------------------
# Helpers & Zero-Mock Email Guard
# ---------------------------------------------------------------------------

_CHANNEL_INBOX_FIELD = {
    "Email": "email_inbox_id",
    "WhatsApp": "whatsapp_inbox_id",
    "Website": "website_inbox_id",
}

CHANNEL_NORMALISE = {
    "channel::webwidget": "Website",
    "web_widget": "Website",
    "webwidget": "Website",
    "website live chat": "Website",
    "website": "Website",
    "web": "Website",
    "channel::email": "Email",
    "email": "Email",
    "channel::whatsapp": "WhatsApp",
    "whatsapp": "WhatsApp",
    "wa": "WhatsApp",
}

_SYNTHETIC_EMAIL_LOCALS = {
    "trade",
    "procurement",
    "test",
    "mock",
    "dummy",
    "noreply",
    "no-reply",
}

_SYNTHETIC_EMAIL_DOMAINS = {
    "test.com",
    "domain.com",
    "wixpress.com",
    "sentry.io",
    "localhost",
}


def normalise_channel(raw: Optional[str]) -> str:
    text = str(raw or "").strip()
    if not text:
        return ""
    return CHANNEL_NORMALISE.get(text.lower(), text)


def is_non_synthetic_email(email: Optional[str]) -> bool:
    """Enforce Zero-Mock Policy before forwarding any email to Chatwoot."""
    if not email or not isinstance(email, str):
        return False
    em = email.strip().lower()
    if not em or any(ch.isspace() for ch in em) or em.count("@") != 1:
        return False
    local, _, domain = em.partition("@")
    if not local or not domain or "." not in domain:
        return False
    if local in _SYNTHETIC_EMAIL_LOCALS:
        return False
    if domain == "example" or domain.startswith("example.") or ".example." in domain:
        return False
    if domain in _SYNTHETIC_EMAIL_DOMAINS or any(
        domain.endswith(f".{blocked}") for blocked in _SYNTHETIC_EMAIL_DOMAINS
    ):
        return False
    return True


def compute_hmac(secret: str, identifier: str) -> str:
    return _hmac.new(secret.encode("utf-8"), identifier.encode("utf-8"), hashlib.sha256).hexdigest()


def _headers(token: str) -> Dict[str, str]:
    return {
        "api_access_token": token,
        "Content-Type": "application/json",
    }


def _ok(data: Any, status: int = 200) -> Tuple[Any, int]:
    return data, status


def _err(msg: str, status: int = 502) -> Tuple[Dict, int]:
    return {"error": msg, "reachable": status not in (401, 403, 404, 422, 502)}, status


# ---------------------------------------------------------------------------
# Main client class
# ---------------------------------------------------------------------------


class ChatwootClient:
    """Thin synchronous httpx wrapper around the Chatwoot REST API."""

    def __init__(self, base_url: str, account_id: str, api_token: str, timeout: float = 8.0):
        self.base = base_url.rstrip("/")
        self.account_id = str(account_id)
        self.token = api_token
        self.timeout = timeout

    def _acct_url(self, suffix: str) -> str:
        return f"{self.base}/api/v1/accounts/{self.account_id}/{suffix.lstrip('/')}"

    def _request(
        self,
        method: str,
        url: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        payload: Optional[Dict[str, Any]] = None,
        ok_statuses: Tuple[int, ...] = (200,),
        label: str = "chatwoot",
        send_auth: bool = True,
    ) -> Tuple[Any, int]:
        hdrs = _headers(self.token) if send_auth else {"Content-Type": "application/json"}
        content = json.dumps(payload) if payload is not None else None
        try:
            with httpx.Client(timeout=self.timeout) as cli:
                resp = cli.request(method, url, headers=hdrs, params=params, content=content)
        except (httpx.RequestError, httpx.InvalidURL) as exc:
            return _err(str(exc), 502)

        if resp.status_code in ok_statuses:
            try:
                data = resp.json() if resp.content else {}
            except ValueError:
                return _err(f"{label} returned invalid JSON", 502)
            return _ok(data if data is not None else {}, resp.status_code)
        return _err(f"{label} HTTP {resp.status_code}", resp.status_code)

    # ------------------------------------------------------------------
    # Healthcheck & Inboxes
    # ------------------------------------------------------------------

    def healthcheck(self) -> Tuple[Dict, int]:
        data, st = self._request("GET", f"{self.base}/api", label="healthcheck", send_auth=False)
        if isinstance(data, dict) and st == 200:
            return _ok(data, 200)
        return data if isinstance(data, dict) else _err("healthcheck failed", st), st

    def list_inboxes(self) -> Tuple[Any, int]:
        data, st = self._request("GET", self._acct_url("inboxes"), label="inboxes")
        if isinstance(data, dict) and st == 200:
            return _ok(data.get("payload", []), 200)
        return data, st

    def create_inbox(
        self,
        name_or_payload: Any,
        channel_type: str = "Channel::WebWidget",
        **extra: Any,
    ) -> Tuple[Dict, int]:
        if isinstance(name_or_payload, dict):
            payload = dict(name_or_payload)
        else:
            payload = {"name": name_or_payload, "channel_type": channel_type, **extra}
        return self._request(
            "POST", self._acct_url("inboxes"), payload=payload, ok_statuses=(200, 201), label="create_inbox"
        )

    # ------------------------------------------------------------------
    # Contacts
    # ------------------------------------------------------------------

    def search_contacts(self, q: str) -> Tuple[Any, int]:
        data, st = self._request(
            "GET",
            self._acct_url("contacts/search"),
            params={"q": q, "include_contacts": "true"},
            label="contact search",
        )
        if isinstance(data, dict) and st == 200:
            return _ok(data.get("payload", []), 200)
        return data, st

    def create_contact(self, payload: Dict) -> Tuple[Dict, int]:
        return self._request(
            "POST", self._acct_url("contacts"), payload=payload, ok_statuses=(200, 201), label="create_contact"
        )

    def get_contact(self, contact_id: int) -> Tuple[Dict, int]:
        return self._request("GET", self._acct_url(f"contacts/{contact_id}"), label="get_contact")

    def create_contact_inbox(
        self, contact_id: int, inbox_id: int, source_id: Optional[str] = None
    ) -> Tuple[Dict, int]:
        payload: Dict[str, Any] = {"inbox_id": inbox_id}
        if source_id:
            payload["source_id"] = source_id
        return self._request(
            "POST",
            self._acct_url(f"contacts/{contact_id}/contact_inboxes"),
            payload=payload,
            ok_statuses=(200, 201),
            label="create_contact_inbox",
        )

    # ------------------------------------------------------------------
    # Conversations
    # ------------------------------------------------------------------

    def create_conversation(self, payload: Dict) -> Tuple[Dict, int]:
        return self._request(
            "POST",
            self._acct_url("conversations"),
            payload=payload,
            ok_statuses=(200, 201),
            label="create_conversation",
        )

    def list_conversations(self, page: int = 1) -> Tuple[Dict, int]:
        return self._request(
            "GET", self._acct_url("conversations"), params={"page": page}, label="list_conversations"
        )

    def get_conversation(self, conv_id: int) -> Tuple[Dict, int]:
        return self._request("GET", self._acct_url(f"conversations/{conv_id}"), label="get_conversation")

    def toggle_status(self, conv_id: int, status: Optional[str] = None) -> Tuple[Dict, int]:
        payload = {"status": status} if status else {}
        return self._request(
            "POST",
            self._acct_url(f"conversations/{conv_id}/toggle_status"),
            payload=payload,
            ok_statuses=(200, 201),
            label="toggle_status",
        )

    # ------------------------------------------------------------------
    # Messages & Webhooks
    # ------------------------------------------------------------------

    def list_messages(self, conv_id: int) -> Tuple[Any, int]:
        data, st = self._request(
            "GET", self._acct_url(f"conversations/{conv_id}/messages"), label="list_messages"
        )
        if st == 200 and isinstance(data, dict):
            return _ok(data.get("payload", []), 200)
        return data, st

    def create_message(
        self,
        conv_id: int,
        content: str,
        message_type: str = "outgoing",
        private: bool = False,
        content_attributes: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Dict, int]:
        payload: Dict[str, Any] = {
            "content": content,
            "message_type": message_type,
            "private": private,
        }
        if content_attributes:
            payload["content_attributes"] = content_attributes
        return self._request(
            "POST",
            self._acct_url(f"conversations/{conv_id}/messages"),
            payload=payload,
            ok_statuses=(200, 201),
            label="create_message",
        )

    def list_webhooks(self) -> Tuple[Any, int]:
        data, st = self._request("GET", self._acct_url("webhooks"), label="list_webhooks")
        if st == 200 and isinstance(data, dict):
            pl = data.get("payload")
            if isinstance(pl, dict):
                return _ok(pl.get("webhooks", []), 200)
            if isinstance(pl, list):
                return _ok(pl, 200)
        return data, st

    def register_webhook(
        self, url: str, subscriptions: Optional[List[str]] = None
    ) -> Tuple[Dict, int]:
        subs = subscriptions or [
            "message_created",
            "message_updated",
            "conversation_created",
            "conversation_status_changed",
            "conversation_updated",
            "webwidget_triggered",
        ]
        return self._request(
            "POST",
            self._acct_url("webhooks"),
            payload={"url": url, "subscriptions": subs},
            ok_statuses=(200, 201),
            label="register_webhook",
        )

    # ------------------------------------------------------------------
    # High-level helpers
    # ------------------------------------------------------------------

    def upsert_contact_for_lead(
        self, lead: Dict, inbox_id: Optional[int] = None
    ) -> Tuple[Optional[int], bool]:
        """Create or find Chatwoot contact for a lead. Returns (contact_id, created)."""
        raw_id = lead.get("id") if lead.get("id") is not None else lead.get("_id")
        identifier = f"tradepulse_lead_{raw_id}"

        raw_emails = re.split(r"[;,]", str(lead.get("emails") or ""))
        valid_email = next((e.strip() for e in raw_emails if is_non_synthetic_email(e)), "")
        if not valid_email and is_non_synthetic_email(lead.get("primary_email")):
            valid_email = str(lead.get("primary_email")).strip()

        raw_phones = re.split(r"[;,]", f"{lead.get('direct_phone') or ''};{lead.get('phones') or ''}")
        phone = next((p.strip() for p in raw_phones if p.strip()), "")
        name = (lead.get("company_name") or lead.get("contact_person") or "Trade Lead").strip()

        results, _ = self.search_contacts(identifier)
        if isinstance(results, list):
            for c in results:
                if c.get("identifier") == identifier and c.get("id") is not None:
                    return c["id"], False

        if valid_email:
            em_results, _ = self.search_contacts(valid_email)
            if isinstance(em_results, list):
                for c in em_results:
                    if str(c.get("email") or "").strip().lower() == valid_email.lower() and c.get("id") is not None:
                        return c["id"], False

        payload: Dict[str, Any] = {
            "name": name,
            "identifier": identifier,
            "custom_attributes": {
                "tradepulse_lead_id": str(raw_id),
                "country": lead.get("country", ""),
                "lead_type": lead.get("lead_type", ""),
            },
        }
        if valid_email:
            payload["email"] = valid_email
        if phone:
            payload["phone_number"] = phone
        if inbox_id is not None:
            payload["inbox_id"] = inbox_id

        data, _ = self.create_contact(payload)
        if not isinstance(data, dict):
            return None, False
        contact = data.get("payload", {}).get("contact") if isinstance(data.get("payload"), dict) else None
        if contact and contact.get("id") is not None:
            return contact["id"], True
        if data.get("id") is not None:
            return data["id"], True
        return None, False

    def upsert_conversation_for_lead(
        self, lead: Dict, contact_id: int, inbox_id: Optional[int], channel: str = "Email"
    ) -> Tuple[Optional[int], bool]:
        """Create or find Chatwoot conversation for a lead. Returns (conv_id, created)."""
        raw_id = lead.get("id") if lead.get("id") is not None else lead.get("_id")
        existing, _ = self.list_conversations()
        if isinstance(existing, dict):
            for conv in existing.get("data", {}).get("payload") or []:
                meta = conv.get("meta") or {}
                sender = meta.get("sender") or {}
                same_contact = sender.get("id") == contact_id or conv.get("contact_id") == contact_id
                if not same_contact:
                    continue
                if inbox_id is None or str(conv.get("inbox_id")) == str(inbox_id):
                    if conv.get("id") is not None:
                        return conv["id"], False

        payload: Dict[str, Any] = {
            "contact_id": contact_id,
            "custom_attributes": {
                "tradepulse_lead_id": str(raw_id),
                "channel": channel,
            },
        }
        if inbox_id is not None:
            payload["inbox_id"] = inbox_id

        data, _ = self.create_conversation(payload)
        if isinstance(data, dict) and data.get("id") is not None:
            return data["id"], True
        return None, False


# ---------------------------------------------------------------------------
# Factory helpers
# ---------------------------------------------------------------------------


def get_client(mongo_db=None) -> Optional["ChatwootClient"]:
    """Return a ChatwootClient from current config, or None if disabled/unconfigured."""
    cfg = get_chatwoot_config(mongo_db, include_secrets=True)
    if not cfg.get("enabled"):
        return None
    base_url = cfg.get("base_url") or ""
    token = cfg.get("api_access_token") or ""
    account_id = cfg.get("account_id") or "1"
    if not base_url or not token:
        return None
    return ChatwootClient(base_url=base_url, account_id=account_id, api_token=token)


def get_inbox_id(cfg: Dict, channel: str) -> Optional[int]:
    field = _CHANNEL_INBOX_FIELD.get(channel)
    if not field:
        return None
    raw = cfg.get(field)
    if raw not in (None, ""):
        try:
            return int(raw)
        except (ValueError, TypeError):
            pass
    return None
