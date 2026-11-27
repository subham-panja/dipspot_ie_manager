"""Tests for Chatwoot & WhatsApp Compose stack, .env.example, and Config defaults/merging."""
import os
import shutil
import subprocess
from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
COMPOSE_PATH = REPO_ROOT / "docker-compose.yml"
ENV_EXAMPLE_PATH = REPO_ROOT / ".env.example"


def _parse_env_file(path: Path) -> dict:
    parsed = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]
        parsed[key] = value
    return parsed


def _env_list_to_dict(env_items) -> dict:
    result = {}
    if isinstance(env_items, dict):
        return {str(k): "" if v is None else str(v) for k, v in env_items.items()}
    for item in env_items or []:
        text = str(item)
        if "=" in text:
            k, v = text.split("=", 1)
            result[k.strip()] = v.strip()
    return result


@pytest.fixture(autouse=True)
def isolate_chatwoot_and_whatsapp_config(app, monkeypatch):
    """Ensure system_config chatwoot/whatsapp fields and env vars are clean per test."""
    from app.db import get_db

    for key in list(os.environ.keys()):
        if key.startswith("CHATWOOT_") or key.startswith("WHATSAPP_"):
            monkeypatch.delenv(key, raising=False)

    with app.app_context():
        mongo_db = get_db()
        mongo_db.system_config.update_one(
            {"_id": "singleton_config"},
            {"$unset": {"chatwoot": "", "whatsapp": ""}},
        )

    yield

    with app.app_context():
        mongo_db = get_db()
        mongo_db.system_config.update_one(
            {"_id": "singleton_config"},
            {"$unset": {"chatwoot": "", "whatsapp": ""}},
        )


# ============================================================================
# 1. Docker Compose & .env.example Structural Validation
# ============================================================================


def test_docker_compose_chatwoot_services_and_volumes():
    data = yaml.safe_load(COMPOSE_PATH.read_text(encoding="utf-8"))
    assert isinstance(data, dict)
    services = data.get("services", {})

    expected_services = {
        "mongodb",
        "backend",
        "frontend",
        "chatwoot-postgres",
        "chatwoot-redis",
        "chatwoot-web",
        "chatwoot-worker",
    }
    assert expected_services.issubset(set(services.keys()))

    # MongoDB healthcheck + backend depends_on mongodb healthy (without blocking on chatwoot-web)
    assert "healthcheck" in services["mongodb"]
    backend_deps = services["backend"]["depends_on"]
    assert isinstance(backend_deps, dict)
    assert backend_deps["mongodb"]["condition"] == "service_healthy"
    assert "chatwoot-web" not in backend_deps

    # Postgres
    pg = services["chatwoot-postgres"]
    assert pg["image"] == "pgvector/pgvector:pg16"
    assert "healthcheck" in pg
    assert any("pg_isready" in str(x) for x in pg["healthcheck"]["test"])
    assert "chatwoot_postgres_data:/var/lib/postgresql/data" in pg["volumes"]

    # Redis (empty-password safe)
    redis = services["chatwoot-redis"]
    assert redis["image"] == "redis:7-alpine"
    assert "healthcheck" in redis
    cmd_str = " ".join(redis["command"]) if isinstance(redis["command"], list) else str(redis["command"])
    assert "REDIS_PASSWORD" in cmd_str
    assert "redis-server" in cmd_str
    assert "chatwoot_redis_data:/data" in redis["volumes"]

    # Chatwoot Web
    cw_web = services["chatwoot-web"]
    assert "chatwoot/chatwoot:v3.16.0" in cw_web["image"]
    assert cw_web["entrypoint"] == "docker/entrypoints/rails.sh"
    assert cw_web["command"] == ["bundle", "exec", "rails", "s", "-p", "3000", "-b", "0.0.0.0"]
    assert cw_web["ports"] == ["${CHATWOOT_PORT:-3001}:3000"]
    assert services["frontend"]["ports"] == ["3000:3000"]
    assert cw_web["depends_on"]["chatwoot-postgres"]["condition"] == "service_healthy"
    assert cw_web["depends_on"]["chatwoot-redis"]["condition"] == "service_healthy"
    assert "chatwoot_storage:/app/storage" in cw_web["volumes"]
    assert "healthcheck" in cw_web
    assert any("/api" in str(x) for x in cw_web["healthcheck"]["test"])

    # Chatwoot Worker
    cw_worker = services["chatwoot-worker"]
    assert cw_worker["image"] == cw_web["image"]
    assert cw_worker["entrypoint"] == "docker/entrypoints/rails.sh"
    assert cw_worker["command"] == ["bundle", "exec", "sidekiq", "-C", "config/sidekiq.yml"]
    assert cw_worker["depends_on"]["chatwoot-postgres"]["condition"] == "service_healthy"
    assert cw_worker["depends_on"]["chatwoot-redis"]["condition"] == "service_healthy"
    assert "chatwoot_storage:/app/storage" in cw_worker["volumes"]

    # Network & volumes
    for svc_name in expected_services:
        assert "tradepulse_network" in services[svc_name]["networks"]

    volumes = data.get("volumes", {})
    for vol in ("mongo_data", "chatwoot_postgres_data", "chatwoot_redis_data", "chatwoot_storage"):
        assert vol in volumes

    # Backend / Frontend / Chatwoot env passthrough
    backend_env = _env_list_to_dict(services["backend"]["environment"])
    assert backend_env["CHATWOOT_BASE_URL"] == "${CHATWOOT_INTERNAL_URL:-http://chatwoot-web:3000}"
    assert backend_env["CHATWOOT_PUBLIC_URL"] == "${CHATWOOT_PUBLIC_URL:-http://localhost:3001}"
    assert "CHATWOOT_API_ACCESS_TOKEN" in backend_env
    assert "CHATWOOT_WEBHOOK_SECRET" in backend_env
    assert "WHATSAPP_API_ACCESS_TOKEN" in backend_env
    assert "WHATSAPP_CLOUD_API_WEBHOOK_VERIFY_TOKEN" in backend_env

    frontend_env = _env_list_to_dict(services["frontend"]["environment"])
    assert "NEXT_PUBLIC_API_URL" in frontend_env
    assert "NEXT_PUBLIC_CHATWOOT_URL" in frontend_env
    assert "NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN" in frontend_env

    cw_web_env = _env_list_to_dict(cw_web["environment"])
    for k in (
        "SECRET_KEY_BASE",
        "POSTGRES_PASSWORD",
        "REDIS_PASSWORD",
        "MAILER_SENDER_EMAIL",
        "SMTP_ADDRESS",
        "SMTP_PASSWORD",
        "WHATSAPP_APP_ID",
        "WHATSAPP_APP_SECRET",
    ):
        assert k in cw_web_env


