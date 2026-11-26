"""SERP provider query adapters, HTML parsers, rate-limit detectors, and genuine fallback builders."""

import re
import urllib.parse
from typing import Any, Callable, Dict, List, Optional, Tuple
from bs4 import BeautifulSoup

from app.scraper.http_client import decode_bing_u

DEFAULT_DECISION_MAKER_TITLES: List[str] = [
    "Procurement Director", "Import Manager", "Purchasing Head", "Purchase Manager",
    "Head of Sourcing", "Chief Executive Officer", "CEO", "Managing Director",
    "Commercial Director", "Buyer",
]

_LI_BLOCKED_SLUGS = {"dir", "jobs", "company", "pulse", "posts", "pub", "login", "signup", "feed", "unavailable", "in"}
_GH_BLOCKED_SLUGS = {"orgs", "topics", "search", "features", "marketplace", "trending", "settings", "login", "about"}
_TW_BLOCKED_SLUGS = {"home", "explore", "search", "intent", "hashtag", "settings", "i"}
_LEGAL_SUFFIX_RE = re.compile(
    r"(?:,?\s+\b(?:LLC|L\.L\.C\.|W\.L\.L\.|WLL|Ltd|Limited|SARL|Est\.|Inc\.|Inc|FZE|FZC|Pte|LLP|Co\.|Corp\.?|GmbH|Pvt\.?)\.?)+$",
    re.IGNORECASE,
)
_ROLE_HINT_RE = re.compile(
    r"\b(?:director|manager|head|officer|ceo|cfo|coo|cto|buyer|procurement|purchasing|"
    r"import|export|sourcing|supply|commercial|sales|president|vp|vice|chief|"
    r"founder|owner|partner|lead|specialist|coordinator|executive|supervisor|analyst)\b",
    re.IGNORECASE,
)
_NON_PERSON_TITLE_RE = re.compile(r"^\d+\+?\s+.*\bprofiles?\b", re.IGNORECASE)
_NON_PERSON_EXACT = {"linkedin", "sign in", "log in", "join linkedin", "people"}
_INVALID_WEBSITE_TOKENS = {"n/a", "na", "none", "null", "unknown", "none.com", "example.com"}
_SNIP_CO_RE_TMPL = (
    r"\s+at\s+([\w\s.,&'\-]+?)"
    r"(?:(?<!\bCo)(?<!\bLtd)(?<!\bInc)(?<!\bLLC)(?<!\bEst)(?<!\bPvt)(?<!\bCorp)\.|[,;·•|]|\bExperience|\bLocation|\bEducation|\bView|$)"
)


def clean_company_for_xray(company_name: str) -> str:
    """Strips trailing legal suffixes when >= 2 words remain."""
    raw = str(company_name or "").strip(' "\'')
    if not raw:
        return ""
    stripped = _LEGAL_SUFFIX_RE.sub("", raw).strip(" ,")
    if stripped and len(stripped.split()) >= 2:
        return stripped
    return raw


def build_bing_xray_query(query: str) -> str:
    """Normalizes LinkedIn X-ray queries for Bing by removing the trailing slash after /in."""
    return re.sub(r"site:linkedin\.com/in/", "site:linkedin.com/in", query or "", flags=re.IGNORECASE)


def build_relaxed_xray_query(
    company_name: str, country: str = "", platform: str = "linkedin", minimal: bool = False
) -> str:
    """Builds relaxed X-ray queries without restrictive country/negative clauses."""
    clean_co = clean_company_for_xray(company_name)
    plat = (platform or "linkedin").lower().strip()
    site_map = {"linkedin": "site:linkedin.com/in", "github": "site:github.com", "twitter": "(site:twitter.com OR site:x.com)", "x": "(site:twitter.com OR site:x.com)"}
    site_prefix = site_map.get(plat, plat if plat.startswith("site:") else f"site:{plat}")
    if not clean_co:
        return site_prefix
    if minimal:
        return f'{site_prefix} "{clean_co}"'
    return f'{site_prefix} "{clean_co}" (Procurement OR Purchase OR Import OR Sourcing OR Director OR Manager)'


def _unwrap_google_href(href: str) -> str:
    """Unwraps Google /url?q=... or /url?url=... redirect URLs."""
    raw = (href or "").strip()
    if not raw:
        return ""
    for _ in range(2):
        low = raw.lower()
        if raw.startswith("/url?") or "google.com/url?" in low:
            parsed = urllib.parse.urlsplit(raw)
            qs = urllib.parse.parse_qs(parsed.query)
            target = (qs.get("q") or qs.get("url") or [""])[0]
            if target:
                raw = urllib.parse.unquote(target).strip()
                continue
        break
    return raw


