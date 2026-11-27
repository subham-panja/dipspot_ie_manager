from urllib.parse import urlsplit
import httpx
from flask import request
from app.db import now_iso
from app.config import get_chatwoot_config, get_whatsapp_config


def is_usable_secret(value) -> bool:
    if not isinstance(value, str):
        return False
    stripped = value.strip()
    return bool(stripped) and not stripped.startswith("••••")


def coerce_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ("true", "1", "yes", "on")
    return bool(value)


def has_lone_surrogates(value: str) -> bool:
    return any(0xD800 <= ord(ch) <= 0xDFFF for ch in value)


def parse_json_object_body():
    raw_body = request.get_data()
    data = request.get_json(silent=True)
    if raw_body.strip():
        if not isinstance(data, dict):
            return None, False
        return data, True
    return {}, True


def validate_http_url(url: str) -> tuple[bool, str]:
    if has_lone_surrogates(url):
        return False, "URL contains invalid UTF-16 surrogate characters"
    if any(ord(ch) < 32 or ord(ch) == 127 for ch in url):
        return False, "URL contains invalid control characters"
    if any(ch.isspace() for ch in url):
        return False, "URL must not contain whitespace"
    try:
        parsed = urlsplit(url)
        _ = parsed.port
    except ValueError as exc:
        return False, f"Invalid URL: {exc}"
    if parsed.scheme.lower() not in ("http", "https") or not parsed.netloc or not parsed.hostname:
        return False, "URL must use http:// or https:// with a valid host"
    return True, ""


def apply_chatwoot_update(db, data: dict) -> tuple[dict, int]:
    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    current = dict(conf.get("chatwoot") or {})
    cleared = set(current.get("_cleared") or [])

    str_keys = [
        "base_url",
        "public_url",
        "account_id",
        "email_inbox_id",
        "whatsapp_inbox_id",
        "website_inbox_id",
        "website_token",
    ]
    for key in str_keys:
        if key in data and data[key] is not None:
            val = str(data[key]).strip()
            if has_lone_surrogates(val):
                return {"error": f"Invalid {key}: contains invalid UTF-16 surrogate characters"}, 400
            if key in ("base_url", "public_url"):
                val = val.rstrip("/")
                if val:
                    is_valid, err_msg = validate_http_url(val)
                    if not is_valid:
                        return {"error": f"Invalid {key}: {err_msg}"}, 400
            current[key] = val

    if "enabled" in data and data["enabled"] is not None:
        current["enabled"] = coerce_bool(data["enabled"])

    secret_specs = [
        ("api_access_token", ("clear_api_token", "clear_api_access_token")),
        ("webhook_secret", ("clear_webhook_secret",)),
        ("website_hmac_secret", ("clear_website_hmac_secret",)),
    ]
    for field, clear_flags in secret_specs:
        if any(data.get(flag) is True for flag in clear_flags):
            current[field] = ""
            cleared.add(field)
        elif field in data:
            val = data[field]
            if isinstance(val, str) and has_lone_surrogates(val):
                return {"error": f"Invalid {field}: contains invalid UTF-16 surrogate characters"}, 400
            if is_usable_secret(val):
                current[field] = val.strip()
                cleared.discard(field)

    current["_cleared"] = sorted(cleared)
    current["updated_at"] = now_iso()

    db.system_config.update_one(
        {"_id": "singleton_config"},
        {"$set": {"chatwoot": current, "updated_at": current["updated_at"]}},
        upsert=True,
    )

    response_payload = get_chatwoot_config(db, include_secrets=False)
    response_payload["message"] = "Chatwoot configuration updated successfully"
    return response_payload, 200


def _probe_result(
    success: bool,
    reachable: bool,
    status_code,
    inboxes: list,
    message: str,
) -> tuple[dict, int]:
    return {
        "success": success,
        "reachable": reachable,
        "status_code": status_code,
        "inboxes": inboxes,
        "message": message,
    }, 200


