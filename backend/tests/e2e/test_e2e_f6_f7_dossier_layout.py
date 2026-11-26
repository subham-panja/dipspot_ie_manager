"""E2E Tests — F6 (75vw Drawer, Back Buttons, Full-Page) & F7 (Left Map + 3 Tabs) (Tier 1 & Tier 2)."""

import re
from typing import List, Tuple
import pytest

from tests.e2e.helpers_e2e import (
    dump_dom_headless_chrome,
    extract_jsx_after,
    extract_jsx_opening_tags,
    fetch_ssr_html,
    get_dossier_header_source,
    get_tabs_bundle,
    read_frontend_file,
    strip_ts_comments,
)


def _extract_classname_exprs(jsx: str) -> List[str]:
    """Extract all className=... attribute expressions from JSX, balancing nested braces."""
    exprs: List[str] = []
    for m in re.finditer(r"className\s*=\s*", jsx):
        pos = m.end()
        if pos >= len(jsx):
            continue
        opener = jsx[pos]
        if opener in ('"', "'"):
            end = jsx.find(opener, pos + 1)
            if end != -1:
                exprs.append(jsx[pos + 1 : end])
        elif opener == "{":
            depth = 0
            i = pos
            while i < len(jsx):
                if jsx[i] == "{":
                    depth += 1
                elif jsx[i] == "}":
                    depth -= 1
                    if depth == 0:
                        exprs.append(jsx[pos + 1 : i])
                        break
                i += 1
    return exprs


def _extract_button_blocks(tsx: str) -> List[Tuple[int, str]]:
    """Return (start_index, button_html) pairs for every <button ...>...</button> block."""
    blocks: List[Tuple[int, str]] = []
    for m in re.finditer(r"<button\b", tsx):
        start = m.start()
        end = tsx.find("</button>", start)
        if end != -1:
            blocks.append((start, tsx[start : end + len("</button>")]))
    return blocks


# ---------------------------------------------------------------------------
# F6 Tier 1 — Happy-Path Feature Coverage (5 tests)
# ---------------------------------------------------------------------------


def test_f6_t1_dossier_drawer_width_75vw_contract():
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    jsx = extract_jsx_after(dossier_src, "return (")
    class_exprs = _extract_classname_exprs(jsx)
    direct_in_jsx = any(re.search(r"(?:max-)?w-\[75vw\]", expr) for expr in class_exprs)

    via_var = False
    for m in re.finditer(r"(?:const|let)\s+([A-Za-z_]\w*)\s*=[^;]*(?:max-)?w-\[75vw\]", dossier_src):
        var_name = m.group(1)
        if any(re.search(rf"\b{re.escape(var_name)}\b", expr) for expr in class_exprs):
            via_var = True
            break

    assert direct_in_jsx or via_var, (
        "Expected w-[75vw] or max-w-[75vw] applied in CustomerDossier JSX className"
    )


def test_f6_t1_dossier_header_has_top_left_back_button():
    header_src = get_dossier_header_source()
    assert "onClose" in header_src
    assert "flex-row-reverse" not in header_src, (
        "DossierHeader must not reverse flex layout and displace top-left Back button"
    )
    h2_idx = header_src.find("<h2")
    assert h2_idx != -1, "Expected <h2> company heading in dossier header"

    top_left_back = [
        (pos, blk)
        for pos, blk in _extract_button_blocks(header_src)
        if pos < h2_idx and "onClick" in blk and re.search(r"\bBack\b", blk)
    ]
    assert top_left_back, (
        "Dossier header must render an interactive <button onClick={...}> containing 'Back' before <h2>"
    )


