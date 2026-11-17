"""
app/routes/views.py
Web UI view routes for the Flask Lead Engine dashboard.
"""
from flask import Blueprint, render_template
from app.models import Lead, ScrapeJob

views_bp = Blueprint("views", __name__)


@views_bp.route("/")
def dashboard():
    """Main dashboard view."""
    return render_template("index.html")