def parse_xray_serp_title_and_snippet(
    title: str,
    snippet: str,
    url: str,
    platform: str = "linkedin",
) -> Optional[Dict[str, str]]:
    """Extracts canonical profile URL, person name, job title, and company from SERP results."""
    if not url:
        return None

    clean_url = _unwrap_google_href(url)
    if clean_url.startswith("//"):
        clean_url = f"https:{clean_url}"
    if not clean_url or any(ord(c) < 32 or ord(c) == 127 for c in clean_url):
        return None
    try:
        parsed_u = urllib.parse.urlsplit(clean_url)
    except ValueError:
        return None
    if parsed_u.scheme.lower() not in ("http", "https") or parsed_u.username or parsed_u.password:
        return None
    host = (parsed_u.hostname or "").lower().strip(".")
    if not host or any(c.isspace() for c in host):
        return None

    plat = (platform or "linkedin").lower().strip()
    if plat == "linkedin":
        if host != "linkedin.com" and not host.endswith(".linkedin.com"):
            return None
        m_li = re.match(r"^/in/([^/?#]+)(?:/(?:[a-z]{2}(?:-[a-z]{2})?)?)?/?$", parsed_u.path, flags=re.IGNORECASE)
        if not m_li:
            return None
        unquoted = urllib.parse.unquote(m_li.group(1))
        if "/" in unquoted or "\\" in unquoted or any(c.isspace() or ord(c) < 32 or ord(c) == 127 for c in unquoted):
            return None
        slug = unquoted.strip("/")
        if not slug or len(slug) < 2 or slug.lower() in _LI_BLOCKED_SLUGS:
            return None
        canonical_url = f"https://www.linkedin.com/in/{slug}"
    elif plat == "github":
        if host != "github.com" and not host.endswith(".github.com"):
            return None
        m_gh = re.match(r"^/([a-zA-Z0-9\-_]+)/?$", parsed_u.path)
        if not m_gh or m_gh.group(1).lower() in _GH_BLOCKED_SLUGS:
            return None
        canonical_url = f"https://github.com/{m_gh.group(1)}"
    elif plat in ("twitter", "x"):
        if host not in ("twitter.com", "x.com") and not host.endswith((".twitter.com", ".x.com")):
            return None
        m_tw = re.match(r"^/([a-zA-Z0-9_]+)/?$", parsed_u.path)
        if not m_tw or m_tw.group(1).lower() in _TW_BLOCKED_SLUGS:
            return None
        canonical_url = f"https://x.com/{m_tw.group(1)}"
    else:
        canonical_url = f"{parsed_u.scheme.lower()}://{parsed_u.netloc}{parsed_u.path}"

    raw_title = (title or "").strip()
    if raw_title.lower() in _NON_PERSON_EXACT or _NON_PERSON_TITLE_RE.match(raw_title):
        return None

    clean_title = re.sub(
        r"(?:\s+[-–—/·•]\s*|\s*[|·•]\s*|\s+on\s+)(?:(?:LinkedIn|GitHub|Twitter|Platform)\b.*|\bX\b\s*)$",
        "",
        raw_title,
        flags=re.IGNORECASE,
    ).strip()
    if clean_title.lower() in _NON_PERSON_EXACT or _NON_PERSON_TITLE_RE.match(clean_title):
        return None

    segments = [s.strip() for s in re.split(r"\s+[-–—/]\s+|\s*[|·•]\s*", clean_title) if s.strip()]
    name, role, company = "", "", ""
    if len(segments) >= 3:
        name, role, company = segments[0], segments[1], segments[2]
    elif len(segments) == 2:
        name = segments[0]
        second = segments[1]
        snip_low = (snippet or "").lower()
        has_snip_role = bool(
            snippet and (
                " at " in snip_low
                or any(d.lower() in snip_low for d in DEFAULT_DECISION_MAKER_TITLES)
            )
        )
        second_in_snip_as_company = bool(
            snippet and re.search(r"\bat\s+" + re.escape(second) + r"\b", snippet, flags=re.IGNORECASE)
        )
        if " at " not in second.lower() and (
            _LEGAL_SUFFIX_RE.search(second)
            or second_in_snip_as_company
            or (not _ROLE_HINT_RE.search(second) and has_snip_role)
        ):
            company = second
        else:
            role = second
    elif len(segments) == 1:
        name = segments[0]
    else:
        name = clean_title

    if " at " in role.lower():
        r_parts = re.split(r"\s+at\s+", role, flags=re.IGNORECASE, maxsplit=1)
        if len(r_parts) == 2:
            role = r_parts[0].strip()
            if not company or any(c in company.lower() for c in ["united arab", "dubai", "india", "saudi", "singapore", "qatar"]):
                company = r_parts[1].strip()

    if not role and " at " in name.lower():
        n_parts = re.split(r"\s+at\s+", name, flags=re.IGNORECASE, maxsplit=1)
        if len(n_parts) == 2:
            name = n_parts[0].strip()
            if not company:
                company = n_parts[1].strip()

    name = re.sub(r"\s*\([^)]*\)", "", name).strip()
    name = re.sub(r"^(?:Profile\s*:\s*|View\s+)", "", name, flags=re.IGNORECASE).strip()

    if snippet and (not role or not company):
        candidate_roles = ([role] if role else []) + [
            d for d in DEFAULT_DECISION_MAKER_TITLES if not role or d.lower() != role.lower()
        ]
        matched_snip = False
        for c_title in candidate_roles:
            if not role and c_title.lower() in snippet.lower():
                role = c_title
            m_snip = re.search(re.escape(c_title) + _SNIP_CO_RE_TMPL, snippet, flags=re.IGNORECASE)
            if m_snip:
                if not role:
                    role = c_title
                if not company:
                    company = m_snip.group(1).strip()
                matched_snip = True
                break
        if not matched_snip and not company:
            m_gen = re.search(r"(?:^|[·•|.]\s*)([^\W\d_][^·•|,;.\n]{1,50}?)" + _SNIP_CO_RE_TMPL, snippet, flags=re.IGNORECASE)
            if m_gen and _ROLE_HINT_RE.search(m_gen.group(1)) and " is " not in m_gen.group(1).lower():
                if not role:
                    role = m_gen.group(1).strip()
                company = m_gen.group(2).strip()

    if not name or len(name) < 2 or name.lower() in _NON_PERSON_EXACT or _NON_PERSON_TITLE_RE.match(name):
        return None

    return {
        "name": name[:90],
        "title": role[:90],
        "company": company[:90],
        "profile_url": canonical_url,
        "platform": plat,
        "snippet": (snippet or "")[:250],
    }


