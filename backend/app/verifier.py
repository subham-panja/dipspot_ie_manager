"""
Network, DNS, and authenticity verification engine.

Verifies domains resolve via DNS and HTTP reachability, checking for valid trade emails.
"""

import logging
import re
import socket
import urllib.parse
from typing import Dict, List, Optional, Set, Tuple, Union

import requests

logger = logging.getLogger(__name__)

# In-memory thread-safe DNS cache to minimize latency during harvesting
_DNS_CACHE: Dict[str, bool] = {}

# Known synthetic or disposable domain patterns
SYNTHETIC_DOMAIN_PATTERNS = [
    re.compile(r"^[a-z0-9]+-[0-9]{3,6}\.com$", re.I),
    re.compile(r"^[a-z0-9]{3,12}-trade\.com$", re.I),
    re.compile(r"^[a-z0-9\-]+-trade\.[a-z]{2,}$", re.I),
    re.compile(r"^[a-z0-9\-]+-producers\.[a-z]{2,}$", re.I),
    re.compile(r"^(test|fake|dummy|sample|example|mock)[a-z0-9\-]*\.[a-z]{2,}$", re.I),
]

DISALLOWED_TLDS = {".local", ".test", ".invalid", ".localhost", ".internal", ".example"}


def extract_domain(url_or_domain: str) -> str:
    """Extracts a clean, normalized domain name (without protocol, path, port, or www)."""
    if not url_or_domain:
        return ""
    raw = str(url_or_domain).strip()
    if "://" not in raw:
        raw = "http://" + raw
    try:
        parsed = urllib.parse.urlparse(raw)
        host = (parsed.netloc or parsed.path).split("/")[0].split(":")[0].strip().lower()
        if host.startswith("www."):
            host = host[4:]
        return host
    except Exception:
        return ""


def is_synthetic_domain_format(domain: str) -> bool:
    """Detects whether a domain matches known synthetic slug generation patterns."""
    if not domain:
        return True
    d_clean = domain.lower().strip()
    for pattern in SYNTHETIC_DOMAIN_PATTERNS:
        if pattern.match(d_clean):
            return True
    for tld in DISALLOWED_TLDS:
        if d_clean.endswith(tld):
            return True
    return False


def is_domain_live(domain_or_url: str, timeout: float = 2.0) -> bool:
    """
    Checks if a domain resolves to a real IP address via DNS.
    Results are cached in-memory for lightning-fast subsequent lookups.
    """
    domain = extract_domain(domain_or_url)
    if not domain or "." not in domain or len(domain) < 4:
        return False

    if is_synthetic_domain_format(domain):
        return False

    if domain in _DNS_CACHE:
        return _DNS_CACHE[domain]

    # Attempt DNS resolution
    resolved = False
    old_timeout = socket.getdefaulttimeout()
    try:
        socket.setdefaulttimeout(timeout)
        # Try both direct and www prefixes
        try:
            socket.gethostbyname(domain)
            resolved = True
        except (socket.gaierror, socket.timeout, OSError):
            try:
                socket.gethostbyname(f"www.{domain}")
                resolved = True
            except Exception:
                resolved = False
    finally:
        socket.setdefaulttimeout(old_timeout)

    _DNS_CACHE[domain] = resolved
    return resolved


# Semantic alias
verify_domain_resolves = is_domain_live


def verify_website_live(url: str, timeout: float = 4.0) -> Tuple[bool, int, str]:
    """
    Verifies that a website's domain resolves via DNS and responds over HTTP/HTTPS.
    Returns: (is_live, status_code, final_url)
    """
    if not url:
        return False, 0, ""

    clean_url = url.strip()
    if not clean_url.startswith(("http://", "https://")):
        clean_url = "https://" + clean_url

    domain = extract_domain(clean_url)
    if not is_domain_live(domain, timeout=timeout / 2.0):
        return False, 0, clean_url

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    # Attempt HTTPS first, then HTTP fallback
    urls_to_try = [clean_url]
    if clean_url.startswith("https://"):
        urls_to_try.append(clean_url.replace("https://", "http://", 1))

    for target in urls_to_try:
        try:
            resp = requests.head(target, headers=headers, timeout=timeout, allow_redirects=True)
            # 2xx, 3xx, and 401/403/405/406 (Cloudflare/WAF/firewall blocks bot, but site is definitively live)
            if resp.status_code in (200, 201, 202, 203, 204, 301, 302, 307, 308, 401, 403, 405, 406):
                return True, resp.status_code, resp.url
            # Some servers reject HEAD with 405/500, fallback to GET stream
            resp_get = requests.get(target, headers=headers, timeout=timeout, stream=True, allow_redirects=True)
            if resp_get.status_code in (200, 201, 202, 203, 204, 301, 302, 307, 308, 401, 403, 405, 406):
                return True, resp_get.status_code, resp_get.url
        except Exception:
            continue

    # If DNS resolved successfully, consider it live on the network even if remote server rate-limited
    return is_domain_live(domain), 0, clean_url


def is_email_domain_live(email: str) -> bool:
    """Verifies that an email's domain actually resolves via DNS."""
    if not email or "@" not in email:
        return False
    parts = email.strip().split("@")
    if len(parts) != 2:
        return False
    domain = parts[1].strip().lower()
    return is_domain_live(domain)


def filter_live_emails(emails_raw: Union[str, List[str]]) -> str:
    """
    Parses, validates, and filters email addresses.
    Eliminates fake manufactured emails (trade@domain, procurement@domain, etc.)
    and discards any email whose domain fails DNS resolution.
    Returns a '; '-joined string of verified emails, or '' if none pass.
    """
    if not emails_raw:
        return ""

    if isinstance(emails_raw, str):
        candidates = [e.strip() for e in re.split(r"[;, ]+", emails_raw) if e.strip()]
    elif isinstance(emails_raw, (list, tuple, set)):
        candidates = [str(e).strip() for e in emails_raw if str(e).strip()]
    else:
        candidates = []

    valid_emails: List[str] = []
    seen = set()

    for cand in candidates:
        cand_clean = cand.strip().strip(".,;:()<>[]\"'").lower()
        if not cand_clean or "@" not in cand_clean:
            continue

        # Basic RFC syntax check
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", cand_clean):
            continue

        parts = cand_clean.split("@")
        username, domain = parts[0], parts[1]

        # Reject synthetic trade@ placeholders
        if username == "trade":
            continue

        # Reject synthetic slugs
        if is_synthetic_domain_format(domain):
            continue

        # Discard junk placeholder emails
        if domain in ("example.com", "test.com", "domain.com", "wixpress.com", "sentry.io"):
            continue

        # Check DNS resolution of the email domain
        if not is_domain_live(domain):
            continue

        if cand_clean not in seen:
            seen.add(cand_clean)
            valid_emails.append(cand_clean)

    return "; ".join(valid_emails)
