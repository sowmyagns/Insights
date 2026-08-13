# Insights Iva

**Insights Iva** is a full-stack manufacturing ERP and business intelligence platform. It unifies production, inventory, procurement, sales, finance/accounting, HR, quality, maintenance, alerts, documents, and analytics in a multi-tenant SaaS application.

**Tagline:** Business Intelligence • Analytics • AI

Security hardening (auth lockout, email verification, refresh tokens, RBAC, tenant isolation, headers) is documented in [SECURITY_REPORT.md](./SECURITY_REPORT.md). Architecture and recent UI/live-data analysis: [PROJECT_ANALYSIS_REPORT.md](./PROJECT_ANALYSIS_REPORT.md).

## Branding & Assets

| Item | Location | Usage |
|------|----------|--------|
| **Product name** | — | **Insights Iva** (browser title, sidebar, login, landing, i18n) |
| **Tagline** | `frontend/src/locales/en.json` → `nav.tagline` | Business Intelligence • Analytics • AI |
| **Logo** | `frontend/public/logo.png` | Favicon + UI branding |
| **Auth hero image** | `frontend/public/auth/slide-1.png` | Login/Register slider + landing hero background |
| **Brand component** | `frontend/src/components/common/BrandLogo.jsx` | Reusable logo with `sm` / `md` / `lg` / `xl` / `hero` sizes |

### Where the logo appears

- **Landing page** — navigation bar, hero section, footer
- **Login & Register** — header above the form title
- **Sidebar** — app header (logo only when collapsed)
- **Loading screen** — shown while the app bootstraps (`main.jsx`)
- **Browser tab** — favicon via `<link rel="icon" href="/logo.png">` in `index.html`

### Auth slider images

The sign-in / sign-up right panel (`AuthSlider.jsx`) rotates background slides:

| File | Slide | Fallback |
|------|-------|----------|
| `frontend/public/auth/slide-1.png` | Insights Iva (installed) | — |
| `frontend/public/auth/slide-2.png` | Analytics | Themed gradient if missing |
| `frontend/public/auth/slide-3.png` | Inventory | Themed gradient if missing |

### Replace the logo

1. Save your image as `frontend/public/logo.png` (PNG recommended; keep a wide aspect ratio).
2. Refresh the app — `BrandLogo` loads from `/logo.png` with no code changes.

**Note:** Demo tenant emails (`@smrt.local`) are sample data, not the product brand.

To add or replace slides, drop PNG/JPG files into `frontend/public/auth/` using the names above. See `frontend/public/auth/README.txt` for copy commands.

## Tech Stack

- **Backend:** Python, FastAPI, SQLAlchemy, SQLite
- **Frontend:** React 18, Vite, React Router, Axios, Tailwind CSS, React i18next

### Frontend performance

- **Route-level code splitting** – Each page is loaded on demand (`lazyPages.jsx` + `React.lazy`), so the initial JS bundle stays small (~77 KB gzip for the main entry vs. a single 500+ KB chunk before).
- **Localized Suspense** – While a chunk loads, a **light inline fallback** (`RouteFallback`) appears in the main area only; the sidebar/nav stay mounted so navigation doesn’t feel like a full reload.
- **Vendor chunking** – `vite.config.js` splits **recharts**, **react-vendor**, **i18n**, **axios**, and **export-libs** (xlsx/jspdf) so the browser can cache them and load them in parallel only when needed.
- **Dashboard** – Chart code lives in the `recharts` chunk and is fetched only when the user opens the dashboard.

### UI design system (colors & buttons)

Central tokens live in `frontend/src/index.css` (`:root`). Prefer CSS variables and shared button classes over page-specific hex.

