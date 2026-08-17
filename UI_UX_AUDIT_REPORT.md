# Insights Iva — Frontend UI/UX Audit Report

**Date:** 16 August 2026  
**Scope:** Full React frontend (`frontend/src`)  
**Goal:** Premium, consistent, accessible ERP UI without breaking architecture, APIs, or routes.

---

## Executive Summary

Insights Iva already has a **well-defined design system** in `frontend/src/index.css` (`:root` tokens + `.ui-*` utility classes) and strong shared primitives (`Button`, `DataTable`, `Table`, `KpiCard`, `PageHeader`, `EmptyState`, `Loader`). Adoption is **uneven**: sales/procurement document forms, HR dashboards, and the reference dashboard maintain parallel styling with hundreds of hardcoded hex values.

This pass **hardened shared components first** (buttons, badges, row menus, accounts shell, resource CRUD template, loading chrome) without redesigning working business pages or touching backend logic.

---

## Design System

| Area | Status | Notes |
|------|--------|-------|
| **Colors** | Standardized in `:root` | Brand primary `#0751b2`, action teal `#0f6d84`, semantic success/danger/warning |
| **Typography** | Tokens defined | `--text-xs` … `--text-2xl`, `--font-sans`, `--font-numeric` for KPIs/money |
| **Spacing** | Tokens defined | `--space-*`, `--page-max`, `--card-padding`, `.ui-page`, `.ui-stack` |
| **Buttons** | Centralized | `Button.jsx` + `.ui-btn--{variant}`; accounts buttons now use `ui-btn` classes |
| **Forms** | Centralized | `FormField.jsx` → `Input`, `Select`, `Textarea` with `.ui-input` etc. |
| **Tables** | Centralized | `Table.jsx`, `DataTable.jsx`, `.ui-table-wrap`, horizontal scroll |
| **Badges** | **Fixed** | Merged duplicate `.ui-badge` blocks; legacy + BEM aliases unified |
| **Modals** | **Fixed** | Added `.ui-modal-backdrop` / `.ui-modal` CSS for `common/Modal.jsx` |

### Parallel systems (remaining — not migrated in this pass)

- Sales/procurement document forms (~100+ hex refs each)
- `ReferenceDashboard.jsx` custom KPI/card styling
- HR inline `HrKpiCard` (indigo/violet Tailwind)
- `AnalyticsKpiCard` (slate/blue Tailwind)
- `TemplateSettingsV2.jsx` template swatches

---

## Components Improved

| Component | Change |
|-----------|--------|
| `RowActionMenu.jsx` | Portal + viewport flip; design tokens; `role="menu"` / `menuitem`; Escape to close; fixes clipping in tables |
| `index.css` | Unified badges; modal shell CSS |
| `RouteFallback.jsx` | Uses `.ui-card` + `--color-primary` spinner (was teal/slate) |
| `ResourcePage.jsx` | Uses shared `Button`, `Input`/`Select`/`Textarea`, `.ui-card` |
| `accountsDesignSystem.jsx` | Tokens map to CSS vars; tabs/KPI/search/pagination/buttons/tables aligned |
| `RowActionMenu.test.jsx` | Updated for `menuitem` role |

---

## Pages Improved (via shared components)

Any page using these primitives benefits automatically:

- **ResourcePage consumers** — production, quality, maintenance list pages using generic CRUD shell
- **Accounts V2 module** — Ledger, Chart of Accounts, Balance Sheet, Reports (via `accountsDesignSystem`)
- **All `RowActionMenu` consumers** — HR, quality, procurement, masters row actions
- **Lazy-loaded routes** — consistent loading card via `RouteFallback`

No individual sales document pages were rewritten (intentionally — high risk, low incremental gain vs shared fixes).

---

## Functional Issues Fixed

| Issue | Fix |
|-------|-----|
| Three-dot menus clipped inside scrollable tables | `RowActionMenu` renders via portal with viewport positioning |
| Inconsistent badge appearance (duplicate CSS) | Single badge definition |
| Orphan `Modal.jsx` missing styles | Modal backdrop/panel CSS added |
| Accounts module purple palette diverged from product brand | Mapped to global `--color-primary` tokens |

**No routing, API, or backend changes.**

---

## Responsive Issues Addressed

- Row action menus flip above trigger when near bottom of viewport
- Accounts tables retain `overflow-x-auto` via `ui-table-wrap`
- Existing `DataTable` horizontal scroll unchanged

---

## Accessibility Improvements

| Improvement | Location |
|-------------|----------|
| `aria-expanded`, `aria-haspopup="menu"` on action trigger | `RowActionMenu` |
| `role="menu"` / `role="menuitem"` | `RowActionMenu` |
| Visible focus ring on action trigger | `RowActionMenu` |
| Escape closes action menu | `RowActionMenu` |
| `role="status"` + `aria-label` on route loading | `RouteFallback` |
| Form labels/errors via `FormField` on ResourcePage create modal | `ResourcePage` |

---

## Testing

| Check | Result |
|-------|--------|
| **Frontend build** | Pass (`npm run build`) |
| **Vitest** | **29/29 pass** (after RowActionMenu test update) |
| **Playwright** | Not configured in project — no e2e browser suite |
| **Browser console** | Not run in CI; manual smoke recommended on key flows |
| **Screenshots** | No reference screenshot baseline in repo |

### Recommended next test steps

1. Add Playwright with smoke tests for login → dashboard → inventory list → sales list
2. Visual regression on Accounts V2 + one sales list after token alignment

---

## Remaining Issues (genuine)

| Priority | Issue |
|----------|-------|
| High | Sales/procurement document forms still use page-local hex styling (~100+ refs each) |
| High | `FormField` / `Button` low adoption outside ResourcePage and accounts shell |
| Medium | HR dashboards use inline KPI cards instead of `common/KpiCard` |
| Medium | `AnalyticsKpiCard` separate from design tokens |
| Medium | Full-bleed sales/accounts routes bypass `.ui-page` wrapper — padding varies |
| Low | 50+ domain modals duplicate footer button rows instead of shared `ModalFooter` |
| Low | `xlsx` export chunk size / npm audit advisories (dependency, not UI) |

---

## Implementation Strategy Used

1. Audited project structure and design tokens  
2. Fixed **shared components** (badges, row menu, modal CSS, RouteFallback, ResourcePage, accountsDesignSystem)  
3. Ran build + Vitest  
4. Documented remaining page-level drift for incremental migration  

---

## Related Documentation

- [README.md](./README.md) — design system overview, UI tokens table  
- [SECURITY_REPORT.md](./SECURITY_REPORT.md) — auth/session (separate from visual UX)  
- [PROJECT_ANALYSIS_REPORT.md](./PROJECT_ANALYSIS_REPORT.md) — architecture and live-data notes  