def is_serp_rate_limited(provider: str, status: int, html: Optional[str]) -> bool:
    """Detects HTTP errors, offline responses, or visible CAPTCHA/challenge pages per provider."""
    if status in (0, 403, 429, 503) or status >= 400 or not html:
        return True
    prov, low = (provider or "").lower().strip(), html.lower()
    if prov == "google":
        if "/sorry/index" in low or "unusual traffic from your computer network" in low or "g-recaptcha" in low:
            return True
        return bool(("enablejs" in low or "please enable javascript" in low) and not re.search(r"<h3\b", low))
    if prov == "bing":
        soup = BeautifulSoup(html, "lxml")
        if soup.select_one("#b_captcha, form[action*='captcha']"):
            return True
        title_el = soup.find("title")
        title_txt = title_el.get_text(" ", strip=True) if title_el else ""
        return bool(re.search(r"\b(?:captcha|verify|challenge|just a moment)\b", title_txt, re.IGNORECASE))
    if prov in ("duckduckgo", "ddg"):
        return "anomaly-modal" in low or "bots use duckduckgo" in low
    return False


def parse_ddg_serp_html(html: str, platform: str = "linkedin", max_results: int = 10) -> List[Dict[str, str]]:
    """Parses DuckDuckGo HTML SERP results into canonical profile records."""
    results: List[Dict[str, str]] = []
    seen_urls = set()
    soup = BeautifulSoup(html, "lxml")
    for result_div in soup.find_all("div", class_=re.compile(r"result\b")):
        a_tag = (
            result_div.find("a", class_="result__a", href=True)
            or result_div.find("a", href=re.compile(r"uddg="))
            or result_div.find("a", class_="result__url", href=True)
            or result_div.find("a", class_="result__snippet", href=True)
            or result_div.find("a", href=True)
        )
        title_tag = result_div.find("a", class_="result__a") or result_div.find("a", class_="result__title") or result_div.find("h2") or a_tag
        snippet_tag = result_div.find("a", class_="result__snippet") or result_div.find("div", class_="result__snippet")
        if not a_tag or not a_tag.get("href"):
            continue

        raw_href = a_tag["href"].strip()
        if "uddg=" in raw_href:
            m = re.search(r"uddg=([^&]+)", raw_href)
            if m:
                raw_href = urllib.parse.unquote(m.group(1)).strip()
        if raw_href.startswith("//"):
            raw_href = f"https:{raw_href}"

        title_text = title_tag.get_text(" ", strip=True) if title_tag else ""
        snip_text = snippet_tag.get_text(" ", strip=True) if snippet_tag else ""
        parsed = parse_xray_serp_title_and_snippet(title_text, snip_text, raw_href, platform=platform)
        if parsed and parsed["profile_url"] not in seen_urls:
            seen_urls.add(parsed["profile_url"])
            results.append(parsed)
            if len(results) >= max_results:
                break
    return results


