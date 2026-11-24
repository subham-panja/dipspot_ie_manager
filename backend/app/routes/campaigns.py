"""Campaigns blueprint facade registering modular campaign routes."""

from flask import Blueprint
from app.routes.campaign_templates_data import DEFAULT_SEGMENTS, DEFAULT_TEMPLATES
from app.routes.campaign_segments import (
    serialize_doc,
    build_segment_mongo_query,
    register_segment_routes,
)
from app.routes.campaign_execution import register_campaign_execution_routes
from app.routes.campaign_templates import register_campaign_template_routes
from app.routes.campaign_safety import register_campaign_safety_routes

campaigns_bp = Blueprint("campaigns", __name__, url_prefix="/api/campaigns")

register_segment_routes(campaigns_bp)
register_campaign_execution_routes(campaigns_bp)
register_campaign_template_routes(campaigns_bp)
register_campaign_safety_routes(campaigns_bp)

__all__ = [
    "campaigns_bp",
    "serialize_doc",
    "build_segment_mongo_query",
    "DEFAULT_SEGMENTS",
    "DEFAULT_TEMPLATES",
]
