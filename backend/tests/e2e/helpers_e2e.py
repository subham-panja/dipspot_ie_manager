"""Shared opaque-box helpers, HTTP wrappers, SSR probes, and contract validators for E2E tests."""

import json
import posixpath
import re
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import requests

REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_APP_DIR = REPO_ROOT / "backend" / "app"
BACKEND_TESTS_DIR = REPO_ROOT / "backend" / "tests"
E2E_TESTS_DIR = BACKEND_TESTS_DIR / "e2e"
FRONTEND_SRC_DIR = REPO_ROOT / "frontend" / "src"
DOSSIER_DIR = FRONTEND_SRC_DIR / "components" / "dossier"


def post_json(client, path: str, payload: Dict[str, Any]):
    return client.post(path, data=json.dumps(payload), content_type="application/json")


def patch_json(client, path: str, payload: Dict[str, Any]):
    return client.patch(path, data=json.dumps(payload), content_type="application/json")


def get_json(client, path: str) -> Tuple[int, Dict[str, Any]]:
    resp = client.get(path)
    return resp.status_code, resp.get_json(silent=True) or {}


def delete_json(client, path: str):
    return client.delete(path)


def read_frontend_file(rel_path: str) -> str:
    target = FRONTEND_SRC_DIR / rel_path
    assert target.exists(), f"Missing expected frontend file: {target}"
    return target.read_text(encoding="utf-8")


def _dossier_dir() -> Path:
    default_src = REPO_ROOT / "frontend" / "src"
    if FRONTEND_SRC_DIR != default_src and DOSSIER_DIR == default_src / "components" / "dossier":
        return FRONTEND_SRC_DIR / "components" / "dossier"
    return DOSSIER_DIR


def read_all_dossier_sources() -> Dict[str, str]:
    files: Dict[str, str] = {}
    main_file = FRONTEND_SRC_DIR / "components" / "CustomerDossier.tsx"
    if main_file.exists():
        files["CustomerDossier.tsx"] = main_file.read_text(encoding="utf-8")
    ddir = _dossier_dir()
    if ddir.exists():
        for f in sorted(ddir.glob("*.ts*")):
            files[f"dossier/{f.name}"] = f.read_text(encoding="utf-8")
    return files


def _resolve_local_tsx_imports(
    source: str, base_rel: str, _seen: Optional[Set[str]] = None
) -> List[str]:
    """Resolve ./, ../, and @/components/ TS/TSX imports (including barrel index files)."""
    base_dir = Path(base_rel).parent
    resolved: List[str] = []
    seen = _seen if _seen is not None else set()
    import_re = (
        r"(?:import\s+(?:type\s+)?[\w*{}\s,$]+"
        r"|export\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\}))"
        r"\s+from\s+['\"]([^'\"]+)['\"]"
    )
    for m in re.finditer(import_re, source):
        imp = m.group(1)
        if imp.startswith("@/components/"):
            rel_stem = Path("components") / imp[len("@/components/") :]
        elif imp.startswith("./") or imp.startswith("../"):
            base_posix = base_dir.as_posix()
            joined = imp if base_posix in ("", ".") else f"{base_posix}/{imp}"
            norm = posixpath.normpath(joined)
            if norm == ".." or norm.startswith("../"):
                continue
            rel_stem = Path(norm)
        else:
            continue
        for suffix in ("", ".tsx", ".ts", "/index.tsx", "/index.ts"):
            cand_str = f"{rel_stem.as_posix()}{suffix}"
            full = FRONTEND_SRC_DIR / cand_str
            if full.is_file():
                if cand_str not in seen:
                    seen.add(cand_str)
                    resolved.append(cand_str)
                    if Path(cand_str).stem == "index":
                        barrel_src = strip_ts_comments(full.read_text(encoding="utf-8"))
                        for sub in _resolve_local_tsx_imports(barrel_src, cand_str, _seen=seen):
                            if sub not in resolved:
                                resolved.append(sub)
                break
    return resolved


def _find_jsx_tag_end(source: str, start: int) -> int:
    """Return index just past the closing '>' of a JSX tag starting after its tag name."""
    i = start
    n = len(source)
    brace_depth = 0
    quote = ""
    while i < n:
        ch = source[i]
        if quote:
            if ch == "\\" and i + 1 < n:
                i += 2
                continue
            if ch == quote:
                quote = ""
            i += 1
            continue
        if ch in ("'", '"', "`"):
            quote = ch
        elif ch == "{":
            brace_depth += 1
        elif ch == "}" and brace_depth > 0:
            brace_depth -= 1
        elif ch == ">" and brace_depth == 0:
            return i + 1
        i += 1
    return start


