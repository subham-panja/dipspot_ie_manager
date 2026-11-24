"""API Blueprint and facade re-exports."""

from flask import Blueprint
from app.tasks import (
    seed_importers,
    seed_wb_mills,
    start_importer_scrape,
    start_wb_mills_scrape,
)
from app.routes.api_helpers import (
    CSV_EXPORT_FIELDS,
    find_mongo_lead,
    parse_sort_param,
    serialize_mongo_lead,
)
from app.routes.api_leads import register_lead_routes
from app.routes.api_export_stats import register_export_stats_routes
from app.routes.api_bulk import register_bulk_routes
from app.routes.api_crawler import register_crawler_routes

api_bp = Blueprint("api", __name__, url_prefix="/api")

register_lead_routes(api_bp)
register_export_stats_routes(api_bp)
register_bulk_routes(api_bp)
register_crawler_routes(api_bp)

__all__ = [
    "api_bp",
    "CSV_EXPORT_FIELDS",
    "serialize_mongo_lead",
    "parse_sort_param",
    "find_mongo_lead",
    "start_importer_scrape",
    "start_wb_mills_scrape",
    "seed_importers",
    "seed_wb_mills",
]