def parse_bing_serp_html(html: str, platform: str = "linkedin", max_results: int = 10) -> List[Dict[str, str]]:
    """Parses Bing HTML SERP results, decoding ck/a redirects and never emitting bing.com URLs."""
    results: List[Dict[str, str]] = []
    seen_urls = set()
    soup = BeautifulSoup(html, "lxml")
    for li in soup.select("li.b_algo"):
        a_el = li.select_one("h2 a")
        if not a_el:
            continue
        raw_href = (a_el.get("href") or "").strip()
        if raw_href.startswith("//"):
            raw_href = f"https:{raw_href}"
        target_url = raw_href
        low_href = raw_href.lower()
        if "bing.com/ck/" in low_href or low_href.startswith("/ck/"):
            m = re.search(r"[?&]u=([^&]+)", raw_href)
            if not m:
                continue
            dec = decode_bing_u(m.group(1))
            if not dec.startswith("http"):
                continue
            target_url = dec

        if "bing.com/" in target_url.lower():
            continue

        b_title = a_el.get_text(" ", strip=True)
        snip_el = li.select_one(".b_caption p, .b_algoSlug, .b_snippet")
        b_snip = snip_el.get_text(" ", strip=True) if snip_el else ""
        parsed = parse_xray_serp_title_and_snippet(b_title, b_snip, target_url, platform=platform)
        if parsed and parsed["profile_url"] not in seen_urls:
            seen_urls.add(parsed["profile_url"])
            results.append(parsed)
            if len(results) >= max_results:
                break
    return results


def parse_google_serp_html(html: str, platform: str = "linkedin", max_results: int = 10) -> List[Dict[str, str]]:
    """Parses Google HTML SERP blocks and /url?q= redirects into canonical profiles."""
    results: List[Dict[str, str]] = []
    seen_urls = set()
    soup = BeautifulSoup(html, "lxml")

    for block in soup.select("div.g, div.MjjYud, div.Gx5Zad"):
        title_el = block.select_one("h3")
        a_tag = title_el.find_parent("a", href=True) if title_el else None
        if not a_tag:
            a_tag = block.select_one("a[href*='linkedin.com/in/'], a[href^='/url?']")
        if not a_tag and platform.lower().strip() != "linkedin":
            a_tag = block.select_one("a[href]")
        if not a_tag or not a_tag.get("href"):
            continue

        target_url = _unwrap_google_href(a_tag["href"])
        title_text = title_el.get_text(" ", strip=True) if title_el else a_tag.get_text(" ", strip=True)
        snip_el = block.select_one("div.VwiC3b, span.aCOpRe, div.IsZvec, div[data-sncf], div[style*='-webkit-line-clamp']")
        snip_text = snip_el.get_text(" ", strip=True) if snip_el else ""

        parsed = parse_xray_serp_title_and_snippet(title_text, snip_text, target_url, platform=platform)
        if parsed and parsed["profile_url"] not in seen_urls:
            seen_urls.add(parsed["profile_url"])
            results.append(parsed)
            if len(results) >= max_results:
                break

    if not results:
        for a_tag in soup.select("a[href]"):
            target_url = _unwrap_google_href(a_tag.get("href", ""))
            if not target_url:
                continue
            h3_el = a_tag.select_one("h3")
            title_text = h3_el.get_text(" ", strip=True) if h3_el else a_tag.get_text(" ", strip=True)
            parsed = parse_xray_serp_title_and_snippet(title_text, "", target_url, platform=platform)
            if parsed and parsed["profile_url"] not in seen_urls:
                seen_urls.add(parsed["profile_url"])
                results.append(parsed)
                if len(results) >= max_results:
                    break
    return results