def extract_jsx_opening_tags(source: str, tag_pattern: str) -> List[str]:
    """Extract JSX opening tags matching <tag_pattern ...>, respecting nested {...} and quotes."""
    tags: List[str] = []
    for m in re.finditer(rf"<\s*(?:{tag_pattern})\b", source):
        end = _find_jsx_tag_end(source, m.end())
        if end > m.end():
            tags.append(source[m.start() : end])
    return tags


def get_dossier_header_source() -> str:
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    for rel in _resolve_local_tsx_imports(dossier_src, "components/CustomerDossier.tsx"):
        if "header" in Path(rel).name.lower():
            return strip_ts_comments(read_frontend_file(rel))
    fallback = _dossier_dir() / "DossierHeader.tsx"
    if fallback.exists():
        return strip_ts_comments(fallback.read_text(encoding="utf-8"))
    return dossier_src


def _traverse_panel_bfs(queue: List[str], panel_files: Dict[str, str]) -> None:
    excluded_name = re.compile(r"(?i)(?:types\.tsx?$|modal)")
    while queue:
        rel = queue.pop(0)
        if (
            rel in panel_files
            or rel == "components/CustomerDossier.tsx"
            or not (rel.endswith(".tsx") or rel.endswith(".ts"))
            or excluded_name.search(Path(rel).name)
        ):
            continue
        src = strip_ts_comments(read_frontend_file(rel))
        panel_files[rel] = src
        for sub in _resolve_local_tsx_imports(src, rel):
            if sub not in panel_files:
                queue.append(sub)


def get_tabs_bundle() -> Tuple[str, str, Dict[str, str]]:
    """Return (tabs_entry_src, combined_tabs_and_panels_src, panel_files_dict) via CustomerDossier import graph."""
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    jsx = extract_jsx_after(dossier_src, "return (")
    imports = _resolve_local_tsx_imports(dossier_src, "components/CustomerDossier.tsx")
    tabs_match = re.search(r"<(Dossier\w*Tabs)\b", jsx)

    panel_files: Dict[str, str] = {}
    if tabs_match:
        tag = tabs_match.group(1)
        entry_rel = next(
            (r for r in imports if Path(r).stem == tag),
            f"components/dossier/{tag}.tsx",
        )
        entry_src = strip_ts_comments(read_frontend_file(entry_rel))
        panel_files[entry_rel] = entry_src
        _traverse_panel_bfs(list(_resolve_local_tsx_imports(entry_src, entry_rel)), panel_files)
        return entry_src, "\n".join(panel_files.values()), panel_files

    seed_queue = [
        rel
        for rel in imports
        if any(k in Path(rel).name.lower() for k in ("contact", "xray", "outreach", "note", "tab"))
    ]
    _traverse_panel_bfs(seed_queue, panel_files)
    panel_files["components/CustomerDossier.tsx"] = dossier_src
    return dossier_src, "\n".join(panel_files.values()), panel_files


