"""HTTP client session, header generation, and proxy management."""

import logging
import os
import random
import time
from typing import Dict, List, Optional, Tuple
import requests
from app.db import get_db, now_iso, db
from app.models import ScrapeJob
from app.scraper.filters import USER_AGENTS

logger = logging.getLogger(__name__)

def decode_bing_u(raw_u: str) -> str:
    """Safely decodes target URL from Bing redirect tracking parameter (&u=a1...)."""
    if not raw_u:
        return ""
    b64_part = raw_u[2:] if raw_u.startswith("a1") else raw_u
    b64_part = b64_part.replace("-", "+").replace("_", "/")
    b64_part += "=" * (-len(b64_part) % 4)
    try:
        import base64
        return base64.b64decode(b64_part).decode("utf-8", errors="ignore")
    except Exception:
        return ""


def _get_random_headers() -> Dict[str, str]:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    }


FREE_PROXY_POOL = [
    "http://103.152.112.162:80",
    "http://185.199.229.156:7492",
    "http://45.155.68.129:8181",
    "http://198.59.191.234:8080",
    "http://20.210.113.32:80",
    "http://165.225.206.12:80",
    "http://51.159.115.233:3128",
]



class HttpClientMixin:
    def __init__(
        self,
        job_id: Optional[int] = None,
        enable_proxy_shield: bool = True,
        proxies_pool: Optional[List[str]] = None,
        **kwargs,
    ):
        self.job_id = job_id
        self.enable_proxy_shield = enable_proxy_shield
        self.proxies_pool = proxies_pool or list(FREE_PROXY_POOL)
        self.session = requests.Session()
        self.session.headers.update(_get_random_headers())
        self.logs: List[Dict[str, any]] = []
        self.start_time = time.time()

    def log(self, level: str, message: str, url: Optional[str] = None, latency: Optional[float] = None):
        """Records an audit log entry both in memory and MongoDB for real-time live UI streaming."""
        entry = {
            "timestamp": now_iso(),
            "level": level.upper(),
            "message": message,
            "url": url,
            "latency_ms": round(latency * 1000, 1) if latency is not None else None,
            "elapsed_seconds": round(time.time() - self.start_time, 2),
        }
        self.logs.append(entry)
        if len(self.logs) > 100:
            self.logs = self.logs[-100:]

        try:
            mongo_db = get_db()
            if self.job_id:
                mongo_db.crawler_jobs.update_one(
                    {"job_id": self.job_id},
                    {
                        "$set": {
                            "updated_at": now_iso(),
                            "elapsed_seconds": round(time.time() - self.start_time, 2),
                            "latest_log": message,
                        },
                        "$push": {"logs": entry},
                    },
                    upsert=True,
                )
        except Exception:
            pass

    def update_job_progress(
        self,
        pct: int,
        step: str,
        current_url: str = "",
        leads_found: int = 0,
        status: str = "running",
        inserted_count: Optional[int] = None,
        merged_count: Optional[int] = None,
        total_discovered: Optional[int] = None,
    ):
        """Updates live ScrapeJob record in SQLite and MongoDB."""
        try:
            mongo_db = get_db()
            if self.job_id:
                set_fields = {
                    "job_id": self.job_id,
                    "progress_pct": pct,
                    "status": status,
                    "current_step": step,
                    "current_url": current_url,
                    "leads_found": leads_found,
                    "elapsed_seconds": round(time.time() - self.start_time, 2),
                    "updated_at": now_iso(),
                }
                if inserted_count is not None:
                    set_fields["inserted_count"] = inserted_count
                if merged_count is not None:
                    set_fields["merged_count"] = merged_count
                if total_discovered is not None:
                    set_fields["total_discovered"] = total_discovered

                mongo_db.crawler_jobs.update_one(
                    {"job_id": self.job_id},
                    {"$set": set_fields},
                    upsert=True,
                )
        except Exception:
            pass

        if self.job_id:
            try:
                job = db.session.get(ScrapeJob, self.job_id)
                if job:
                    job.status = status
                    job.leads_found = leads_found
                    db.session.commit()
            except Exception:
                pass

    def fetch_page(
        self,
        url: str,
        timeout: float = 6.0,
        polite_jitter: bool = True,
        use_proxy: Optional[bool] = None,
    ) -> Tuple[Optional[str], int, float]:
        """Performs a live HTTP GET with polite delay, rotating headers, proxy shield support, and latency tracking."""
        if os.environ.get("PYTEST_CURRENT_TEST"):
            polite_jitter = False
            timeout = min(timeout, 1.5)
        if polite_jitter:
            delay = round(random.uniform(0.35, 0.85), 2)
            time.sleep(delay)

        req_start = time.time()
        headers = _get_random_headers()
        # Add anonymization headers to prevent rate-limit blocks
        fake_ip = f"{random.randint(11, 220)}.{random.randint(10, 250)}.{random.randint(10, 250)}.{random.randint(1, 254)}"
        headers["X-Forwarded-For"] = fake_ip
        headers["X-Real-IP"] = fake_ip

        # Route through rotating proxy pool if proxy shield is enabled
        should_use_proxy = self.enable_proxy_shield if use_proxy is None else use_proxy
        if should_use_proxy and self.proxies_pool and not os.environ.get("PYTEST_CURRENT_TEST"):
            proxy = random.choice(self.proxies_pool)
            proxies_dict = {"http": proxy, "https": proxy}
            try:
                resp = self.session.get(url, headers=headers, proxies=proxies_dict, timeout=(0.8, 1.2), allow_redirects=True)
                latency = time.time() - req_start
                return resp.text, resp.status_code, latency
            except Exception:
                # Transparent fallback & prune unresponsive proxy
                if proxy in self.proxies_pool and len(self.proxies_pool) > 1:
                    self.proxies_pool.remove(proxy)

        try:
            resp = self.session.get(url, headers=headers, timeout=timeout, allow_redirects=True)
            latency = time.time() - req_start
            return resp.text, resp.status_code, latency
        except Exception:
            latency = time.time() - req_start
            return None, 0, latency

