import os
from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.models import db
from app.models_contacts import ensure_sqlite_lead_columns
from app.db import init_db
from app.routes.api import api_bp
from app.routes.views import views_bp
from app.routes.pipeline import pipeline_bp
from app.routes.campaigns import campaigns_bp
from app.routes.shipments import shipments_bp
from app.routes.intelligence import intelligence_bp
from app.routes.config_routes import config_bp
from app.routes.omnichannel import omnichannel_bp


def create_app(testing: bool = False) -> Flask:
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
    )

    cfg = Config()
    app.config["SECRET_KEY"] = cfg.FLASK_SECRET_KEY
    app.config["SQLALCHEMY_DATABASE_URI"] = cfg.DATABASE_URL
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["TESTING"] = testing

    if testing and os.getenv("DATABASE_URL"):
        app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")

    # Enable CORS for Next.js frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize extensions
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(views_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(pipeline_bp)
    app.register_blueprint(campaigns_bp)
    app.register_blueprint(shipments_bp)
    app.register_blueprint(intelligence_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(omnichannel_bp)

    # Auto-create tables & seed MongoDB
    with app.app_context():
        db.create_all()
        ensure_sqlite_lead_columns(db)
        try:
            init_db()
        except Exception as e:
            app.logger.warning(f"MongoDB init notice: {e}")

    return app
