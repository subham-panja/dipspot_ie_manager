import os
from dotenv import load_dotenv

load_dotenv()


def _csv_list(key: str, default: str = "") -> list:
    raw = os.getenv(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _bool(key: str, default: str = "true") -> bool:
    return os.getenv(key, default).lower().strip() in ("true", "1", "yes")


def _int(key: str, default: int = 0) -> int:
    raw = os.getenv(key, "")
    if not raw or not raw.strip():
        return default
    try:
        return int(raw.strip())
    except (ValueError, TypeError):
        return default


def _mask_secret(value: str) -> str:
    if not value:
        return ""
    text = str(value).strip()
    if not text:
        return ""
    if len(text) < 10:
        return "••••••••••••••••"
    return f"••••••••{text[-4:]}"


def get_chatwoot_config(mongo_db=None, include_secrets: bool = False) -> dict:
    """Resolve Chatwoot configuration dynamically from env vars and persisted system_config."""
    env_base_url = (os.getenv("CHATWOOT_BASE_URL") or "http://localhost:3001").strip().rstrip("/")
    raw_env_public_url = (os.getenv("CHATWOOT_PUBLIC_URL") or "").strip().rstrip("/")
    env_account_id = (os.getenv("CHATWOOT_ACCOUNT_ID") or "1").strip()
    env_api_token = os.getenv("CHATWOOT_API_ACCESS_TOKEN", "").strip()
    env_webhook_secret = os.getenv("CHATWOOT_WEBHOOK_SECRET", "").strip()
    env_email_inbox_id = os.getenv("CHATWOOT_EMAIL_INBOX_ID", "").strip()
    env_whatsapp_inbox_id = os.getenv("CHATWOOT_WHATSAPP_INBOX_ID", "").strip()
    env_website_inbox_id = os.getenv("CHATWOOT_WEBSITE_INBOX_ID", "").strip()
    env_website_token = os.getenv("CHATWOOT_WEBSITE_TOKEN", "").strip()
    env_website_hmac_secret = os.getenv("CHATWOOT_WEBSITE_HMAC_SECRET", "").strip()

    db_cw = {}
    if mongo_db is None:
        try:
            from app.db import get_db
            mongo_db = get_db()
        except Exception:
            mongo_db = None

    if mongo_db is not None:
        try:
            conf = mongo_db.system_config.find_one({"_id": "singleton_config"}) or {}
            db_cw = conf.get("chatwoot") or {}
        except Exception:
            db_cw = {}

    cleared = set(db_cw.get("_cleared") or [])

    db_base_url = str(db_cw.get("base_url") or "").strip().rstrip("/")
    db_public_url = str(db_cw.get("public_url") or "").strip().rstrip("/")
    base_url = (db_base_url or env_base_url or "http://localhost:3001").strip().rstrip("/")
    public_url = (db_public_url or raw_env_public_url or db_base_url or "http://localhost:3001").strip().rstrip("/")

    raw_account_id = db_cw.get("account_id")
    if raw_account_id not in (None, ""):
        account_id = str(raw_account_id).strip()
    else:
        account_id = env_account_id or "1"

    def _str_field(key: str, env_default: str) -> str:
        if key in db_cw and db_cw[key] is not None:
            return str(db_cw[key]).strip()
        return env_default

    def _secret_field(key: str, env_default: str) -> str:
        if key in cleared:
            return ""
        val = db_cw.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
        return env_default

    email_inbox_id = _str_field("email_inbox_id", env_email_inbox_id)
    whatsapp_inbox_id = _str_field("whatsapp_inbox_id", env_whatsapp_inbox_id)
    website_inbox_id = _str_field("website_inbox_id", env_website_inbox_id)
    website_token = _str_field("website_token", env_website_token)

    api_access_token = _secret_field("api_access_token", env_api_token)
    webhook_secret = _secret_field("webhook_secret", env_webhook_secret)
    website_hmac_secret = _secret_field("website_hmac_secret", env_website_hmac_secret)

    configured = bool(api_access_token or website_token)

    if "enabled" in db_cw and db_cw["enabled"] is not None:
        enabled = bool(db_cw["enabled"])
    elif "CHATWOOT_ENABLED" in os.environ:
        enabled = _bool("CHATWOOT_ENABLED", "false")
    else:
        enabled = bool(api_access_token or website_token)

    result = {
        "configured": configured,
        "enabled": enabled,
        "base_url": base_url,
        "public_url": public_url,
        "account_id": account_id,
        "email_inbox_id": email_inbox_id,
        "whatsapp_inbox_id": whatsapp_inbox_id,
        "website_inbox_id": website_inbox_id,
        "website_token": website_token,
        "has_api_token": bool(api_access_token),
        "masked_api_token": _mask_secret(api_access_token),
        "has_webhook_secret": bool(webhook_secret),
        "masked_webhook_secret": _mask_secret(webhook_secret),
        "has_website_hmac_secret": bool(website_hmac_secret),
        "masked_website_hmac_secret": _mask_secret(website_hmac_secret),
        "channels": {
            "email": bool(email_inbox_id),
            "whatsapp": bool(whatsapp_inbox_id),
            "website": bool(website_inbox_id or website_token),
        },
        "updated_at": db_cw.get("updated_at"),
    }

    if include_secrets:
        result["api_access_token"] = api_access_token
        result["webhook_secret"] = webhook_secret
        result["website_hmac_secret"] = website_hmac_secret

    return result


def get_whatsapp_config(mongo_db=None, include_secrets: bool = False) -> dict:
    """Resolve WhatsApp Cloud API configuration dynamically from env vars and persisted system_config."""
    env_provider = (os.getenv("WHATSAPP_PROVIDER") or "meta_cloud_api").strip()
    env_access_token = os.getenv("WHATSAPP_API_ACCESS_TOKEN", "").strip()
    env_phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    env_business_account_id = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "").strip()
    env_webhook_verify_token = os.getenv("WHATSAPP_CLOUD_API_WEBHOOK_VERIFY_TOKEN", "").strip()
    env_webhook_url = os.getenv("WHATSAPP_WEBHOOK_URL", "").strip()
    env_daily_cap = _int("WHATSAPP_PERSONAL_DAILY_CAP", 50)
    env_jitter = (os.getenv("WHATSAPP_TYPING_DELAY_JITTER") or "4500ms - 8200ms").strip()
    env_auto_stop = _bool("WHATSAPP_AUTO_STOP_OPT_OUT", "true")

    db_wa = {}
    if mongo_db is None:
        try:
            from app.db import get_db
            mongo_db = get_db()
        except Exception:
            mongo_db = None

    if mongo_db is not None:
        try:
            conf = mongo_db.system_config.find_one({"_id": "singleton_config"}) or {}
            db_wa = conf.get("whatsapp") or {}
        except Exception:
            db_wa = {}

    cleared = set(db_wa.get("_cleared") or [])

    def _str_field(key: str, env_default: str) -> str:
        if key in db_wa and db_wa[key] is not None:
            return str(db_wa[key]).strip()
        return env_default

    def _secret_field(key: str, env_default: str) -> str:
        if key in cleared:
            return ""
        val = db_wa.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
        return env_default

    provider = _str_field("provider", env_provider) or "meta_cloud_api"
    phone_number_id = _str_field("phone_number_id", env_phone_number_id)
    business_account_id = _str_field("business_account_id", env_business_account_id)
    webhook_url = _str_field("webhook_url", env_webhook_url)
    typing_delay_jitter = _str_field("typing_delay_jitter", env_jitter) or "4500ms - 8200ms"

    raw_cap = db_wa.get("personal_daily_cap")
    if raw_cap not in (None, ""):
        try:
            personal_daily_cap = int(raw_cap)
        except (ValueError, TypeError):
            personal_daily_cap = env_daily_cap
    else:
        personal_daily_cap = env_daily_cap

    if "auto_stop_opt_out" in db_wa and db_wa["auto_stop_opt_out"] is not None:
        auto_stop_opt_out = bool(db_wa["auto_stop_opt_out"])
    else:
        auto_stop_opt_out = env_auto_stop

    access_token = _secret_field("access_token", env_access_token)
    webhook_verify_token = _secret_field("webhook_verify_token", env_webhook_verify_token)

    result = {
        "configured": bool(access_token or phone_number_id),
        "provider": provider,
        "phone_number_id": phone_number_id,
        "business_account_id": business_account_id,
        "webhook_url": webhook_url,
        "personal_daily_cap": personal_daily_cap,
        "typing_delay_jitter": typing_delay_jitter,
        "auto_stop_opt_out": auto_stop_opt_out,
        "has_access_token": bool(access_token),
        "masked_access_token": _mask_secret(access_token),
        "has_webhook_verify_token": bool(webhook_verify_token),
        "masked_webhook_verify_token": _mask_secret(webhook_verify_token),
        "updated_at": db_wa.get("updated_at"),
    }

    if include_secrets:
        result["access_token"] = access_token
        result["webhook_verify_token"] = webhook_verify_token

    return result