def get_right_column_sources() -> Tuple[str, Dict[str, str]]:
    """Return (combined_right_src, right_files_dict) for components rendered in CustomerDossier right column."""
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    jsx = extract_jsx_after(dossier_src, "return (")
    imports = _resolve_local_tsx_imports(dossier_src, "components/CustomerDossier.tsx")

    tabs_m = re.search(r"<Dossier\w*Tabs\b", jsx)
    trade_candidates = [jsx.find("<DossierTradeStats"), jsx.find("<DossierSourceInfo")]
    earliest_trade = min((p for p in trade_candidates if p != -1), default=-1)
    assert earliest_trade != -1, "Expected <DossierTradeStats or <DossierSourceInfo in CustomerDossier JSX"

    if tabs_m and tabs_m.start() < earliest_trade:
        start_pos = _find_jsx_tag_end(jsx, tabs_m.end())
    else:
        left_before = [
            _find_jsx_tag_end(jsx, m.end())
            for m in re.finditer(
                r"<Dossier(?:MapSection|Contacts|Xray\w*|Outreach\w*|Notes)\b",
                jsx[:earliest_trade],
            )
        ]
        start_pos = max(left_before) if left_before else earliest_trade

    right_jsx = jsx[start_pos:]
    excluded_tag = re.compile(
        r"^(?:DossierActionBar|DossierHeader|DossierMapSection|DossierEditForm"
        r"|DossierContacts|DossierNotes|DossierOutreach\w*|DossierXray\w*|Dossier\w*Tabs)$|Modal"
    )
    queue: List[str] = []
    for tag in re.findall(r"<([A-Z][A-Za-z0-9_]*)\b", right_jsx):
        if excluded_tag.search(tag):
            continue
        rel = next((r for r in imports if Path(r).stem == tag), None)
        if rel and rel not in queue:
            queue.append(rel)

    default_trade = "components/dossier/DossierTradeStats.tsx"
    if default_trade not in queue and (FRONTEND_SRC_DIR / default_trade).is_file():
        queue.insert(0, default_trade)

    right_files: Dict[str, str] = {}
    visited: Set[str] = set()
    while queue:
        rel = queue.pop(0)
        if (
            rel in visited
            or re.search(r"(?i)types\.tsx?$", Path(rel).name)
            or "Modal" in Path(rel).name
            or not (rel.endswith(".tsx") or rel.endswith(".ts"))
        ):
            continue
        visited.add(rel)
        src = strip_ts_comments(read_frontend_file(rel))
        right_files[rel] = src
        for sub in _resolve_local_tsx_imports(src, rel):
            if sub not in visited:
                queue.append(sub)
    return "\n".join(right_files.values()), right_files


def get_enroll_modal_source() -> Tuple[str, str]:
    """Locate the campaign enrollment modal via CustomerDossier / page imports or dossier directory."""
    candidates: List[str] = []
    for owner in (
        "components/CustomerDossier.tsx",
        "app/leads/importers/page.tsx",
        "app/leads/suppliers/page.tsx",
        "app/pipeline/page.tsx",
    ):
        owner_path = FRONTEND_SRC_DIR / owner
        if not owner_path.exists():
            continue
        owner_src = strip_ts_comments(owner_path.read_text(encoding="utf-8"))
        for rel in _resolve_local_tsx_imports(owner_src, owner):
            name = Path(rel).name.lower()
            if "enroll" in name and "modal" in name and rel not in candidates:
                candidates.append(rel)
    if not candidates and _dossier_dir().exists():
        for f in sorted(_dossier_dir().glob("*Enroll*Modal*.tsx")):
            candidates.append(f"components/dossier/{f.name}")
    assert candidates, "Missing campaign enrollment modal component (e.g. DossierEnrollModal/CampaignEnrollModal)"
    chosen = candidates[0]
    return chosen, strip_ts_comments(read_frontend_file(chosen))


def assert_enrollment_wired_across_pages() -> None:
    """Verify importers, suppliers, and pipeline pages wire enrollment via pages or CustomerDossier."""
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    modal_rel, _ = get_enroll_modal_source()
    modal_name = Path(modal_rel).stem
    internal_wired = bool(
        re.search(rf"<{re.escape(modal_name)}\b", dossier_src)
        and any(
            re.search(r"\bonEnroll\s*=", tag)
            for tag in extract_jsx_opening_tags(dossier_src, "DossierActionBar")
        )
    )
    for rel_path in (
        "app/leads/importers/page.tsx",
        "app/leads/suppliers/page.tsx",
        "app/pipeline/page.tsx",
    ):
        src = strip_ts_comments(read_frontend_file(rel_path))
        assert "<CustomerDossier" in src, f"Missing CustomerDossier mount in {rel_path}"
        page_wired = ("onEnroll" in src) and (modal_name in src)
        assert page_wired or internal_wired, (
            f"Neither {rel_path} nor CustomerDossier.tsx wires onEnroll + {modal_name}"
        )


def fetch_ssr_html(base_url: str, route: str, retries: int = 2) -> Tuple[int, str]:
    url = f"{base_url.rstrip('/')}{route}"
    last_status = 0
    last_text = ""
    for attempt in range(retries + 1):
        resp = requests.get(url, timeout=8.0)
        last_status, last_text = resp.status_code, resp.text
        if last_status < 500 or attempt == retries:
            return last_status, last_text
        time.sleep(0.4)
    return last_status, last_text


