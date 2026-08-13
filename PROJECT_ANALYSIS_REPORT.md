# Insights Iva ERP – Project Analysis Report

**Last updated:** 13 August 2026

## 1. Executive Summary

Insights Iva is a multi-tenant manufacturing ERP with a React + Vite frontend and a FastAPI + SQLAlchemy backend (SQLite in typical local/dev use). The architecture is modular across production, inventory, procurement/purchases, sales, finance/accounts, HR, quality, maintenance, analytics, alerts, documents, settings, and administration.

The codebase is largely structured correctly. Core dashboard and inventory paths use live backend APIs. Recent work focused on UI consistency (shared color tokens and selective button accents), shop-floor Job Card read views, and search UX fixes—without introducing duplicate business modules or changing security/auth architecture.

For setup and module overview, see [README.md](./README.md). For auth and hardening, see [SECURITY_REPORT.md](./SECURITY_REPORT.md).

## 2. Project Structure Review

### Frontend
- React application with route-based lazy loading (`lazyPages.jsx` + `React.lazy`)
- Pages grouped by domain: dashboard, production, inventory, procurement, purchases, sales, accounts, finance, HR, quality, maintenance, analytics, alerts, admin, documents, settings
- Shared UI: layout (Navbar, Sidebar), `GlobalSearch`, notifications, `ActionButton` / `ui-btn-*`, design tokens in `index.css`
- Theme mirrors: `frontend/src/theme/colors.js`, `frontend/src/styles/theme.js`

### Backend
- FastAPI app with router registration in `app/main.py`
- Domain modules under `app/api`, `app/routers`, `app/services`, `app/models`, `app/schemas`, `app/repositories`
- SQLite-backed persistence (`backend/smrt.db` by default) with SQLAlchemy models
- Production Job Card aggregation: `app/services/job_card_service.py` (read path over work orders)

## 3. Key Findings

### Frontend
- Earlier inventory screens injected synthetic demo content on empty API responses; those fallbacks were removed so empty states reflect live data.
- A central color system (`:root` CSS variables + `ui-btn-*`) reduces ad-hoc hex usage. Page CTAs may still use selective accents (`--color-action-teal`, `--color-action-blue`, success teal) by design—not one color for every button.
- Navbar `GlobalSearch` and Store Dashboard product search both had icon-jump bugs when dropdowns opened (icon positioned on a parent that grew with results). Fixed with nested input wrappers, clear buttons, and click-outside / Escape handling.
- Job Card UI is a shop-floor document view mapped to work orders (list + detail workflow), not a separate inventoriable CRUD entity in the current design.

### Backend
- Dashboard API wiring is present through the ERP dashboard router and dashboard service; KPIs aggregate live production, inventory, procurement, and sales data.
- Job Card list/detail APIs read from work-order data via `job_card_service` (GET list/detail). Create remains via the existing quick work-order flow.
- Auth, RBAC, and tenant isolation remain the security backbone (see SECURITY_REPORT).

## 4. Modules Reviewed

### Dashboard
- Route `/` → `ReferenceDashboard` (store managers redirect to inventory).
- Live ERP dashboard API; empty-state UI instead of fabricated KPI values.
- Global search lives in the navbar (`GlobalSearch`).

### Inventory / Store Dashboard
- Live list/detail without demo-row injection.
- Store Dashboard (`/inventory/dashboard`) product search: stable icon alignment, clear control, empty state, dismiss on Escape / outside click.

### Production
- Planning, MRP, work orders, schedule, machine allocation, daily reports, Job Card.
- MRP “Production Planning” / “Add products” CTAs use success teal (`#036F71` / `ui-btn-success`).
- Job Card mirrors work orders for shop-floor workflow display.

### Masters / Purchases / Sales
- Customers, Vendors, Products masters remain the reference list UX for similar pages.
- Selective CTA colors applied where requested (e.g. Vendors light blue `#BBDEFC`; Debit Note / Payments Made / Purchase Order list teal `#0F6D84`; Create Invoice `#7E93CC`; Record Payment teal with white text). Customers and RFQ “Create Purchase Order” intentionally left unchanged where specified.

### Procurement / Sales / Finance / HR / Quality / Maintenance / Analytics / Admin
- Structured around existing API and service layers.
- No duplicate modules introduced for Job Card or color work.

## 5. Fixes & Improvements Applied (Recent)

| Area | Change |
|------|--------|
| Live data | Removed synthetic demo inventory rows / detail demo-item bypasses |
| Design tokens | Central palette + `ui-btn-primary/secondary/success/warning/cta/danger/ghost`; action accents `--color-action-teal`, `--color-action-blue` |
| Buttons | Selective page CTAs (MRP, Vendors, Purchases debit/payments, Invoice create, Payment Receipts); reduced yellow as default primary |
| Job Card | Read list/detail over work orders; create via quick work order |
| Search | Store Dashboard product search + navbar `GlobalSearch` layout/UX fixes |
| Docs | This report, README, and SECURITY_REPORT cross-linked and refreshed |

## 6. Verification

### Frontend
- Prefer: `cd frontend && npm test -- --run`
- Historical note: some suites previously failed on dashboard translation-key expectations in tests rather than runtime crashes—re-run after major UI changes.

### Backend
- Prefer: `cd backend && pip install -r requirements.txt && pytest`
- Ensure dependencies (including `requests` if required by suites) are installed before running pytest.

### Manual UI checks (recommended)
- Dashboard: global search icon stays put when suggestions open; clear / Escape / click-outside work.
- Store Dashboard: product search same behavior.
- MRP: Production Planning / Add products = teal success.
- Spot-check Vendors, Debit Note, Payments Made, Purchase Orders list CTA, Create Invoice, Record Payment colors and contrast.

## 7. Recommendations

- Keep the current architecture; avoid duplicate routes, services, or tables for the same business concept.
- Continue using live backend data as the single source of truth; do not reintroduce demo-row fallbacks.
- Prefer CSS variables / `ui-btn-*` / documented action tokens over new one-off hex on every page.
- Use yellow (`--color-cta` / warning) selectively for warnings and attention—not as the default Create/Save color everywhere.
- Install backend dependencies and run the full pytest suite in CI or before releases.
- Wire broader `log_audit()` coverage and edge rate limiting as listed in SECURITY_REPORT remaining items.
- Review any remaining pages that still import large `*MasterData` demo modules for list content and migrate those to APIs when ready.

## 8. Related Documents

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | Product overview, setup, features, API map |
| [SECURITY_REPORT.md](./SECURITY_REPORT.md) | Auth hardening, RBAC, tenant isolation, deployment checklist |