| Role | Token / class | Typical use |
|------|---------------|-------------|
| Primary | `--color-primary` / `ui-btn-primary` | Standard primary actions |
| Success | `--color-success` (`#036F71`) / `ui-btn-success` | Complete / produce / planning CTAs |
| Action teal | `--color-action-teal` (`#0F6D84`) | Selective purchase/payment CTAs |
| Action blue | `--color-action-blue` (`#7E93CC`) | Selective invoice create |
| Soft blue | `--color-primary-soft` (`#BBDEFC`) | Light secondary CTAs (e.g. Create Vendor) |
| Warning / CTA yellow | `--color-cta` / `ui-btn-cta` | Use **selectively** for warnings & attention—not every Create button |
| Danger | `--color-danger` / `ui-btn-danger` | Delete / destructive |

JS mirrors: `frontend/src/theme/colors.js`, `frontend/src/styles/theme.js`. Shared component: `ActionButton` (`frontend/src/components/common/ActionButton.jsx`).

**Global search** (navbar): `GlobalSearch` — nested input wrapper (icon does not jump when results open), clear control, Escape / click-outside.

## Features

### Production Management
- Production planning (orders, scheduling)
- MRP (material requirement planning) with links to production planning
- Work orders
- **Job Card** (`/production/job-card`) — shop-floor document view over live work orders (list + detail workflow); create via quick work order
- Batch tracking
- Machine status monitoring
- Daily production reports

### Inventory & Raw Material Management
- Store dashboard (`/inventory/dashboard`) with product search (stable icon, clear, empty state)
- Raw materials & finished goods (`/inventory/raw-materials`, `/inventory/finished-goods`)
- Stock transfer, adjustment, ledger, warehouses (`/inventory/warehouses`)
- Inventory settings (`/inventory/settings`)
- Low stock alerts; barcode scan/manual lookup; stock movements
- Sidebar **Inventory** (`/inventory`) opens the products/items list UI (same component as Masters → Products, titled Inventory)

### Masters (Customers / Vendors / Products)
- **Customers** (`/sales/customers`) — list, create/edit modal, export; bulk import at `/sales/customers/bulk-import`
- **Vendors** (`/procurement/vendors`) — list, create/edit modal, export; full form at `/procurement/vendors/create`; bulk import at `/procurement/vendors/bulk-import`
- **Products** (`/masters/products`) — list, create/edit modal; create form at `/masters/products/create`; bulk import at `/masters/products/bulk-import`
- Deep-link create for customers: `/sales/customers/create` → opens the create modal on the list page

### Purchases & Procurement
- **Purchases** sidebar: Purchase (`/purchases`), Payments Made, Debit Note, Purchase Order
- Purchase orders, material requests, goods receipt (GRN), supplier payments
- **Enterprise Vendor Master** (`/procurement/vendors`) on the existing `suppliers` table
  - Company, contact, GST, address (PIN auto-fill), bank & procurement terms
  - Auto vendor codes (`VEN-0001` style), soft delete
  - Detail route `/procurement/vendors/:id` (overview, purchase history, products, payments, documents, performance, audit)
  - **Bank verification:** Account Number + IFSC via lookup API; bank name/branch auto-fill
- Roles with vendor access/write: Admin, Purchase Manager, Procurement Manager, Store Manager (Production Manager may see write UI where permitted)

### HR & Employee Management
- Worker attendance (clock in/out)
- Shift management
- Payroll
- Overtime calculation
- Performance tracking

### Sales & Billing Module
- Tax invoices, quotations, payment receipts, refund vouchers, proforma / export invoices, delivery challans, credit & debit notes
- e-Invoice and E-Waybill login helpers; digital signature page
- GST billing (SGST, CGST, IGST); payment tracking
- Customer management (Masters → Customers)

### Accounts & Reports
- Ledger, expense, expense settings, chart of accounts, manual journal entries
- Balance sheet, profit & loss, accounting reports, restore deleted documents
- Export to Excel / PDF where supported
- Legacy finance views (AP/AR/payment tracking/general ledger) remain routed under `/finance/*` where applicable

### Quality Control
- Quality inspection
- Defect tracking
- Batch quality reports
- Compliance logs

### Maintenance
- Machine maintenance
- Preventive maintenance
- Breakdown reports
- Maintenance schedule

