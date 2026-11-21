# AI Agent Guidelines & Project Instructions (TradePulse EXIM)

> **PRIMARY DIRECTIVE**: Always consult [STEERING.md](file:///Users/subhampanja/Desktop/subham/web-scrapper/STEERING.md) for exhaustive architectural diagrams, database schemas, deduplication mechanics, and operational commands.

---

## 1. Quick Identity & Mission
You are working on **TradePulse EXIM (`dipspot_ie_manager`)**, a high-performance export-import commercial operating system and verified commodity lead generation crawler.

- **Stack**: Next.js 14 (TypeScript/Tailwind) + Flask 3.1 REST API (Python 3.12) + Document Store + Relational DB.
- **Core Endpoints**: Backend runs on `http://localhost:5001/api/...`, Frontend runs on `http://localhost:3000`.

---

## 2. Non-Negotiable Agent Rules (Must Follow at All Times)

1. **Zero Synthetic / Mock Emails**:
   - NEVER fabricate emails like `trade@randomdomain.com` or `user@example.com`.
   - Store real, DNS-resolvable emails only. If no verified email is discovered, store `""` (empty string). Phone and physical addresses serve as primary contact channels.
2. **100% Strict Geographic Isolation**:
   - If a crawl or query targets Country `X` (e.g. `Togo`, `Saudi Arabia`, `India`), **100% of generated and saved leads must belong strictly to Country `X`**.
   - NEVER allow Indian rice mills (e.g., `Annapurna Rice Mill` in Hooghly) to be saved under Togo, Nigeria, or any other country.
   - Phones must match the target country calling code (`+228` for Togo, `+971` for UAE, `+91` for India). Addresses must be in the target country.
   - All crawled candidates must pass through `sanitize_lead_geography()`.
3. **Strict Buyer vs Supplier Separation**:
   - Importers/Buyers (`lead_type: "importer"`): Wholesale importers, food distributors, supermarkets, or port consignees. Domestic mills are NEVER importers.
   - Suppliers/Millers (`lead_type: "wb_mill"`): Processing mills, agro complexes, or accredited exporters.
4. **Shared Platform Deduplication Safety**:
   - B2B directory host domains (`indiamart.com`, `go4worldbusiness.com`, `maps.google.com`) are whitelisted in `SHARED_PLATFORM_AND_DIRECTORY_DOMAINS` in `lead_engine.py`.
   - They must NEVER trigger 98.5% exact domain similarity deduplication (which previously collapsed 200 leads down to 2 leads).
5. **Always Verify with Tests**:
   - After modifying crawler, engine, or catalog code, run:
     ```bash
     PYTHONPATH=backend python3 -m pytest backend/tests/test_government_and_port_sources.py backend/tests/test_lead_name_and_role_accuracy.py backend/tests/test_geographic_isolation.py backend/tests/test_crawler_real_deep.py backend/tests/test_full_goal_suite.py backend/tests/test_lead_engine.py backend/tests/test_customs_manifest_strategy.py -q
     ```
   - After frontend modifications, verify build:
     ```bash
     cd frontend && npm run build
     ```

---

## 3. Fast File Lookup Table

| When you need to edit... | Edit this file |
| :--- | :--- |
| **Verified enterprise directory & country pools** | `backend/app/verified_catalog.py` |
| **95% ML Deduplication & similarity calculation** | `backend/app/lead_engine.py` |
| **Realistic Web Scraper, Google Dorks & Directory Crawlers** | `backend/app/real_scraper.py` |
| **Geospatial & Google Maps POI extraction** | `backend/app/map_extractor.py` |
| **Country profiles (cities, phone codes, ports) & background workers** | `backend/app/tasks.py` |
| **REST API routes (/api/leads, /api/scrape, exports)** | `backend/app/routes/api.py` |
| **Database layer & synchronization** | `backend/app/db.py` |
| **Gmail SMTP 500-email/day rate limit stopper** | `backend/app/smtp_stopper.py` |
| **Omnichannel CRM (Gmail + WhatsApp Cloud API)** | `backend/app/followup_engine.py` |
| **Frontend Crawler UI (Stepper, Dorks, Monitor, Exports)** | `frontend/src/app/crawler/page.tsx` |
| **Frontend Leads Desks (Importers / Suppliers)** | `frontend/src/app/leads/importers/page.tsx`, `frontend/src/app/leads/suppliers/page.tsx` |
| **Frontend Pipeline Kanban Board** | `frontend/src/app/pipeline/page.tsx` |

For full architectural blueprints, schemas, and flowcharts, see [STEERING.md](file:///Users/subhampanja/Desktop/subham/web-scrapper/STEERING.md).

