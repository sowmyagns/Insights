# Insights Iva ERP – Project Analysis Report

**Last updated:** 15 August 2026

## 1. Executive Summary

Insights Iva is a multi-tenant manufacturing ERP with a React + Vite frontend and a FastAPI + SQLAlchemy backend (SQLite in typical local/dev use). The architecture is modular across production, inventory, procurement/purchases, sales, finance/accounts, HR, quality, maintenance, analytics, alerts, documents, settings, and administration.

The codebase is largely structured correctly. Core dashboard and inventory paths use live backend APIs. Recent work (Aug 2026) focused on:

1. **UI consistency** — shared color tokens, selective button accents, Job Card read views, search UX fixes.
2. **HR module dashboards** — mockup-aligned pages for HR Hub, Attendance, Leave, Payroll, Performance, Recruitment, Training, and HR Settings, with expanded sidebar navigation and RBAC menu parity.
3. **Accounts stability** — Chart of Accounts duplicate-row deduplication and resilient list fetching during dev hot-reload.

HR dashboard pages use a **merge/fallback pattern**: live `hrApi` data when present; curated demo payloads in `hrMasterData.js` when APIs return empty — layouts remain reviewable without DB seeding.

For setup and module overview, see [README.md](./README.md). For auth and hardening, see [SECURITY_REPORT.md](./SECURITY_REPORT.md).

## 2. Project Structure Review

### Frontend
- React application with route-based lazy loading (`lazyPages.jsx` + `React.lazy`)
- Pages grouped by domain: dashboard, production, inventory, procurement, purchases, sales, accounts, finance, HR, quality, maintenance, analytics, alerts, admin, documents, settings
- Shared UI: layout (Navbar, Sidebar), `GlobalSearch`, notifications, `ActionButton` / `ui-btn-*`, design tokens in `index.css`
- HR shared data/helpers: `frontend/src/data/hrMasterData.js` (`mergeHrHub`, `mergeAttendanceDashboard`, `mergeLeaveDashboard`, `mergePayrollDashboard`, `mergePerformanceDashboard`, recruitment/training demo objects)
- Theme mirrors: `frontend/src/theme/colors.js`, `frontend/src/styles/theme.js`

### Backend
- FastAPI app with router registration in `app/main.py`
- Domain modules under `app/api`, `app/routers`, `app/services`, `app/models`, `app/schemas`, `app/repositories`
- SQLite-backed persistence (`backend/smrt.db` by default) with SQLAlchemy models
- HR extended services: `hr_extended_service.py` (attendance, leave, payroll summaries, enriched lists)
- Accounts GL dedupe: `backend/app/api/accounts.py` (`_dedupe_gl_accounts`)

## 3. Key Findings

### Frontend
- Inventory pages previously injected synthetic demo content on empty API responses; those fallbacks were removed so empty states reflect live data.
- **HR dashboards intentionally retain demo merge** — only when live APIs are empty, so mockup layouts are usable in fresh tenants.
- Central color system (`:root` CSS variables + `ui-btn-*`) reduces ad-hoc hex usage. HR dashboards standardize on purple accent `#6366f1` per mockups.
- Navbar `GlobalSearch` and Store Dashboard product search layout fixes (nested input wrappers, clear, Escape/outside dismiss).
- Job Card UI is a shop-floor document view mapped to work orders (list + detail workflow).
- Chart of Accounts: duplicate React keys from duplicate DB rows caused broken row menus — fixed at API dedupe + frontend `dedupeGlRows()` + retry on connection reset.

### Backend
- Dashboard API wiring through ERP dashboard router and dashboard service.
- HR APIs: employees, shifts, attendance, leave, payroll, performance — enriched list endpoints for dashboard consumption.
- **No dedicated recruitment/training/settings APIs yet** — those dashboard pages are frontend-first with demo data.
- Auth, RBAC, and tenant isolation remain the security backbone (see SECURITY_REPORT).

## 4. Modules Reviewed

### Dashboard
- Route `/` → `ReferenceDashboard` (store managers redirect to inventory).
- Live ERP dashboard API; empty-state UI instead of fabricated KPI values.

### Inventory / Store Dashboard
- Live list/detail without demo-row injection.
- Eight-screen inventory UX (Store Dashboard through Settings) documented in README.

### Production
- Planning, MRP, work orders, schedule, machine allocation, daily reports, Job Card.

### HR (Aug 2026 pass)