### Analytics
- Production analytics
- Machine efficiency
- Inventory analytics
- Profit analysis

### Alerts & Notifications
- Low stock alerts
- Machine failure alerts
- Production delay alerts
- Maintenance reminders

### Notification Management (In-App Bell)
- Notification bell in the top navigation bar with live unread badge
- Per-user notifications stored in SQLite (`erp_notifications`)
- Types: Information, Success, Warning, Error, Production, Inventory, Quality, Maintenance, Sales, HR, Finance, System
- Priorities: Low, Medium, High, Critical
- Actions: open (auto mark-read), mark as read, mark all as read, delete, clear all (with confirmation)
- Optimistic UI updates — badge decrements instantly (e.g. 5 → 4 → 0) without page refresh
- Paginated notification list with infinite scroll in the dropdown
- Demo notifications seeded for each user on first backend start

### Multi-Language Support
- **Languages:** English, Hindi (हिन्दी), Tamil (தமிழ்), Telugu (తెలుగు)
- Language selector in top navigation bar
- Full UI translation (sidebar, pages, buttons, labels, messages)
- Selection persisted in localStorage across page refresh

## User Flows (High-Level)

All flows follow the pattern: **Select → Enter → Save → View**. Tasks complete in **3 steps max**.

### 1. Overall Insights Iva Flow
Login → Dashboard → Choose Module → Perform Action → Save Data → View Reports

### 2. Production Management
Dashboard → Production Module → **Create Work Order** (3 fields: Product, Quantity, Machine) → Assign Machine → Start Production → Track Status → Complete Production → Move to Inventory

- **Quick Create Work Order:** Dashboard → Click "Create Work Order" → Fill 3 fields → Save → Done ✅

### 3. Inventory
Store Dashboard / Raw Materials / Finished Goods → Stock movements → Low Stock Alert → Reorder. Products list also available under Masters → Products and sidebar Inventory (`/inventory`).

### 3b. Vendor Master (Procurement)
Vendors → Create Vendor (modal or `/procurement/vendors/create`) → Fill company & contact → Optional bank verify → Save → Detail / PO. Bulk import: `/procurement/vendors/bulk-import`.

### 4. Sales
Customers (create modal or `/sales/customers/create`) → Invoice / Quotation / Receipt flows → Receive payment. Bulk buyers: `/sales/customers/bulk-import`.

### 5. HR (Employee)
Add Employee → Assign Role → Track Attendance → Calculate Payroll → Generate Salary Report

### 6. Machine Monitoring
Add Machine → Track Status → Detect Issue → Create Maintenance Task → Fix Machine → Update Status

### 7. Reports & Analytics
Dashboard → Select Report → Apply Filters → View Data → Export (PDF/Excel)

### 8. User / Admin
Login → Admin Panel → Create User → Assign Role → Set Permissions

## Project Structure

```
Insights Iva/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, router registration, DB init
│   │   ├── core/                # Config, database, seed_tenant, seed_roles, seed_users, seed_products
│   │   ├── models/              # SQLAlchemy: user, tenant, role, production, inventory, erp_notification, …
│   │   ├── schemas/             # Pydantic request/response models
│   │   ├── repositories/        # Data access layer (e.g. notification_repository)
│   │   ├── services/            # Business logic layer
│   │   ├── routers/             # /api/notifications, /api/dashboard, /api/production, …
│   │   └── api/                 # Legacy module routers: auth, sales, inventory, alerts, …
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── public/
│   │   ├── logo.png             # Insights Iva product logo (favicon + UI)
│   │   └── auth/
│   │       ├── slide-1.png      # Auth slider / landing hero background
│   │       ├── slide-2.png      # Optional (gradient fallback if missing)
│   │       └── slide-3.png      # Optional (gradient fallback if missing)
│   ├── src/
│   │   ├── api/                 # axiosConfig, notificationService, productionApi, salesApi, …
│   │   ├── components/          # layout (Navbar, Sidebar), notifications, common (BrandLogo, ConfirmationDialog, …)
│   │   ├── context/             # AuthContext, ToastContext, SettingsContext
│   │   ├── hooks/               # useAuth, useNotifications
│   │   ├── pages/               # auth, dashboard, production, inventory, procurement, sales, accounts, hr, quality, maintenance, analytics, alerts, admin, documents, settings
│   │   └── routes/              # AppRoutes, lazyPages (code-split)
│   ├── package.json
│   └── .env
│
├── README.md
├── SECURITY_REPORT.md
└── PROJECT_ANALYSIS_REPORT.md
```
### Backend Code Map

