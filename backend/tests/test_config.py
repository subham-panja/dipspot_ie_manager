"""Tests for app.config — Configuration management."""
import os
import pytest


class TestConfig:
    """Test the Config class loads .env and provides correct defaults."""

    def test_config_loads_user_agent(self):
        from app.config import Config
        cfg = Config()
        assert "RiceTradeResearchBot" in cfg.USER_AGENT or cfg.USER_AGENT != ""

    def test_config_request_delay_is_float(self):
        from app.config import Config
        cfg = Config()
        assert isinstance(cfg.REQUEST_DELAY_SECONDS, float)

    def test_config_target_hs_codes_list(self):
        from app.config import Config
        cfg = Config()
        assert isinstance(cfg.TARGET_HS_CODES, list)
        assert "10063019" in cfg.TARGET_HS_CODES

    def test_config_exclude_hs_codes_list(self):
        from app.config import Config
        cfg = Config()
        assert isinstance(cfg.EXCLUDE_HS_CODES, list)
        assert "10063012" in cfg.EXCLUDE_HS_CODES

    def test_config_positive_keywords_list(self):
        from app.config import Config
        cfg = Config()
        assert isinstance(cfg.POSITIVE_RICE_KEYWORDS, list)
        assert "parboiled" in cfg.POSITIVE_RICE_KEYWORDS
        assert "ir64" in cfg.POSITIVE_RICE_KEYWORDS

    def test_config_target_countries_list(self):
        from app.config import Config
        cfg = Config()
        assert isinstance(cfg.TARGET_IMPORTER_COUNTRIES, list)
        assert "United Arab Emirates" in cfg.TARGET_IMPORTER_COUNTRIES

    def test_config_target_mill_districts_list(self):
        from app.config import Config
        cfg = Config()
        assert isinstance(cfg.TARGET_MILL_DISTRICTS, list)
        assert any("Bardhaman" in d or "Burdwan" in d for d in cfg.TARGET_MILL_DISTRICTS)

    def test_config_mill_negative_keywords_list(self):
        from app.config import Config
        cfg = Config()
        assert isinstance(cfg.MILL_NEGATIVE_KEYWORDS, list)
        assert "machinery" in cfg.MILL_NEGATIVE_KEYWORDS
        assert "blower" in cfg.MILL_NEGATIVE_KEYWORDS

    def test_config_strict_no_basmati_bool(self):
        from app.config import Config
        cfg = Config()
        assert isinstance(cfg.STRICT_NO_BASMATI, bool)

    def test_config_flask_secret_key(self):
        from app.config import Config
        cfg = Config()
        assert cfg.FLASK_SECRET_KEY is not None
        assert len(cfg.FLASK_SECRET_KEY) > 0

    def test_config_database_url(self):
        from app.config import Config
        cfg = Config()
        assert cfg.DATABASE_URL is not None
        assert "sqlite" in cfg.DATABASE_URL