| Route | Page | Data source |
|-------|------|-------------|
| `/hr` | HR Dashboard | `getEmployeeSummary`, attendance/leave APIs + `mergeHrHub()` |
| `/hr/attendance` | Attendance | `getAttendanceEnriched`, `mergeAttendanceDashboard()` |
| `/hr/leave` | Leave Management | `getLeaveEnriched`, `mergeLeaveDashboard()` |
| `/hr/payroll` | Payroll | `getPayrollEnriched`, `mergePayrollDashboard()` |
| `/hr/performance` | Performance | `getPerformanceReviews`, `mergePerformanceDashboard()` |
| `/hr/recruitment` | Recruitment | Demo dashboard (no backend module yet) |
| `/hr/training` | Training | Demo dashboard (no backend module yet) |
| `/hr/settings` | HR Settings | Client-side form only (no persist API) |

Sidebar (`sidebarNav.js`) and RBAC menu (`rbac_constants.py`) list separate expandable sections: Attendance, Leave Management, Payroll, Performance, Recruitment, Training, Reports, HR Settings.

Sub-routes still placeholders: `/hr/recruitment/candidates`, `/hr/recruitment/interviews`, `/hr/training/sessions`; secondary tabs on Leave/Payroll/Performance where noted in README.

### Accounts
- Chart of Accounts dedupe at list/seed endpoints.
- Balance Sheet `fyRange` reference error fixed in prior pass.

### Masters / Purchases / Sales / Quality / Maintenance / Analytics / Admin
- Structured around existing API and service layers.
- No duplicate modules introduced.

## 5. Fixes & Improvements Applied (Recent)

| Area | Change |
|------|--------|
| Live data (inventory) | Removed synthetic demo inventory rows / detail demo-item bypasses |
| Design tokens | Central palette + `ui-btn-*`; HR mockup purple accent |
| Buttons | Selective page CTAs (MRP, Vendors, Purchases, Invoice, Payment Receipts) |
| Job Card | Read list/detail over work orders |
| Search | Store Dashboard + navbar `GlobalSearch` layout/UX fixes |
| Chart of Accounts | API + UI dedupe; transient retry on GL list fetch |
| HR dashboards | Full mockup UI for 8 HR pages; `hrMasterData.js` merge helpers |
| HR navigation | Expanded sidebar + RBAC children; route `/hr/settings` |
| Docs | README, this report, SECURITY_REPORT cross-linked and refreshed |

## 6. Verification

### Frontend
```bash
cd frontend && npm test -- --run
cd frontend && npm run build
```
HR dashboard pages included in production build (Recharts chunks load on demand).

### Backend
```bash
cd backend && pip install -r requirements.txt && pytest
```

### Manual UI checks (recommended)
- HR: `/hr`, `/hr/attendance`, `/hr/leave`, `/hr/payroll`, `/hr/performance`, `/hr/recruitment`, `/hr/training`, `/hr/settings`
- Chart of Accounts: `/accounts/chart-of-accounts` — no duplicate rows; row menus work
- Dashboard global search; Store Dashboard product search
- MRP / Purchases / Sales CTA colors per design system

## 7. Recommendations

- Keep the current architecture; avoid duplicate routes, services, or tables for the same business concept.
- **HR:** Add backend models/APIs for recruitment, training programs, and persisted HR settings when product scope confirms; wire dashboards to live data and remove demo-only paths gradually.
- **HR Settings:** Persist general/security preferences via feature-settings or dedicated tenant config; wire 2FA toggle to auth policy if enforced.
- Continue using live backend data as source of truth outside intentional HR demo merge.
- Prefer CSS variables / `ui-btn-*` over one-off hex.
- Run full pytest + frontend build in CI before releases.
- Extend `log_audit()` to HR write operations (leave approve, payroll create) per SECURITY_REPORT.
- Clean duplicate GL rows in SQLite for affected tenants (dedupe is defensive at API layer).

## 8. Related Documents

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | Product overview, setup, features, API map, HR dashboard table |
| [SECURITY_REPORT.md](./SECURITY_REPORT.md) | Auth hardening, RBAC, tenant isolation, HR UI security notes |

## 9. Change Log

| Date | Note |
|------|------|
| 2026-08-13 | Initial report: live-data inventory fixes, design tokens, Job Card, search UX |
| 2026-08-15 | HR module dashboard pass, Chart of Accounts dedupe, expanded HR nav, `/hr/settings` |