def test_f6_t1_dossier_full_page_toggle_and_top_right_back_button():
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    header_src = get_dossier_header_source()
    combined = dossier_src + "\n" + header_src

    assert re.search(r"full.?page", combined, re.I), "Missing full-page mode state/toggle"
    assert "useState" in dossier_src and re.search(r"onClick\s*=", header_src)

    jsx = extract_jsx_after(dossier_src, "return (")
    class_exprs = _extract_classname_exprs(jsx)
    full_page_pat = (
        r"(w-screen|h-screen|max-w-none|max-w-full|w-\[100vw\]|h-\[100vh\]"
        r"|['\"`][^'\"`]*w-full[^'\"`]*h-full|['\"`][^'\"`]*h-full[^'\"`]*w-full)"
    )
    direct_full = any(re.search(full_page_pat, e) for e in class_exprs)
    via_var = any(
        any(re.search(rf"\b{re.escape(m.group(1))}\b", e) for e in class_exprs)
        for m in re.finditer(rf"(?:const|let)\s+([A-Za-z_]\w*)\s*=[^;]*{full_page_pat}", dossier_src)
    )
    assert direct_full or via_var, (
        "CustomerDossier full-page mode must apply full-page panel sizing (not backdrop inset-0 alone)"
    )

    h2_idx = header_src.find("<h2")
    assert h2_idx != -1
    right_buttons = [
        blk
        for pos, blk in _extract_button_blocks(header_src)
        if pos > h2_idx
        and "onClick" in blk
        and re.search(r"\b(Back|Exit|Restore)\b|full.?page", blk, re.I)
    ]
    assert right_buttons, (
        "Dossier header must render an interactive top-right Back/Exit/Restore <button> after <h2>"
    )


def test_f6_t1_frontend_importers_and_suppliers_pages_serve_200_with_dossier_shell(
    frontend_base_url, chrome_binary
):
    if not frontend_base_url:
        pytest.skip("Next.js server on :3000 is not reachable")

    for route in ("/leads/importers", "/leads/suppliers"):
        status, html = fetch_ssr_html(frontend_base_url, route)
        assert status == 200, f"Expected HTTP 200 for {route}, got {status}"
        assert "<!DOCTYPE html>" in html or "<html" in html
        assert "Application error" not in html

    if chrome_binary:
        rc, dom = dump_dom_headless_chrome(chrome_binary, f"{frontend_base_url}/leads/importers")
        assert rc == 0
        assert len(dom) > 500


def test_f6_t1_dossier_pages_pass_typescript_compile(frontend_tsc_result):
    rc, output = frontend_tsc_result
    assert rc == 0, f"TypeScript check failed:\n{output}"


# ---------------------------------------------------------------------------
# F6 Tier 2 — Boundary & Corner Cases (5 tests)
# ---------------------------------------------------------------------------


def test_f6_t2_null_customer_renders_null_safely():
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    assert re.search(
        r"(?:if\s*\(\s*!\s*(?:lead|customer)\s*\)\s*\{?\s*return\s*(?:\(\s*null\s*\)|null)"
        r"|!\s*(?:lead|customer)\s*\?\s*(?:\(\s*null\s*\)|null)\s*:|\b(?:lead|customer)\s*&&)",
        dossier_src,
    ), "CustomerDossier must safely guard null customer/lead and return null"


def test_f6_t2_escape_key_closes_dossier():
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    assert "Escape" in dossier_src
    assert "keydown" in dossier_src


def test_f6_t2_light_and_dark_theme_modes_supported():
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    header_src = get_dossier_header_source()
    theme_pat = (
        r"isLight|isDark"
        r"|theme\s*===\s*['\"]light['\"]|['\"]light['\"]\s*===\s*theme"
        r"|theme\s*===\s*['\"]dark['\"]|theme\s*!==\s*['\"]dark['\"]"
    )
    assert re.search(theme_pat, dossier_src) and re.search(theme_pat, header_src)
    assert "bg-white" in dossier_src and ("bg-[#0f172a]" in dossier_src or "bg-slate-9" in dossier_src)


def test_f6_t2_unknown_frontend_route_returns_404(frontend_base_url):
    if not frontend_base_url:
        pytest.skip("Next.js server on :3000 is not reachable")
    status, _ = fetch_ssr_html(frontend_base_url, "/leads/nonexistent-route-e2e-xyz")
    assert status == 404


def test_f6_t2_all_drawer_modes_respect_75vw_sizing():
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    assert "right_drawer" in dossier_src
    assert "left_drawer" in dossier_src
    assert re.search(r"(?:max-)?w-\[75vw\]", dossier_src)