def test_docker_compose_and_env_example_have_no_hardcoded_secrets():
    data = yaml.safe_load(COMPOSE_PATH.read_text(encoding="utf-8"))
    secret_substrings = (
        "SECRET_KEY_BASE",
        "POSTGRES_PASSWORD",
        "REDIS_PASSWORD",
        "SMTP_PASSWORD",
        "IMAP_PASSWORD",
        "API_ACCESS_TOKEN",
        "WEBHOOK_SECRET",
        "HMAC_SECRET",
        "APP_SECRET",
        "VERIFY_TOKEN",
    )

    for svc_name, svc in data["services"].items():
        env_map = _env_list_to_dict(svc.get("environment"))
        for k, v in env_map.items():
            if any(s in k for s in secret_substrings):
                assert v.startswith("${") and v.endswith(":-}"), (
                    f"{svc_name}.{k} must use empty-default interpolation, got: {v!r}"
                )

    env_vars = _parse_env_file(ENV_EXAMPLE_PATH)
    for k, v in env_vars.items():
        if any(s in k for s in secret_substrings):
            assert v == "", f".env.example {k} must have empty placeholder, got: {v!r}"


def test_env_example_contains_all_required_chatwoot_and_channel_vars():
    env_vars = _parse_env_file(ENV_EXAMPLE_PATH)
    required_keys = [
        # Core & Postgres/Redis
        "CHATWOOT_IMAGE",
        "CHATWOOT_PORT",
        "CHATWOOT_FRONTEND_URL",
        "CHATWOOT_SECRET_KEY_BASE",
        "CHATWOOT_POSTGRES_DB",
        "CHATWOOT_POSTGRES_USER",
        "CHATWOOT_POSTGRES_PASSWORD",
        "CHATWOOT_REDIS_URL",
        "CHATWOOT_REDIS_PASSWORD",
        "CHATWOOT_ENABLE_ACCOUNT_SIGNUP",
        # Mailer / Email
        "CHATWOOT_MAILER_SENDER_EMAIL",
        "CHATWOOT_SMTP_ADDRESS",
        "CHATWOOT_SMTP_PORT",
        "CHATWOOT_SMTP_USERNAME",
        "CHATWOOT_SMTP_PASSWORD",
        "CHATWOOT_SMTP_DOMAIN",
        "CHATWOOT_SMTP_ENABLE_STARTTLS_AUTO",
        "CHATWOOT_IMAP_ADDRESS",
        "CHATWOOT_IMAP_PORT",
        "CHATWOOT_IMAP_EMAIL",
        "CHATWOOT_IMAP_PASSWORD",
        # WhatsApp
        "WHATSAPP_APP_ID",
        "WHATSAPP_APP_SECRET",
        "WHATSAPP_CONFIGURATION_ID",
        "WHATSAPP_API_VERSION",
        "WHATSAPP_CLOUD_API_WEBHOOK_VERIFY_TOKEN",
        "WHATSAPP_PHONE_NUMBER_ID",
        "WHATSAPP_BUSINESS_ACCOUNT_ID",
        "WHATSAPP_API_ACCESS_TOKEN",
        # Bridge & Website
        "CHATWOOT_ENABLED",
        "CHATWOOT_BASE_URL",
        "CHATWOOT_INTERNAL_URL",
        "CHATWOOT_PUBLIC_URL",
        "CHATWOOT_ACCOUNT_ID",
        "CHATWOOT_API_ACCESS_TOKEN",
        "CHATWOOT_WEBHOOK_SECRET",
        "CHATWOOT_EMAIL_INBOX_ID",
        "CHATWOOT_WHATSAPP_INBOX_ID",
        "CHATWOOT_WEBSITE_INBOX_ID",
        "CHATWOOT_WEBSITE_TOKEN",
        "CHATWOOT_WEBSITE_HMAC_SECRET",
        # Frontend
        "NEXT_PUBLIC_API_URL",
        "NEXT_PUBLIC_CHATWOOT_URL",
        "NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN",
    ]
    missing = [k for k in required_keys if k not in env_vars]
    assert not missing, f"Missing keys in .env.example: {missing}"