def dump_dom_headless_chrome(chrome_path: str, url: str) -> Tuple[int, str]:
    proc = subprocess.run(
        [
            chrome_path,
            "--headless",
            "--no-sandbox",
            "--disable-gpu",
            "--dump-dom",
            "--virtual-time-budget=4000",
            url,
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    return proc.returncode, proc.stdout or ""


def find_repo_files_over_limit(limit: int = 500) -> List[Tuple[str, int]]:
    offenders: List[Tuple[str, int]] = []
    roots = [BACKEND_APP_DIR, BACKEND_TESTS_DIR, FRONTEND_SRC_DIR]
    exts = {".py", ".ts", ".tsx"}
    for root in roots:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            if path.is_file() and path.suffix in exts and "node_modules" not in path.parts:
                line_count = len(path.read_text(encoding="utf-8", errors="ignore").splitlines())
                if line_count >= limit:
                    offenders.append((str(path.relative_to(REPO_ROOT)), line_count))
    return offenders


def assert_zero_mock_xray_response(data: Dict[str, Any], expect_website_domain: str = ""):
    assert data.get("success") is True
    assert data.get("profiles") == []
    assert data.get("count") == 0
    assert data.get("persisted_contacts") == []
    assert data.get("fallback_used") is True
    assert data.get("status") in ("no_results", "rate_limited_or_offline")

    fallbacks = data.get("fallbacks") or {}
    li_url = fallbacks.get("linkedin_keyword_search_url") or ""
    assert li_url.startswith("https://www.linkedin.com/search/"), f"Bad fallback LinkedIn URL: {li_url}"

    search_urls = fallbacks.get("search_urls") or {}
    for engine in ("google", "bing", "duckduckgo"):
        assert engine in search_urls and search_urls[engine].startswith("https://"), f"Missing {engine} fallback URL"

    corp_urls = fallbacks.get("corporate_contact_urls") or []
    assert isinstance(corp_urls, list)
    if expect_website_domain:
        assert any(expect_website_domain in u for u in corp_urls), (
            f"Expected {expect_website_domain} in corporate_contact_urls: {corp_urls}"
        )
    assert (fallbacks.get("message") or "").strip(), "Expected informative non-empty fallback message"


def extract_jsx_after(source: str, marker: str) -> str:
    idx = source.find(marker)
    assert idx != -1, f"Marker {marker!r} not found in component source"
    return source[idx:]


def strip_ts_comments(source: str) -> str:
    """Strip /* ... */ and // ... TypeScript/JSX comments while preserving strings, regexes, and URLs."""
    out: List[str] = []
    i = 0
    n = len(source)
    quote = ""
    last_non_ws = ""
    while i < n:
        ch = source[i]
        nxt = source[i : i + 2]
        if quote:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(source[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = ""
                last_non_ws = ch
            i += 1
            continue
        if ch in ("'", '"', "`"):
            quote = ch
            out.append(ch)
            i += 1
            continue
        if nxt == "/*":
            end = source.find("*/", i + 2)
            if end == -1:
                break
            i = end + 2
            continue
        if nxt == "//":
            if i > 0 and source[i - 1] == ":":
                out.append(nxt)
                last_non_ws = "/"
                i += 2
                continue
            nl = source.find("\n", i + 2)
            if nl == -1:
                break
            i = nl
            continue
        if ch == "/" and last_non_ws in ("", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", ";"):
            j = i + 1
            in_cls = False
            closed = False
            while j < n and source[j] != "\n":
                c = source[j]
                if c == "\\":
                    j += 2
                    continue
                if c == "[":
                    in_cls = True
                elif c == "]":
                    in_cls = False
                elif c == "/" and not in_cls:
                    closed = True
                    j += 1
                    break
                j += 1
            if closed:
                out.append(source[i:j])
                last_non_ws = "/"
                i = j
                continue
        out.append(ch)
        if not ch.isspace():
            last_non_ws = ch
        i += 1
    return "".join(out)


FORBIDDEN_FAKE_PERSONA_PATTERNS = [
    r"\bJohn\s+Doe\b",
    r"\bJane\s+Doe\b",
    r"\bTariq\s+Al-Sayed\b",
    r"\bmock_profiles\b",
    r"\bsynthetic_profiles\b",
    r"\bfake_profiles\b",
]
