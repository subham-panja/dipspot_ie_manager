"""Isolated E2E pytest configuration, fixtures, and local test servers."""

import json
import os
import socket
import subprocess
import threading
import urllib.parse
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest
import requests
from werkzeug.serving import make_server

E2E_EXTRA_COLLECTIONS = [
    "contacts",
    "company_contacts",
    "campaign_enrollments",
    "lead_notes",
    "lead_timeline",
    "omnichannel_messages",
    "cadence_enrollments",
]

REPO_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIR = REPO_ROOT / "frontend"
CHROME_PATH = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

DEFAULT_SERP_PROFILES = [
    {
        "name": "Hassan Al Rashid",
        "title": "Procurement Director",
        "company": "Al Fazal Rice Trading LLC",
        "url": "https://www.linkedin.com/in/hassan-al-rashid-ae",
        "snippet": "Procurement Director at Al Fazal Rice Trading LLC in Dubai, UAE.",
    },
    {
        "name": "Priya Nair",
        "title": "Import Manager",
        "company": "Al Fazal Rice Trading LLC",
        "url": "https://www.linkedin.com/in/priya-nair-dubai",
        "snippet": "Import Manager at Al Fazal Rice Trading LLC handling rice shipments.",
    },
]


@pytest.fixture(autouse=True)
def clean_e2e_db(clean_db, app):
    """Compose with parent clean_db to clear all new M1/M2 collections before each E2E test."""
    from app.db import get_db

    with app.app_context():
        mongo_db = get_db()
        for col in E2E_EXTRA_COLLECTIONS:
            mongo_db[col].delete_many({})
    yield


@pytest.fixture(scope="session")
def live_api_url(app):
    """Run an isolated WSGI server bound to 127.0.0.1:0 against the testing Flask app."""
    server = make_server("127.0.0.1", 0, app, threaded=True)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()


def _build_bing_html(profiles):
    items = []
    for p in profiles:
        items.append(
            f'<li class="b_algo"><h2><a href="{p["url"]}">'
            f'{p["name"]} - {p["title"]} at {p["company"]} | LinkedIn</a></h2>'
            f'<div class="b_caption"><p>{p["snippet"]}</p></div></li>'
        )
    return f"<html><body><ol id='b_results'>{''.join(items)}</ol></body></html>"


def _build_ddg_html(profiles):
    items = []
    for p in profiles:
        encoded = urllib.parse.quote(p["url"], safe="")
        items.append(
            f'<div class="result results_links">'
            f'<a class="result__title" href="//duckduckgo.com/l/?uddg={encoded}">'
            f'{p["name"]} - {p["title"]} at {p["company"]} | LinkedIn</a>'
            f'<a class="result__snippet" href="//duckduckgo.com/l/?uddg={encoded}">{p["snippet"]}</a>'
            f"</div>"
        )
    return f"<html><body>{''.join(items)}</body></html>"


def _build_google_html(profiles):
    items = []
    for p in profiles:
        items.append(
            f'<div class="g"><a href="{p["url"]}">'
            f'<h3>{p["name"]} - {p["title"]} - {p["company"]} | LinkedIn</h3></a>'
            f'<div class="VwiC3b">{p["snippet"]}</div></div>'
        )
    return f"<html><body><div id='search'>{''.join(items)}</div></body></html>"


def _build_non_profile_html(engine: str) -> str:
    links = [
        ("Al Fazal | LinkedIn", "https://www.linkedin.com/company/al-fazal"),
        ("Buyer Job | LinkedIn", "https://www.linkedin.com/jobs/view/12345"),
        ("Directory | LinkedIn", "https://www.linkedin.com/dir/people/al-fazal"),
        ("Pulse | LinkedIn", "https://www.linkedin.com/pulse/rice-trade-2026"),
    ]
    if engine == "google":
        items = "".join(f'<div class="g"><a href="{u}"><h3>{t}</h3></a></div>' for t, u in links)
        return f"<html><body><div id='search'>{items}</div></body></html>"
    if engine == "duckduckgo":
        items = "".join(
            f'<div class="result results_links"><a class="result__title" href="{u}">{t}</a></div>'
            for t, u in links
        )
        return f"<html><body>{items}</body></html>"
    items = "".join(f'<li class="b_algo"><h2><a href="{u}">{t}</a></h2></li>' for t, u in links)
    return f"<html><body><ol id='b_results'>{items}</ol></body></html>"