| Module | API (`app/api/`) | Service (`app/services/`) | Models |
|--------|------------------|---------------------------|--------|
| Auth | auth.py | auth_service.py, security_service.py | user, tenant, role; security tokens |
| Production | production.py / production_api | production_service.py, job_card_service.py | production, product, machine, work orders |
| Inventory | inventory.py | inventory_service.py | inventory (Warehouse, Supplier/Vendor, Item, StockLevel, StockMovement) |
| Procurement | procurement.py | procurement_service.py, vendor_service.py, bank_lookup_service.py | procurement (PurchaseOrder, MaterialRequest, GoodsReceipt, SupplierPayment); VendorProduct; Supplier enterprise fields |
| Sales | sales.py | sales_service.py | sales (Customer, SalesOrder, Invoice, Payment) |
| Accounts | accounts.py | accounts_service.py | accounts (Income, Expense) |
| HR | hr.py | hr_service.py | hr (Employee, Shift, Attendance, Payroll, Performance) |
| Analytics | analytics.py | analytics_service.py | aggregates from other modules |
| Quality | quality.py | quality_service.py | quality (Inspection, Defect, BatchReport, Compliance) |
| Maintenance | maintenance.py | maintenance_service.py | maintenance (Record, Preventive, Breakdown, Schedule) |
| Alerts | alerts.py | alert_service.py | alert |
| Notifications | routers/notifications_api.py | notification_management_service.py | erp_notification |
| Admin | admin.py | admin_service.py | admin (AccessLog) |
| Documents | documents.py | document_service.py | document |

### Frontend Code Map

| Area | Pages | API Client |
|------|-------|------------|
| Auth | Login, Register | authApi, `BrandLogo`, `AuthSlider` |
| Dashboard | Dashboard (KPIs, charts) | productionApi, inventoryApi, hrApi, analyticsApi, accountsApi |
| Production | Planning, MRP, WorkOrders, JobCard, BatchTracking, MachineStatus, DailyReports, CreateProduction, CreateMachine | productionApi |
| Inventory | Dashboard (product search), RawMaterials, FinishedGoods, Warehouses, Stock*, CreateItem | inventoryApi |
| Masters | Customers, BulkImportBuyer; VendorManagement, BulkImportSeller, CreateVendor, VendorDetail; ProductsMaster, BulkImportProduct, CreateProduct; BomMaster, DepartmentManagement | salesApi, procurementApi, productsApi |
| Procurement / Purchases | PurchaseOrders, MaterialRequests, GoodsReceipt, SupplierPayments; Purchases, PaymentsMade, DebitNotes (+ create pages) | procurementApi, bizDocumentsApi |
| Sales | Invoices, Quotations, PaymentReceipts, Customers, document forms | salesApi |
| Accounts | Ledger, Expense, ChartOfAccounts, ManualJournal, BalanceSheet, ProfitLoss, Reports | accountsApi |
| HR | HRDashboard, Attendance, Shifts, Payroll, Performance, Employees + create pages | hrApi |
| Quality, Maintenance, Analytics, Alerts | Inspection, Defects, BatchReports, Compliance; MachineMaintenance, Preventive, Breakdowns, Schedule; Production/Machine/Inventory/Profit analytics; AllAlerts, LowStock, etc. | quality/maintenance/analytics/alert APIs |
| Admin, Documents, Settings | UserManagement, RolesPermissions, AccessLogs; Purchase/Production/Quality/Reports docs; Settings sub-pages | adminApi, document APIs |
| Notifications (navbar bell) | NotificationBell, NotificationDropdown, NotificationItem | notificationService |