def test_docker_compose_cli_config_if_available():
    if shutil.which("docker") is None:
        pytest.skip("docker CLI not installed in test environment")
    proc = subprocess.run(
        ["docker", "compose", "-f", str(COMPOSE_PATH), "config", "-q"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"docker compose config failed: {proc.stderr}"


# ============================================================================
# 2. Config & Dynamic Env + DB Merging
# ============================================================================


def test_config_class_attributes_and_mask_helper():
    from app.config import Config, _mask_secret

    assert Config.CHATWOOT_BASE_URL == "http://localhost:3001"
    assert Config.CHATWOOT_PUBLIC_URL == "http://localhost:3001"
    assert Config.CHATWOOT_ACCOUNT_ID == "1"
    assert Config.CHATWOOT_API_ACCESS_TOKEN == ""
    assert Config.WHATSAPP_API_ACCESS_TOKEN == ""

    assert _mask_secret("") == ""
    assert _mask_secret("short123") == "••••••••••••••••"
    assert _mask_secret("cw_live_token_9876543210") == "••••••••3210"


def test_get_chatwoot_config_defaults_and_env_merge(app, monkeypatch):
    from app.config import Config, get_chatwoot_config

    with app.app_context():
        default_cfg = get_chatwoot_config()
        assert default_cfg["configured"] is False
        assert default_cfg["enabled"] is False
        assert default_cfg["base_url"] == "http://localhost:3001"
        assert default_cfg["public_url"] == "http://localhost:3001"
        assert default_cfg["account_id"] == "1"
        assert "api_access_token" not in default_cfg

        monkeypatch.setenv("CHATWOOT_BASE_URL", "http://chatwoot-web:3000/")
        monkeypatch.setenv("CHATWOOT_PUBLIC_URL", "https://chat.example.com/")
        monkeypatch.setenv("CHATWOOT_ACCOUNT_ID", "7")
        monkeypatch.setenv("CHATWOOT_API_ACCESS_TOKEN", "env_secret_token_4321")
        monkeypatch.setenv("CHATWOOT_EMAIL_INBOX_ID", "11")
        monkeypatch.setenv("CHATWOOT_WEBSITE_TOKEN", "site_tok_abc")

        masked_cfg = Config.get_chatwoot_config(include_secrets=False)
        assert masked_cfg["configured"] is True
        assert masked_cfg["enabled"] is True
        assert masked_cfg["base_url"] == "http://chatwoot-web:3000"
        assert masked_cfg["public_url"] == "https://chat.example.com"
        assert masked_cfg["account_id"] == "7"
        assert masked_cfg["has_api_token"] is True
        assert masked_cfg["masked_api_token"] == "••••••••4321"
        assert masked_cfg["channels"] == {"email": True, "whatsapp": False, "website": True}
        assert "api_access_token" not in masked_cfg

        raw_cfg = Config.get_chatwoot_config(include_secrets=True)
        assert raw_cfg["api_access_token"] == "env_secret_token_4321"


def test_get_whatsapp_config_defaults_and_env_merge(app, monkeypatch):
    from app.config import Config, get_whatsapp_config

    with app.app_context():
        default_cfg = get_whatsapp_config()
        assert default_cfg["configured"] is False
        assert default_cfg["has_access_token"] is False
        assert default_cfg["masked_access_token"] == ""
        assert default_cfg["personal_daily_cap"] == 50

        monkeypatch.setenv("WHATSAPP_API_ACCESS_TOKEN", "meta_live_token_9988")
        monkeypatch.setenv("WHATSAPP_PHONE_NUMBER_ID", "55500112233")
        monkeypatch.setenv("WHATSAPP_CLOUD_API_WEBHOOK_VERIFY_TOKEN", "verify_tok_7766")

        masked_cfg = Config.get_whatsapp_config(include_secrets=False)
        assert masked_cfg["configured"] is True
        assert masked_cfg["has_access_token"] is True
        assert masked_cfg["masked_access_token"] == "••••••••9988"
        assert masked_cfg["has_webhook_verify_token"] is True
        assert masked_cfg["masked_webhook_verify_token"] == "••••••••7766"
        assert "access_token" not in masked_cfg
        assert "webhook_verify_token" not in masked_cfg