def _build_many_profiles(count: int = 25):
    return [
        {
            "name": f"Trade Buyer {i}",
            "title": "Import Manager",
            "company": "Clamped Results Co",
            "url": f"https://www.linkedin.com/in/trade-buyer-{i}",
            "snippet": f"Import Manager at Clamped Results Co ({i}).",
        }
        for i in range(1, count + 1)
    ]


class SerpTestServer:
    """Ephemeral local HTTP SERP server for zero-mock X-Ray transport testing."""

    def __init__(self):
        self.mode = "bing_valid"
        self.profiles = list(DEFAULT_SERP_PROFILES)
        self.requests_received = []
        parent = self

        class _Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                parent.requests_received.append(self.path)
                mode = parent.mode
                if mode == "rate_limited_429":
                    body = b"<html><body><h1>429 Too Many Requests - Captcha Required</h1></body></html>"
                    self.send_response(429)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return
                if mode == "unavailable_503":
                    body = b"<html><body>Service Temporarily Unavailable</body></html>"
                    self.send_response(503)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return

                qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
                engine = (qs.get("engine") or [""])[0].lower()
                if engine == "ddg":
                    engine = "duckduckgo"

                empty_html = "<html><body><div id='results'>No results found.</div></body></html>"
                if mode == "non_profile_urls":
                    html = _build_non_profile_html(engine)
                elif mode == "empty_serp":
                    html = empty_html
                elif mode == "many_profiles":
                    many = _build_many_profiles(25)
                    if engine == "google":
                        html = _build_google_html(many)
                    elif engine == "duckduckgo":
                        html = _build_ddg_html(many)
                    else:
                        html = _build_bing_html(many)
                elif mode in ("bing_valid", "bing_only"):
                    html = _build_bing_html(parent.profiles) if engine == "bing" else empty_html
                elif mode in ("google_valid", "google_only"):
                    html = _build_google_html(parent.profiles) if engine == "google" else empty_html
                elif mode in ("ddg_valid", "ddg_only"):
                    html = _build_ddg_html(parent.profiles) if engine == "duckduckgo" else empty_html
                elif mode == "all_valid":
                    if engine == "bing":
                        html = _build_bing_html(parent.profiles)
                    elif engine == "google":
                        html = _build_google_html(parent.profiles)
                    elif engine == "duckduckgo":
                        html = _build_ddg_html(parent.profiles)
                    else:
                        html = empty_html
                else:
                    html = empty_html

                body = html.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def do_POST(self):
                length = int(self.headers.get("Content-Length") or 0)
                if length > 0:
                    self.rfile.read(length)
                self.do_GET()

            def log_message(self, format, *args):
                return

        self._httpd = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
        self.port = self._httpd.server_address[1]
        self._thread = threading.Thread(target=self._httpd.serve_forever, daemon=True)
        self._thread.start()

    def close(self):
        self._httpd.shutdown()
        self._httpd.server_close()

    def route_search_engines(self, monkeypatch, closed_port: bool = False):
        """Rewrite outbound search-engine host URLs only to hit this local SERP server (or a closed port)."""
        target_port = self.port
        if closed_port:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.bind(("127.0.0.1", 0))
                target_port = sock.getsockname()[1]

        orig_request = requests.sessions.Session.request
        serp_hosts = {
            "www.bing.com": "bing",
            "bing.com": "bing",
            "www.google.com": "google",
            "google.com": "google",
            "html.duckduckgo.com": "duckduckgo",
            "duckduckgo.com": "duckduckgo",
        }

        def _routed_request(session_self, method, url, *args, **kwargs):
            parsed = urllib.parse.urlparse(str(url))
            host = (parsed.hostname or "").lower()
            if host in ("127.0.0.1", "localhost", "::1"):
                return orig_request(session_self, method, url, *args, **kwargs)
            if host in serp_hosts:
                engine = serp_hosts[host]
                sep = "&" if parsed.query else ""
                new_url = f"http://127.0.0.1:{target_port}/serp?{parsed.query}{sep}engine={engine}"
                kwargs.pop("proxies", None)
                return orig_request(session_self, method, new_url, *args, **kwargs)
            return orig_request(session_self, method, url, *args, **kwargs)

        monkeypatch.setattr(requests.sessions.Session, "request", _routed_request)