## Notification Management System

Enterprise in-app notifications for authenticated users. Each user sees only their own notifications (scoped by `tenant_id` + `user_id`).

### Architecture

```
React (NotificationBell) → notificationService.js → FastAPI Router → Service → Repository → SQLite
```

| Layer | Location |
|-------|----------|
| Model | `backend/app/models/erp_notification.py` |
| Repository | `backend/app/repositories/notification_repository.py` |
| Service | `backend/app/services/notification_management_service.py` |
| API | `backend/app/routers/notifications_api.py` |
| Seed | `backend/app/core/seed_notifications.py` |
| Frontend API | `frontend/src/api/notificationService.js` |
| Hook | `frontend/src/hooks/useNotifications.js` |
| Components | `frontend/src/components/notifications/` |

### Database (`erp_notifications`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer | Primary key |
| `tenant_id` | integer | FK → tenants |
| `user_id` | integer | FK → users (recipient) |
| `title` | string | Notification title |
| `message` | text | Body text |
| `type` | string | information, success, warning, error, production, inventory, quality, maintenance, sales, hr, finance, system |
| `priority` | string | low, medium, high, critical |
| `module` | string | ERP module source |
| `action_url` | string | Optional deep-link (e.g. `/production/work-orders`) |
| `is_read` | boolean | Read status |
| `created_by` | string | Display name of creator |
| `created_at` | datetime | Auto-set |
| `updated_at` | datetime | Auto-set |

**Indexes:** `user_id`, `is_read`, `created_at`

### API Endpoints

All endpoints require JWT (`Authorization: Bearer <token>`).

Every response uses the standard envelope:

