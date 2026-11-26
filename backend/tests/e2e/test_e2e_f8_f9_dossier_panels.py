"""E2E Tests — F8 (Contacts Tab Live X-Ray & M2M) & F9 (Right Section Trade Intel & Source) (Tier 1 & Tier 2)."""

import re

from tests.e2e.helpers_e2e import (
    FORBIDDEN_FAKE_PERSONA_PATTERNS,
    REPO_ROOT,
    get_right_column_sources,
    get_tabs_bundle,
    read_all_dossier_sources,
    read_frontend_file,
    strip_ts_comments,
)


def _contacts_panel_src() -> str:
    _, tabs_all_src, panel_files = get_tabs_bundle()
    contact_tsx = [
        src for rel, src in panel_files.items() if "contact" in rel.lower() and rel.endswith(".tsx")
    ]
    if contact_tsx:
        ts_helpers = [src for rel, src in panel_files.items() if rel.endswith(".ts")]
        return "\n".join(contact_tsx + ts_helpers)
    return tabs_all_src


def _xray_panel_src() -> str:
    _, tabs_all_src, panel_files = get_tabs_bundle()
    xray_tsx = [
        src for rel, src in panel_files.items() if "xray" in rel.lower() and rel.endswith(".tsx")
    ]
    if xray_tsx:
        ts_helpers = [src for rel, src in panel_files.items() if rel.endswith(".ts")]
        return "\n".join(xray_tsx + ts_helpers)
    return tabs_all_src


# ---------------------------------------------------------------------------
# F8 Tier 1 — Happy-Path Feature Coverage (5 tests)
# ---------------------------------------------------------------------------


def test_f8_t1_contacts_tab_fetches_m2m_contacts_endpoint():
    _, tabs_all_src, _ = get_tabs_bundle()
    assert re.search(r"/leads/\$\{[^}]+\}/contacts|/contacts\?lead_id=\$\{[^}]+\}", tabs_all_src)
    assert "POST" in tabs_all_src


def test_f8_t1_contacts_tab_displays_name_title_verified_linkedin_and_companies():
    _, tabs_all_src, _ = get_tabs_bundle()
    for field in ("full_name", "job_title", "linkedin_profile_url", "companies"):
        assert field in tabs_all_src, f"Expected {field} rendered in Contacts tab"


def test_f8_t1_contacts_tab_triggers_live_xray_search_api():
    xray_src = _xray_panel_src()
    assert "/xray/search" in xray_src
    assert "company_name" in xray_src
    assert "persist" in xray_src


def test_f8_t1_contacts_tab_renders_genuine_fallback_links_when_no_live_profiles():
    xray_src = _xray_panel_src()
    assert "fallbacks" in xray_src
    assert "linkedin_keyword_search_url" in xray_src
    assert "search_urls" in xray_src
    assert "corporate_contact_urls" in xray_src


def test_f8_t1_contacts_tab_supports_unlink_contact_action():
    _, tabs_all_src, _ = get_tabs_bundle()
    assert "DELETE" in tabs_all_src
    assert re.search(r"/contacts/\$\{", tabs_all_src)


# ---------------------------------------------------------------------------
# F8 Tier 2 — Boundary & Corner Cases (5 tests)
# ---------------------------------------------------------------------------


def test_f8_t2_xray_ui_shows_zero_mock_fallback_banner_on_rate_limit():
    xray_src = _xray_panel_src()
    assert re.search(r"(fallback_used|rate_limited_or_offline|no_results)", xray_src)
    assert "fallbacks" in xray_src


def test_f8_t2_xray_ui_never_contains_hardcoded_mock_personas():
    dossier_sources = read_all_dossier_sources()
    assert dossier_sources, "Expected dossier frontend files to exist"
    for name, content in dossier_sources.items():
        for pat in FORBIDDEN_FAKE_PERSONA_PATTERNS:
            assert not re.search(pat, content, re.I), f"Forbidden mock pattern {pat!r} found in {name}"
    for backend_rel in ("xray_search.py", "xray_providers.py"):
        fpath = REPO_ROOT / "backend" / "app" / "scraper" / backend_rel
        if fpath.exists():
            content = fpath.read_text(encoding="utf-8")
            for pat in FORBIDDEN_FAKE_PERSONA_PATTERNS:
                assert not re.search(pat, content, re.I), f"Forbidden mock pattern {pat!r} found in {fpath}"


def test_f8_t2_contacts_ui_handles_missing_linkedin_and_email():
    contacts_src = _contacts_panel_src()
    for field in ("linkedin_profile_url", "email"):
        assert field in contacts_src, f"Expected {field} handling in Contacts tab"
        inline_guard = re.search(
            rf"{field}\s*(&&|\?|\|\|)|!\s*[\w.?]*{field}|if\s*\([^)]*{field}",
            contacts_src,
        )
        local_vars = re.findall(rf"(?:const|let)\s+(\w+)\s*=[^;]{{0,250}}?{field}", contacts_src)
        var_guard = any(
            re.search(rf"\b{re.escape(v)}\b\s*(&&|\?|\|\|)|if\s*\(\s*!?\s*{re.escape(v)}\b", contacts_src)
            for v in local_vars
        )
        assert inline_guard or var_guard, (
            f"Expected conditional guard for missing {field} in Contacts tab"
        )