@pytest.fixture
def serp_server():
    """Provide an ephemeral local SERP HTTP server cleaned up after each test."""
    srv = SerpTestServer()
    yield srv
    srv.close()


@pytest.fixture(scope="session")
def frontend_base_url():
    """Return http://localhost:3000 when the TradePulse EXIM Next.js server is reachable, else None."""
    base = os.environ.get("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
    try:
        resp = requests.get(f"{base}/leads/importers", timeout=2.0)
        if resp.status_code == 200 and "TradePulse" in resp.text:
            return base
    except Exception:
        pass
    return None


@pytest.fixture(scope="session")
def frontend_tsc_result():
    """Run TypeScript compiler check once per session in frontend/."""
    proc = subprocess.run(
        ["npx", "tsc", "--noEmit"],
        cwd=str(FRONTEND_DIR),
        capture_output=True,
        text=True,
        timeout=90,
    )
    return proc.returncode, (proc.stdout or "") + (proc.stderr or "")


@pytest.fixture(scope="session")
def chrome_binary():
    """Return local Google Chrome executable path if present."""
    if CHROME_PATH.exists() and os.access(CHROME_PATH, os.X_OK):
        return str(CHROME_PATH)
    return None


@pytest.fixture
def create_lead(client):
    """Factory fixture creating a lead via POST /api/leads."""
    def _create(**overrides):
        payload = {
            "company_name": "Al Fazal Rice Trading LLC",
            "country": "United Arab Emirates",
            "city_or_hub": "Dubai",
            "contact_person": "Tariq Al Mansoori",
            "phones": "+971501234567",
            "emails": "tariq@alfazalrice.ae",
            "website": "https://alfazalrice.ae",
            "matched_varieties": "1121 Basmati; IR-64 Parboiled",
            "priority_score": 88,
            "lead_type": "importer",
        }
        if overrides.get("contact_person") == "":
            payload["emails"] = ""
            payload["phones"] = ""
        payload.update(overrides)
        resp = client.post("/api/leads", data=json.dumps(payload), content_type="application/json")
        assert resp.status_code == 201, resp.get_data(as_text=True)
        return resp.get_json()["lead"]
    return _create


@pytest.fixture
def create_campaign(client):
    """Factory fixture creating a campaign via POST /api/campaigns."""
    def _create(**overrides):
        payload = {
            "name": "GCC Basmati Outreach Q4",
            "channel": "Email",
            "status": "Active",
            "target_commodity": "1121 Basmati",
            "target_countries": ["United Arab Emirates", "Saudi Arabia"],
        }
        payload.update(overrides)
        resp = client.post("/api/campaigns", data=json.dumps(payload), content_type="application/json")
        assert resp.status_code == 201, resp.get_data(as_text=True)
        return resp.get_json()["campaign"]
    return _create


@pytest.fixture
def create_contact(client):
    """Factory fixture creating a contact via POST /api/contacts."""
    counter = {"n": 0}

    def _create(**overrides):
        counter["n"] += 1
        uid = f"{counter['n']}-{uuid.uuid4().hex[:6]}"
        payload = {
            "full_name": f"Tariq Al Mansoori {counter['n']}",
            "job_title": "Procurement Director",
            "email": f"tariq.{uid}@alfazalrice.ae",
            "phone": "+971501234567",
            "linkedin_profile_url": f"https://www.linkedin.com/in/tariq-al-mansoori-{uid}",
            "source": "manual",
        }
        payload.update(overrides)
        resp = client.post("/api/contacts", data=json.dumps(payload), content_type="application/json")
        assert resp.status_code in (200, 201), resp.get_data(as_text=True)
        return resp.get_json()["contact"]
    return _create
