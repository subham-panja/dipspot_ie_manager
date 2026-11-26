"""E2E Tests — F10: Dual Campaign Enrollment UI Modal & Repository Line Audit (Tier 1 & Tier 2)."""

import re

from tests.e2e.helpers_e2e import (
    assert_enrollment_wired_across_pages,
    find_repo_files_over_limit,
    get_enroll_modal_source,
)


# ---------------------------------------------------------------------------
# Tier 1 — Happy-Path Feature Coverage (5 tests)
# ---------------------------------------------------------------------------


def test_f10_t1_enroll_modal_renders_dual_enrollment_options():
    _, modal_src = get_enroll_modal_source()
    assert "all_contacts" in modal_src
    assert "single_contact" in modal_src
    assert re.search(r"all contacts", modal_src, re.I)
    assert re.search(r"single.*contact", modal_src, re.I)


def test_f10_t1_enroll_modal_fetches_campaigns_and_lead_contacts():
    _, modal_src = get_enroll_modal_source()
    assert "/campaigns" in modal_src
    assert re.search(r"/leads/\$\{[^}]+\}/contacts|/contacts\?lead_id=\$\{[^}]+\}", modal_src)


def test_f10_t1_enroll_modal_submits_all_contacts_payload():
    _, modal_src = get_enroll_modal_source()
    assert re.search(r"/campaigns/\$\{[^}]+\}/enroll", modal_src)
    assert "enrollment_mode" in modal_src
    assert "lead_id" in modal_src


def test_f10_t1_enroll_modal_submits_single_contact_payload():
    _, modal_src = get_enroll_modal_source()
    assert "contact_id" in modal_src
    assert "single_contact" in modal_src


def test_f10_t1_on_enroll_wired_in_importers_suppliers_and_pipeline():
    assert_enrollment_wired_across_pages()


# ---------------------------------------------------------------------------
# Tier 2 — Boundary & Corner Cases (5 tests)
# ---------------------------------------------------------------------------


def _has_single_contact_selection_guard(expr: str) -> bool:
    if not re.search(r"single_contact", expr):
        return False
    contact_ident_guard = re.search(
        r"!\s*\(?\s*[A-Za-z_]*(?:contact|selected)\w*"
        r"|\b[A-Za-z_]*(?:contact(?!s\b)|selected)\w*\s*"
        r"(?:\??\.length\s*===?\s*0|===?\s*['\"]['\"]|===\s*(?:null|undefined)|==\s*null)",
        expr,
        re.I,
    )
    direct_adjacent_guard = re.search(
        r"single_contact['\"]\s*\)?\s*&&\s*\(?\s*"
        r"(?:!\s*[A-Za-z_]\w*|\b[A-Za-z_]\w*\s*(?:\??\.length\s*===?\s*0|===?\s*['\"]['\"]|==\s*null))",
        expr,
    )
    return bool(contact_ident_guard or direct_adjacent_guard)


def test_f10_t2_enroll_modal_disables_submit_when_single_contact_unselected():
    modal_rel, modal_src = get_enroll_modal_source()
    disabled_exprs = re.findall(r"disabled\s*=\s*\{([^}]+)\}", modal_src)
    assert disabled_exprs, f"Expected disabled={{...}} guard on submit button in {modal_rel}"
    inline_guard = any(_has_single_contact_selection_guard(expr) for expr in disabled_exprs)
    helper_vars = []
    for m in re.finditer(r"(?:const|let)\s+([A-Za-z_]\w*)\s*=\s*", modal_src):
        rest = modal_src[m.end() : m.end() + 600]
        stop = re.search(r";|\n(?=[ \t]*(?:const|let|var|return|if|function|export|<))", rest)
        init_expr = rest[: stop.start()] if stop else rest
        if _has_single_contact_selection_guard(init_expr):
            helper_vars.append(m.group(1))
    helper_guard = any(
        any(re.search(rf"\b{re.escape(v)}\b", expr) for expr in disabled_exprs)
        for v in helper_vars
    )
    assert inline_guard or helper_guard, (
        "Expected submit disabled={...} to prevent single_contact submission when no contact is selected"
    )


def test_f10_t2_enroll_modal_handles_zero_contacts_company():
    _, modal_src = get_enroll_modal_source()
    assert re.search(r"contacts\.length\s*===\s*0|!\s*contacts\.length", modal_src)


def test_f10_t2_enroll_modal_handles_zero_campaigns():
    _, modal_src = get_enroll_modal_source()
    assert re.search(
        r"campaigns\.length\s*(?:===?\s*0|<\s*1|<=\s*0)|!\s*campaigns\.length|!\s*[A-Za-z_]*[Cc]ampaign\w*",
        modal_src,
    )


def test_f10_t2_enroll_modal_closes_cleanly_on_cancel_or_success():
    _, modal_src = get_enroll_modal_source()
    assert "onClose" in modal_src
    assert re.search(r"Cancel|Close", modal_src)


def test_f10_t2_all_repo_source_and_e2e_files_under_500_lines():
    offenders = find_repo_files_over_limit(500)
    assert offenders == [], f"Files >= 500 lines found: {offenders}"