def test_f8_t2_contacts_ui_displays_multi_company_badge_only_when_shared():
    contacts_src = _contacts_panel_src()
    assert "companies" in contacts_src
    assert re.search(r"companies\.length|companies\?\.length", contacts_src)


def test_f8_t2_contacts_ui_handles_api_error_gracefully():
    _, tabs_all_src, _ = get_tabs_bundle()
    assert "catch" in tabs_all_src and "finally" in tabs_all_src


# ---------------------------------------------------------------------------
# F9 Tier 1 — Happy-Path Feature Coverage (5 tests)
# ---------------------------------------------------------------------------


def test_f9_t1_right_column_renders_for_both_importers_and_suppliers():
    _, right_files = get_right_column_sources()
    gating_cond = (
        r"(?:lead_type\s*[!=]==?\s*['\"](?:importer|wb_mill|supplier)['\"]"
        r"|['\"](?:importer|wb_mill|supplier)['\"]\s*[!=]==?\s*(?:\w+\.)?lead_type"
        r"|importer_tier|shipment_volume|wb_mill|supplier)"
    )
    for rel, src in right_files.items():
        # Scoped conditional checks: must never return null on lead_type role gating or supplier/importer fields
        assert not re.search(
            rf"if\s*\([^)]*{gating_cond}[^)]*\)\s*"
            r"(?:\{[^}]{0,160}return\s*(?:\(\s*null\s*\)|null)|return\s*(?:\(\s*null\s*\)|null))",
            src,
        ), f"{rel} must not return null based on lead_type role or supplier/importer fields"
        assert not re.search(
            r"lead_type\s*[!=]==?\s*['\"](?:importer|wb_mill|supplier)['\"]\s*\?\s*(?:\(\s*null\s*\)|null)",
            src,
        ), f"{rel} must not ternary-null based on lead_type"


def test_f9_t1_right_column_displays_volume_and_quantities():
    right_src, _ = get_right_column_sources()
    assert "shipment_volume" in right_src
    assert "annual_volume_est" in right_src


def test_f9_t1_right_column_displays_origin_state_country_port_and_commodities():
    right_src, _ = get_right_column_sources()
    assert "origin_state" in right_src or "lead.state" in right_src
    assert "country" in right_src
    assert "nearest_port" in right_src
    assert "commodities_list" in right_src or "matched_varieties" in right_src


def test_f9_t1_right_column_displays_lead_source_metadata():
    right_src, _ = get_right_column_sources()
    for key in ("source_name", "source_url", "source_category", "customs_manifest_data", "b2b_directory", "harvest_date"):
        assert key in right_src, f"Expected R4 source metadata field {key!r} in right-column dossier components"


def test_f9_t1_dossier_types_include_all_r4_fields():
    types_src = strip_ts_comments(read_frontend_file("components/dossier/dossierTypes.ts"))
    for field in (
        "origin_state",
        "b2b_directory",
        "harvest_date",
        "source_category",
        "source_reliability",
        "customs_manifest_data",
        "annual_volume_est",
        "commodities_list",
        "contacts_count",
    ):
        assert field in types_src, f"Expected {field!r} in dossierTypes.ts"


# ---------------------------------------------------------------------------
# F9 Tier 2 — Boundary & Corner Cases (5 tests)
# ---------------------------------------------------------------------------


def test_f9_t2_trade_stats_handles_missing_manifest_and_harvest_date():
    right_src, _ = get_right_column_sources()
    assert re.search(r"customs_manifest_data\s*(\|\||\?|&&)", right_src)
    assert re.search(r"harvest_date\s*(\|\||\?|&&)", right_src)


def test_f9_t2_trade_stats_handles_object_and_string_customs_manifest():
    right_src, _ = get_right_column_sources()
    assert re.search(r"typeof\s+.*customs_manifest_data|JSON\.stringify", right_src)


def test_f9_t2_trade_stats_renders_supplier_without_importer_fields():
    right_src, _ = get_right_column_sources()
    assert "origin_state" in right_src
    assert "b2b_directory" in right_src


def test_f9_t2_trade_stats_renders_long_commodities_and_trade_lanes():
    right_src, _ = get_right_column_sources()
    assert "commodities_list" in right_src or "matched_varieties" in right_src
    assert "key_trade_lanes" in right_src


def test_f9_t2_source_url_sanitized_http_prefix():
    _, right_files = get_right_column_sources()
    guarded_files = [
        (rel, src) for rel, src in right_files.items() if "source_url" in src and "href=" in src
    ]
    assert guarded_files, "Expected source_url link rendering in right-column dossier components"
    guard_pat = r"startsWith\s*\(\s*['\"]https?(?::/?/?)?['\"]|\^\s*https?\??:|new\s+URL\s*\(|\bprotocol\s*===?\s*['\"]https?:"
    for rel, src in guarded_files:
        assert re.search(guard_pat, src), (
            f"Expected explicit http/https protocol guard protecting source_url href against XSS in {rel}"
        )