def query_xray_provider(
    fetch_func: Callable[..., Tuple[Optional[str], int, float]],
    provider: str,
    query: str,
    platform: str = "linkedin",
    max_results: int = 10,
    timeout: float = 5.0,
    polite_jitter: bool = False,
) -> Tuple[List[Dict[str, str]], bool, int]:
    """Fetches and parses a single SERP provider using the 3-arg fetch_page signature."""
    quoted_q = urllib.parse.quote_plus(query)
    prov = provider.lower().strip()
    prov_cfg = {
        "duckduckgo": (f"https://html.duckduckgo.com/html/?q={quoted_q}", parse_ddg_serp_html),
        "bing": (f"https://www.bing.com/search?q={quoted_q}&mkt=en-US&setlang=en-US", parse_bing_serp_html),
    }
    url, parser = prov_cfg.get(prov, (f"https://www.google.com/search?q={quoted_q}&hl=en&num=10", parse_google_serp_html))
    html, status, _latency = fetch_func(url, timeout=timeout, polite_jitter=polite_jitter)
    blocked = is_serp_rate_limited(prov, status, html)
    if blocked or not html or status not in (200, 202):
        return [], blocked, status
    return parser(html, platform=platform, max_results=max_results), False, status


def _normalize_website_base(website: str) -> str:
    raw = str(website or "").strip()
    if not raw or raw.lower() in _INVALID_WEBSITE_TOKENS:
        return ""
    if any(c.isspace() or ord(c) < 32 or ord(c) == 127 for c in raw):
        return ""
    if raw.startswith("//"):
        raw = f"https:{raw}"
    elif not re.match(r"^https?://", raw, flags=re.IGNORECASE):
        if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", raw):
            return ""
        m_scheme = re.match(r"^([a-zA-Z][a-zA-Z0-9+.-]*):(.*)$", raw)
        if m_scheme:
            prefix, rest = m_scheme.group(1), m_scheme.group(2)
            is_host_port = ("." in prefix or prefix.lower() == "localhost") and bool(re.match(r"^\d{1,5}(?:[/?#]|$)", rest))
            if not is_host_port:
                return ""
        raw = f"https://{raw}"
    try:
        parsed = urllib.parse.urlsplit(raw)
        _ = parsed.port
    except ValueError:
        return ""
    if parsed.scheme.lower() not in ("http", "https") or parsed.username or parsed.password or "@" in (parsed.netloc or ""):
        return ""
    host = (parsed.hostname or "").strip().lower()
    if not host or ("." not in host and host != "localhost") or host in _INVALID_WEBSITE_TOKENS:
        return ""
    if ".." in host or host.startswith((".", "-")) or host.endswith((".", "-")):
        return ""
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"


def build_genuine_fallbacks(
    company_name: str, country: str = "", website: str = "",
    platform: str = "linkedin", strict_query: str = "", status: str = "no_results",
) -> Dict[str, Any]:
    """Builds genuine non-synthetic fallback URLs and honest status messaging."""
    clean_co = clean_company_for_xray(company_name) or str(company_name or "").strip()
    quoted_li = urllib.parse.quote_plus(f"{clean_co} Purchase Manager".strip())
    quoted_strict = urllib.parse.quote_plus(strict_query or clean_co)
    quoted_bing = urllib.parse.quote_plus(build_bing_xray_query(strict_query) if strict_query else clean_co)
    base_w = _normalize_website_base(website)
    corp_urls = [f"{base_w}/contact", f"{base_w}/contact-us", f"{base_w}/about"] if base_w else []
    msgs = {
        "live_results": "Live X-ray search returned verified profiles.",
        "rate_limited_or_offline": "Search engines were rate-limited or unreachable; genuine direct search and corporate contact URLs are provided below with zero synthetic profiles.",
    }
    message = msgs.get(status, "Live X-ray search returned no indexed profiles for this query; genuine direct search and corporate contact URLs are provided below.")
    return {
        "linkedin_keyword_search_url": f"https://www.linkedin.com/search/results/people/?keywords={quoted_li}",
        "search_urls": {
            "google": f"https://www.google.com/search?q={quoted_strict}",
            "bing": f"https://www.bing.com/search?q={quoted_bing}",
            "duckduckgo": f"https://duckduckgo.com/?q={quoted_strict}",
        },
        "corporate_contact_urls": corp_urls,
        "message": message,
    }