# ---------------------------------------------------------------------------
# F7 Tier 1 — Happy-Path Feature Coverage (5 tests)
# ---------------------------------------------------------------------------


def _find_tabs_pos(jsx: str, map_pos: int, trade_pos: int) -> int:
    m = re.search(r"<Dossier\w*Tabs\b", jsx)
    if m:
        return m.start()
    if map_pos != -1 and trade_pos != -1 and map_pos < trade_pos:
        mid = jsx[map_pos:trade_pos]
        if "Contacts" in mid and re.search(r"Outreach|Communication", mid) and "Notes" in mid:
            return map_pos + mid.find("Contacts")
    return -1


def test_f7_t1_left_column_places_map_above_tabs():
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    jsx = extract_jsx_after(dossier_src, "return (")
    map_pos = jsx.find("<DossierMapSection")
    trade_pos = jsx.find("<DossierTradeStats")
    tabs_pos = _find_tabs_pos(jsx, map_pos, trade_pos)
    assert map_pos != -1 and tabs_pos != -1 and trade_pos != -1
    assert map_pos < tabs_pos < trade_pos, (
        "Expected left column order: DossierMapSection -> tabs UI, followed by right column DossierTradeStats"
    )
    source_pos = jsx.find("<DossierSourceInfo")
    if source_pos != -1:
        assert tabs_pos < source_pos, "DossierSourceInfo must appear in right column after left tabs"


def test_f7_t1_three_tabs_labels_present():
    tabs_src, _, _ = get_tabs_bundle()
    assert "Contacts" in tabs_src
    assert re.search(r"Outreach History|Communication", tabs_src)
    assert re.search(r"Notes\s*/\s*Timeline|Notes", tabs_src)


def test_f7_t1_contacts_removed_from_right_column():
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    jsx = extract_jsx_after(dossier_src, "return (")
    trade_pos = jsx.find("<DossierTradeStats")
    assert trade_pos != -1
    right_col = jsx[trade_pos:]
    assert not re.search(r"<Dossier(?:Contacts|Xray\w*|Notes|\w*Tabs)\b", right_col)


def test_f7_t1_tab_switching_renders_respective_panels():
    tabs_entry_src, tabs_all_src, _ = get_tabs_bundle()
    assert "useState" in tabs_entry_src, "Expected interactive tab state in dossier tabs"
    assert re.search(r"DossierContacts|DossierXraySection|/xray/search", tabs_all_src)
    assert "/outreach-history" in tabs_all_src
    assert re.search(r"DossierNotes|/notes|extraction_notes", tabs_all_src)


def test_f7_t1_right_column_focused_on_trade_intel_and_actions():
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    jsx = extract_jsx_after(dossier_src, "return (")
    trade_pos = jsx.find("<DossierTradeStats")
    action_pos = jsx.find("<DossierActionBar")
    assert trade_pos != -1 and action_pos != -1 and trade_pos < action_pos
    source_pos = jsx.find("<DossierSourceInfo")
    if source_pos != -1:
        assert source_pos < action_pos


# ---------------------------------------------------------------------------
# F7 Tier 2 — Boundary & Corner Cases (5 tests)
# ---------------------------------------------------------------------------


def test_f7_t2_contacts_tab_handles_empty_company_zero_contacts():
    _, tabs_all_src, _ = get_tabs_bundle()
    assert re.search(r"length\s*(?:===?\s*0|<\s*1|<=\s*0)|!\s*contacts\.length", tabs_all_src)


def test_f7_t2_outreach_tab_handles_empty_history():
    _, tabs_all_src, panel_files = get_tabs_bundle()
    outreach_src = next(
        (src for rel, src in panel_files.items() if "outreach" in rel.lower()),
        None,
    )
    if outreach_src is not None:
        assert re.search(r"length\s*(?:===?\s*0|<\s*1|<=\s*0)|No\s+", outreach_src, re.I)
    else:
        assert re.search(
            r"outreach[\s\S]{0,1600}(?:length\s*(?:===?\s*0|<\s*1|<=\s*0)|No\s+)",
            tabs_all_src,
            re.I,
        )