class Config:
    USER_AGENT = os.getenv("USER_AGENT", "RiceTradeResearchBot/1.0 (+http://localhost/compliance; B2B-Agri-Trade-Research)")
    REQUEST_DELAY_SECONDS = float(os.getenv("REQUEST_DELAY_SECONDS", "3.5"))
    MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", "2"))
    TIMEOUT_SECONDS = float(os.getenv("TIMEOUT_SECONDS", "25"))
    RESPECT_ROBOTS_TXT = _bool("RESPECT_ROBOTS_TXT", "true")
    CRAWL_COMPANY_WEBSITES = _bool("CRAWL_COMPANY_WEBSITES", "true")
    VALIDATE_EMAIL_MX = _bool("VALIDATE_EMAIL_MX", "false")

    GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
    FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///rice_leads.db")

    TARGET_HS_CODES = _csv_list(
        "TARGET_HS_CODES",
        "10063019,10063011,10063099,10063091,10064000,10063010,100630",
    )
    EXCLUDE_HS_CODES = _csv_list("EXCLUDE_HS_CODES", "10063012,10063020")
    POSITIVE_RICE_KEYWORDS = _csv_list(
        "POSITIVE_RICE_KEYWORDS",
        "parboiled,ir64,ir-64,ir 64,non-basmati,non basmati,swarna,miniket,minikit,ratna,sona masoori,ponni,matta,gobindobhog,banskathi,lalat,broken rice,long grain,medium grain,foodstuff,grains,rice",
    )
    STRICT_NO_BASMATI = _bool("STRICT_NO_BASMATI", "true")
    BASMATI_ONLY_TERMS = _csv_list(
        "BASMATI_ONLY_TERMS",
        "only basmati,pure basmati,1121 basmati only,pusa basmati only",
    )

    TARGET_IMPORTER_COUNTRIES = _csv_list(
        "TARGET_IMPORTER_COUNTRIES",
        "United Arab Emirates,Saudi Arabia,Qatar,Oman,Kuwait,Bahrain",
    )
    TARGET_IMPORTER_CITIES = _csv_list(
        "TARGET_IMPORTER_CITIES",
        "Al Ras Dubai,Deira Dubai,Dubai Investment Park,Sharjah,Abu Dhabi,Riyadh,Jeddah,Dammam,Doha,Muscat,Kuwait City,Manama",
    )

    TARGET_MILL_STATE = os.getenv("TARGET_MILL_STATE", "West Bengal")
    TARGET_MILL_DISTRICTS = _csv_list(
        "TARGET_MILL_DISTRICTS",
        "Purba Bardhaman,Burdwan,Bardhaman,Hooghly,Birbhum,Bankura,Nadia,Paschim Medinipur,Purba Medinipur,Murshidabad,Malda,Dakshin Dinajpur,Jalpaiguri,North 24 Parganas,Howrah,Kolkata",
    )
    MILL_NEGATIVE_KEYWORDS = _csv_list(
        "MILL_NEGATIVE_KEYWORDS",
        "machinery,machine,pulverizer,blower,cyclone,sprocket,pulley,screen,jaali,roller,belt,software,mistri,repair,hardware",
    )

    APEDA_SAUDI_PDF_URL = os.getenv("APEDA_SAUDI_PDF_URL", "")
    APEDA_GULFFOOD_PDF_URL = os.getenv("APEDA_GULFFOOD_PDF_URL", "")
    APEDA_GULFFOOD_2023_PDF_URL = os.getenv("APEDA_GULFFOOD_2023_PDF_URL", "")
    SPICES_BOARD_UAE_PDF_URL = os.getenv("SPICES_BOARD_UAE_PDF_URL", "")
    EXPORTMANDI_UAE_URL = os.getenv("EXPORTMANDI_UAE_URL", "")
    CANNEDFOOD_UAE_URL = os.getenv("CANNEDFOOD_UAE_URL", "")
    WBRMA_BASE_URL = os.getenv("WBRMA_BASE_URL", "")
    WBRMA_MAX_PAGES = int(os.getenv("WBRMA_MAX_PAGES", "31"))
    APEDA_SFDA_MILLS_PDF_URL = os.getenv("APEDA_SFDA_MILLS_PDF_URL", "")

    IMPORTERS_CSV_PATH = os.getenv("IMPORTERS_CSV_PATH", "output/importers_leads.csv")
    WB_MILLS_CSV_PATH = os.getenv("WB_MILLS_CSV_PATH", "output/wb_mills_leads.csv")

    CHATWOOT_ENABLED = _bool("CHATWOOT_ENABLED", "false")
    CHATWOOT_BASE_URL = (os.getenv("CHATWOOT_BASE_URL") or "http://localhost:3001").strip().rstrip("/")
    CHATWOOT_PUBLIC_URL = (os.getenv("CHATWOOT_PUBLIC_URL") or "http://localhost:3001").strip().rstrip("/")
    CHATWOOT_ACCOUNT_ID = (os.getenv("CHATWOOT_ACCOUNT_ID") or "1").strip()
    CHATWOOT_API_ACCESS_TOKEN = os.getenv("CHATWOOT_API_ACCESS_TOKEN", "").strip()
    CHATWOOT_WEBHOOK_SECRET = os.getenv("CHATWOOT_WEBHOOK_SECRET", "").strip()
    CHATWOOT_EMAIL_INBOX_ID = os.getenv("CHATWOOT_EMAIL_INBOX_ID", "").strip()
    CHATWOOT_WHATSAPP_INBOX_ID = os.getenv("CHATWOOT_WHATSAPP_INBOX_ID", "").strip()
    CHATWOOT_WEBSITE_INBOX_ID = os.getenv("CHATWOOT_WEBSITE_INBOX_ID", "").strip()
    CHATWOOT_WEBSITE_TOKEN = os.getenv("CHATWOOT_WEBSITE_TOKEN", "").strip()
    CHATWOOT_WEBSITE_HMAC_SECRET = os.getenv("CHATWOOT_WEBSITE_HMAC_SECRET", "").strip()

    WHATSAPP_PROVIDER = (os.getenv("WHATSAPP_PROVIDER") or "meta_cloud_api").strip()
    WHATSAPP_API_ACCESS_TOKEN = os.getenv("WHATSAPP_API_ACCESS_TOKEN", "").strip()
    WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    WHATSAPP_BUSINESS_ACCOUNT_ID = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "").strip()
    WHATSAPP_CLOUD_API_WEBHOOK_VERIFY_TOKEN = os.getenv("WHATSAPP_CLOUD_API_WEBHOOK_VERIFY_TOKEN", "").strip()
    WHATSAPP_WEBHOOK_URL = os.getenv("WHATSAPP_WEBHOOK_URL", "").strip()
    WHATSAPP_PERSONAL_DAILY_CAP = _int("WHATSAPP_PERSONAL_DAILY_CAP", 50)
    WHATSAPP_TYPING_DELAY_JITTER = (os.getenv("WHATSAPP_TYPING_DELAY_JITTER") or "4500ms - 8200ms").strip()
    WHATSAPP_AUTO_STOP_OPT_OUT = _bool("WHATSAPP_AUTO_STOP_OPT_OUT", "true")

    get_chatwoot_config = staticmethod(get_chatwoot_config)
    get_whatsapp_config = staticmethod(get_whatsapp_config)