```json
{
  "success": true,
  "message": "",
  "data": {},
  "errors": null,
  "timestamp": "2026-07-12T08:53:00+00:00"
}
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | Paginated list (`page`, `page_size`) |
| `GET` | `/api/notifications/unread-count` | Unread count only |
| `PUT` | `/api/notifications/{id}/read` | Mark one notification as read |
| `PUT` | `/api/notifications/read-all` | Mark all unread as read |
| `DELETE` | `/api/notifications/{id}` | Delete one notification |
| `DELETE` | `/api/notifications/clear` | Delete all notifications for the current user |

**Business rules**
- Unread count is always derived from `is_read = false` rows for the logged-in user.
- Opening a notification automatically marks it as read (badge decrements immediately).
- Marking an already-read notification again does not change the count.
- Clear/delete operations affect only the current user's notifications.

### Frontend Components

| Component | Purpose |
|-----------|---------|
| `NotificationBell` | Bell icon + badge in navbar; wires dropdown and actions |
| `NotificationBadge` | Unread count badge (caps at `9+`) |
| `NotificationDropdown` | Scrollable list, mark-all, clear-all, load-more |
| `NotificationItem` | Single row with type/priority styling, read vs unread |
| `ConfirmationDialog` | Reusable confirm modal (used for clear-all) |

### Try It

1. Start backend and frontend (see Setup below).
2. Register a tenant admin and log in with your own company email.
3. Click the bell icon in the top bar — demo notifications are created for local testing.
4. Open notifications one by one; the badge count drops instantly (5 → 4 → … → 0).
5. Use **Mark all read**, **Clear** (confirmation dialog), or per-item delete/mark-read actions.

## Settings API (Users, Roles, Permissions, Audit Logs)

Backend support for the **Settings** sidebar pages. Requires JWT and **Admin** role.

### Architecture

```
React (Settings pages) → /admin/* or /api/settings/* → SettingsService → rbac_service → SQLite
```

| Layer | File |
|-------|------|
| Service | `backend/app/services/settings_service.py` |
| RBAC logic | `backend/app/services/rbac_service.py` |
| Legacy router | `backend/app/api/admin.py` → `/admin/*` (flat JSON) |
| Enterprise router | `backend/app/routers/settings_api.py` → `/api/settings/*` (envelope) |

### Endpoints

**Users** (`/admin/users` or `/api/settings/users`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List all users with roles |
| GET | `/users/stats` | Total, active, administrator counts |
| GET | `/users/{id}` | Single user |
| POST | `/users` | Create user |
| PUT | `/users/{id}` | Update user |
| DELETE | `/users/{id}` | Delete user |

**Roles** (`/admin/roles` or `/api/settings/roles`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/roles` | List roles with permission summary & user count |
| GET | `/roles/{id}` | Single role |
| POST | `/roles` | Create role |
| PUT | `/roles/{id}` | Update role name, description, permissions |
| PUT | `/roles/{id}/permissions` | Update permissions only (`/admin` only) |
| DELETE | `/roles/{id}` | Delete role |

**Permissions** (`/admin/permissions/*` or `/api/settings/permissions/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/permissions/modules` | Module catalogue for checkboxes |
| GET | `/permissions/matrix` | Default role → module matrix |
| GET | `/permissions` | All roles with permissions (`/api/settings` only) |
| PUT | `/permissions/{role_id}` | Update role permissions (`/api/settings` only) |

**Audit Logs** (`/admin/access-logs` or `/api/settings/audit-logs`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/access-logs` | Activity list (flat array, legacy) |
| GET | `/audit-logs` | Paginated logs with `search`, `page`, `page_size` |

Login events are recorded automatically via `POST /auth/login`.

### User Accounts

The application uses registration and tenant-based user management. There are no default seeded users with production credentials.

## Prerequisites

- Python 3.10+
- Node.js 18+

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env` (optional):

```env
DATABASE_URL=sqlite:///./smrt.db
```

No extra database server is required. The SQLite file `backend/smrt.db` is created automatically on first backend start.

### DB Browser for SQLite

- **File location:** `backend/smrt.db` (relative to the backend folder when you run uvicorn from `backend/`)
- **Open the database:** Use [DB Browser for SQLite](https://sqlitebrowser.org/) to inspect tables and data
- **Important:** Stop the backend before opening the file in DB Browser — SQLite uses file locking while the app is running
- The first administrative user is created through `POST /auth/register`.

Run the backend:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs (title: **Insights Iva API**)

### 2. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Run the frontend:

```bash
npm run dev
```

App: http://localhost:5173 (title: **Insights Iva**)

### Docker (optional)

```bash
docker compose up --build
```

| Service | URL | Notes |
|---------|-----|--------|
| Frontend | http://localhost:8080 | Nginx serves the built app + proxies API routes |
| Backend | http://localhost:8000 | SQLite persisted in Docker volume `smrt_data` |

The frontend image is built with `VITE_API_BASE_URL=""` so API calls use same-origin routing through nginx.

## Auth API (Login & Registration)

Base URL: `http://localhost:8000` (or your `VITE_API_BASE_URL`).

### POST `/auth/login`

**Request (JSON):**

| Field      | Type   | Required |
|-----------|--------|----------|
| `email`   | string | Yes      |
| `password`| string | Yes      | Min **12** characters on register / reset |

**Response (200):** JWT pair + user (includes `refresh_token` when issued).

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<opaque>",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "Admin User",
    "tenant_id": 1,
    "tenant_name": "Company Name",
    "role": "Admin"
  }
}
```

**Errors:** `401` — `"Invalid Credentials"` (generic); `429` — account lockout.

### POST `/auth/register`

**Request (JSON):**

| Field           | Type   | Required | Notes        |
|----------------|--------|----------|--------------|
| `company_name` | string | Yes      | New tenant   |
| `full_name`    | string | Yes      |              |
| `email`        | string | Yes      | Valid email  |
| `password`     | string | Yes      | Min **12** chars |

**Response (200):** Same shape as login in development (auto-verified). In production, email verification may be required before login — see [SECURITY_REPORT.md](./SECURITY_REPORT.md).

**Errors:** `409` — Email already registered.

### Frontend

- **Login** (`/login`): `POST /auth/login`, stores `smrt-token` / `smrt-refresh-token` / `smrt-user`. Axios refreshes on 401.
- **Register** (`/register`): `POST /auth/register`.
- **Forgot / reset / verify:** `/forgot-password`, `/reset-password`, `/verify-email`.

Optional `backend/.env` (security-related — full list in SECURITY_REPORT):

```env
JWT_SECRET_KEY=your-long-random-secret
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173
```

## Usage

1. **Login:** API login with your registered company email and password.
2. **Language:** Click the Language button (🌐) in the top bar to switch between English, Hindi, Tamil, or Telugu.
3. **Notifications:** Click the bell icon (🔔) in the top bar to view in-app notifications. Unread items are highlighted; opening one marks it read and updates the badge without refreshing the page.
4. **Dashboard:** View production, inventory, HR, and machine status summaries. Use the top **search** bar to jump to pages.
5. **Production:** Create production orders, work orders, machines; open **Job Card** for shop-floor workflow views; track batches and daily reports. Tables support search, sorting, pagination.
6. **Inventory / Materials:** Store dashboard (product search), raw materials, finished goods, warehouses, stock movements; products also under Masters → Products.
7. **Masters:** Customers, Vendors, Products — create/edit via modals; bulk import pages for each.
8. **Purchases / Procurement:** Purchases, payments made, debit notes, Vendor Master, purchase orders, material requests, GRN, supplier payments.
9. **Sales:** Invoices, quotations, payment receipts, and related sales documents.
10. **Accounts:** Ledger, expenses, chart of accounts, journals, P&L, balance sheet, reports.
11. **Settings:** Theme, language, company profile, invoice/format/template/sector/sequence settings where enabled.

## API Overview

| Prefix | Endpoints |
|--------|-----------|
| `/auth/` | `POST /login`, `POST /register`, `POST /refresh`, `POST /logout`, verify-email, forgot/reset-password |
| `/production/` | products, orders, work-orders, **job-cards** (list/detail), batches, machines, machine-status, daily-reports, MRP-related endpoints as exposed |
| `/inventory/` | warehouses, suppliers, items, items/barcode/{barcode}, dashboard, stock-levels, stock-movements |
| `/procurement/` | purchase-orders, **vendors** (CRUD, soft-delete, bulk-status, summary, export, purchase-history, products, bank-lookup), material-requests, goods-receipt, supplier-payments |
| `/hr/` | dashboard, employees, shifts, attendance (clock-in, clock-out), payroll, performance |
| `/sales/` | customers, sales-orders, invoices, invoices/{id}, payments |
| `/accounts/` | ledger/accounting APIs as exposed by accounts router; income/expenses where enabled |
| `/analytics/` | production-trend, machine-efficiency, inventory-turnover, worker-performance, profit, dashboard |
| `/quality/` | inspection, defects, batch-reports, compliance |
| `/maintenance/` | records, preventive, breakdowns, schedule |
| `/alerts/` | list, create, acknowledge |
| `/api/notifications` | list, unread-count, mark read, mark all read, delete, clear (JWT) |
| `/admin/` | users, users/stats, roles, permissions/modules, access-logs (Admin JWT) |
| `/api/settings/` | users, roles, permissions, audit-logs (Admin JWT, envelope) |
| `/documents/` | list, create |

All list endpoints accept `tenant_id` as a query parameter (default: 1 for demo). Full docs: http://localhost:8000/docs

---

## Future Upgrades (Roadmap)

| Feature | Description |
|---------|-------------|
| **IoT Machine Integration** | Real-time machine data feeds, sensor connectivity, OEE metrics |
| **AI Production Prediction** | Demand forecasting, production optimization, anomaly detection |
| **Mobile App (React Native)** | Native mobile app for on-floor data entry, approvals, and notifications |

---

## License

Private / Internal Use
