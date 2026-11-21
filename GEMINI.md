# Gemini & Antigravity Assistant Rules for TradePulse EXIM

> **CORE STEERING GUIDE**: Refer to [STEERING.md](file:///Users/subhampanja/Desktop/subham/web-scrapper/STEERING.md) for full system architecture, database schemas, and lead generation invariants.

## Key Rules:
1. **Zero-Mock Policy**: Never mock emails with `trade@...` or generate placeholder domains. Use DNS-verified emails or empty string `""`.
2. **100% Strict Country Isolation**: Country queries must strictly produce leads residing in that country. Never allow Indian mills or UAE entities to be attributed to Togo or other nations.
3. **Buyer vs Seller Separation**: Importers are wholesale buyers/distributors. Rice mills are suppliers. Never convert a mill into an importer.
4. **Deduplication Invariant**: B2B platforms in `SHARED_PLATFORM_AND_DIRECTORY_DOMAINS` must never trigger 98.5% exact domain similarity.
5. **Always Test**: Run `PYTHONPATH=backend python3 -m pytest backend/tests/test_togo_strictness.py backend/tests/test_crawler_real_deep.py backend/tests/test_full_goal_suite.py backend/tests/test_lead_engine.py -q` after backend edits, and `npm run build` inside `frontend/` after frontend edits.