def test_f7_t2_notes_tab_rejects_blank_note_submission():
    tabs_entry_src, tabs_all_src, panel_files = get_tabs_bundle()
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    notes_src = next(
        (src for rel, src in panel_files.items() if "notes" in rel.lower()),
        tabs_all_src,
    )
    assert re.search(r"\.trim\(\)", notes_src)
    assert "disabled" in notes_src

    direct_notes_post = bool(
        re.search(r"(/leads/\$\{[^}]+\}/notes|\$\{[^}]+\}/notes)", notes_src) and "POST" in notes_src
    )
    delegated_notes_post = bool(
        re.search(r"\bonAddNote\b|\bonSubmit\b", notes_src)
        and re.search(
            r"(?:/leads/\$\{[^}]+\}/notes|\$\{[^}]+\}/notes)[\s\S]{0,350}POST"
            r"|POST[\s\S]{0,350}(?:/leads/\$\{[^}]+\}/notes|\$\{[^}]+\}/notes)",
            dossier_src + "\n" + tabs_entry_src,
        )
    )
    assert direct_notes_post or delegated_notes_post, (
        "Notes flow must wire POST /leads/<id>/notes directly in DossierNotes or via onAddNote in CustomerDossier/tabs"
    )


def test_f7_t2_tab_state_resets_or_reloads_on_customer_change():
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    _, tabs_all_src, _ = get_tabs_bundle()
    has_dossier_reset = bool(
        re.search(
            r"useEffect\s*\([\s\S]*?,\s*\[\s*(?:customer|customer\?\.id|lead\?\.id|lead\.id)\s*\]\s*\)",
            dossier_src,
        )
    )
    has_tabs_key = any(
        re.search(r"\bkey\s*=", tag)
        for tag in extract_jsx_opening_tags(dossier_src, r"Dossier\w*Tabs")
    )
    has_tabs_effect = bool(
        re.search(r"useEffect\s*\([\s\S]*?,\s*\[\s*(?:lead|lead\?\.id|lead\.id)\s*\]\s*\)", tabs_all_src)
    )
    assert has_dossier_reset or has_tabs_key or has_tabs_effect, (
        "Expected customer/lead change reset via useEffect dependency or tabs key"
    )
    assert "lead.id" in tabs_all_src or "lead?.id" in tabs_all_src


def test_f7_t2_right_column_has_no_contacts_component_import_or_render():
    dossier_src = strip_ts_comments(read_frontend_file("components/CustomerDossier.tsx"))
    jsx = extract_jsx_after(dossier_src, "return (")
    map_pos = jsx.find("<DossierMapSection")
    trade_pos = jsx.find("<DossierTradeStats")
    assert trade_pos != -1, "Expected <DossierTradeStats in CustomerDossier JSX"
    if re.search(r"<Dossier\w*Tabs\b", jsx):
        assert not re.search(r"import\s+[^;]*\bDossierContacts\b", dossier_src), (
            "CustomerDossier.tsx must not import DossierContacts when contacts live inside tabs component"
        )
        assert not re.search(r"import\s+[^;]*\bDossierXraySection\b", dossier_src), (
            "CustomerDossier.tsx must not import DossierXraySection when contacts live inside tabs component"
        )
    else:
        tabs_pos = _find_tabs_pos(jsx, map_pos, trade_pos)
        assert tabs_pos != -1, (
            "CustomerDossier.tsx must render a tabs component or inline tabs UI between map and trade stats"
        )
        for tag_m in re.finditer(r"<(Dossier(?:Contacts|Xray\w*|Notes))\b", jsx):
            assert tabs_pos < tag_m.start() < trade_pos, (
                f"{tag_m.group(1)} must be rendered inside left-column tabs, not in right column"
            )
    right_section = jsx[trade_pos:]
    assert not re.search(r"<Dossier(?:Contacts|Xray\w*|Notes|\w*Tabs)\b", right_section)