def probe_chatwoot_connection(db, data: dict, http_client_cls=httpx.Client) -> tuple[dict, int]:
    cfg = get_chatwoot_config(db, include_secrets=True)

    raw_base = data.get("base_url")
    base_url = str(raw_base).strip().rstrip("/") if raw_base not in (None, "") else cfg["base_url"]
    raw_account = data.get("account_id")
    account_id = (str(raw_account).strip() if raw_account not in (None, "") else cfg["account_id"]) or "1"

    raw_token = data.get("api_access_token")
    token = raw_token.strip() if is_usable_secret(raw_token) else cfg["api_access_token"]

    if has_lone_surrogates(account_id) or has_lone_surrogates(token):
        return _probe_result(
            False, False, None, [], "Invalid Chatwoot test parameters: invalid UTF-16 surrogate characters."
        )

    if not base_url:
        return _probe_result(False, False, None, [], "Chatwoot base URL is not configured.")

    is_valid_url, url_err = validate_http_url(base_url)
    if not is_valid_url:
        return _probe_result(False, False, None, [], f"Invalid Chatwoot base URL: {url_err}")

    try:
        with http_client_cls(timeout=5.0) as http:
            resp = http.get(f"{base_url}/api")
            if resp.status_code >= 400:
                return _probe_result(
                    False,
                    True,
                    resp.status_code,
                    [],
                    f"Chatwoot responded with HTTP {resp.status_code} at /api",
                )

            try:
                api_payload = resp.json()
            except ValueError:
                api_payload = None
            if not isinstance(api_payload, (dict, list)):
                return _probe_result(
                    False,
                    True,
                    resp.status_code,
                    [],
                    f"Endpoint at {base_url}/api did not return a valid Chatwoot JSON response.",
                )

            if token:
                inbox_resp = http.get(
                    f"{base_url}/api/v1/accounts/{account_id}/inboxes",
                    headers={"api_access_token": token},
                )
                if 200 <= inbox_resp.status_code < 300:
                    try:
                        payload = inbox_resp.json()
                    except ValueError:
                        payload = None
                    if not isinstance(payload, (dict, list)):
                        return _probe_result(
                            False,
                            True,
                            inbox_resp.status_code,
                            [],
                            "Chatwoot inboxes endpoint did not return a valid JSON response.",
                        )
                    raw_inboxes = payload.get("payload", []) if isinstance(payload, dict) else payload
                    if not isinstance(raw_inboxes, list):
                        raw_inboxes = []
                    inboxes = [
                        {
                            "id": item.get("id"),
                            "name": item.get("name"),
                            "channel_type": item.get("channel_type"),
                        }
                        for item in raw_inboxes
                        if isinstance(item, dict)
                    ]
                    return _probe_result(
                        True,
                        True,
                        inbox_resp.status_code,
                        inboxes,
                        f"Connected to Chatwoot at {base_url} ({len(inboxes)} inbox(es) found).",
                    )

                if inbox_resp.status_code in (401, 403):
                    return _probe_result(
                        False,
                        True,
                        inbox_resp.status_code,
                        [],
                        "Chatwoot API reachable, but API access token was rejected.",
                    )

                return _probe_result(
                    False,
                    True,
                    inbox_resp.status_code,
                    [],
                    f"Chatwoot inboxes endpoint returned HTTP {inbox_resp.status_code}.",
                )

            return _probe_result(
                True,
                True,
                resp.status_code,
                [],
                "Chatwoot API reachable (no API access token configured to fetch inboxes).",
            )
    except (httpx.RequestError, httpx.InvalidURL, ValueError) as exc:
        return _probe_result(False, False, None, [], f"Chatwoot unreachable at {base_url}: {exc}")


def _parse_daily_cap(raw_cap) -> tuple[int | None, str | None]:
    err = "personal_daily_cap must be an integer between 0 and 10000"
    if isinstance(raw_cap, bool):
        return None, err
    if isinstance(raw_cap, float):
        if not raw_cap.is_integer():
            return None, err
        cap_val = int(raw_cap)
    elif isinstance(raw_cap, int):
        cap_val = raw_cap
    elif isinstance(raw_cap, str):
        stripped_cap = raw_cap.strip()
        if not stripped_cap:
            return None, err
        try:
            cap_val = int(stripped_cap)
        except ValueError:
            return None, err
    else:
        return None, err

    if cap_val < 0 or cap_val > 10000:
        return None, err
    return cap_val, None


def apply_whatsapp_update(db, data: dict) -> tuple[dict, int]:
    conf = db.system_config.find_one({"_id": "singleton_config"}) or {}
    current = dict(conf.get("whatsapp") or {})
    cleared = set(current.get("_cleared") or [])

    for key in ["provider", "phone_number_id", "business_account_id", "webhook_url", "typing_delay_jitter"]:
        if key in data and data[key] is not None:
            val = str(data[key]).strip()
            if has_lone_surrogates(val):
                return {"error": f"Invalid {key}: contains invalid UTF-16 surrogate characters"}, 400
            current[key] = val

    if "personal_daily_cap" in data and data["personal_daily_cap"] is not None:
        cap_val, cap_err = _parse_daily_cap(data["personal_daily_cap"])
        if cap_err:
            return {"error": cap_err}, 400
        current["personal_daily_cap"] = cap_val

    if "auto_stop_opt_out" in data and data["auto_stop_opt_out"] is not None:
        current["auto_stop_opt_out"] = coerce_bool(data["auto_stop_opt_out"])

    if data.get("clear_access_token") is True or data.get("clear_api_token") is True:
        current["access_token"] = ""
        cleared.add("access_token")
    elif any(k in data for k in ("access_token", "api_token", "api_access_token")):
        raw_token = data.get("access_token")
        if not is_usable_secret(raw_token) and "api_token" in data:
            raw_token = data.get("api_token")
        if not is_usable_secret(raw_token) and "api_access_token" in data:
            raw_token = data.get("api_access_token")
        if isinstance(raw_token, str) and has_lone_surrogates(raw_token):
            return {"error": "Invalid access_token: contains invalid UTF-16 surrogate characters"}, 400
        if is_usable_secret(raw_token):
            current["access_token"] = raw_token.strip()
            cleared.discard("access_token")

    if data.get("clear_webhook_verify_token") is True:
        current["webhook_verify_token"] = ""
        cleared.add("webhook_verify_token")
    elif "webhook_verify_token" in data:
        raw_verify = data["webhook_verify_token"]
        if isinstance(raw_verify, str) and has_lone_surrogates(raw_verify):
            return {"error": "Invalid webhook_verify_token: contains invalid UTF-16 surrogate characters"}, 400
        if is_usable_secret(raw_verify):
            current["webhook_verify_token"] = raw_verify.strip()
            cleared.discard("webhook_verify_token")

    current["_cleared"] = sorted(cleared)
    current["updated_at"] = now_iso()

    db.system_config.update_one(
        {"_id": "singleton_config"},
        {"$set": {"whatsapp": current, "updated_at": current["updated_at"]}},
        upsert=True,
    )

    response_payload = get_whatsapp_config(db, include_secrets=False)
    response_payload["message"] = "WhatsApp configuration updated successfully"
    return response_payload, 200
