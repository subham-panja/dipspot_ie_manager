import os
from dotenv import load_dotenv

load_dotenv()


def _csv_list(key: str, default: str = "") -> list:
    raw = os.getenv(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _bool(key: str, default: str = "true") -> bool:
    return os.getenv(key, default).lower().strip() in ("true", "1", "yes")


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
