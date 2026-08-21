import {
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Factory,
  FolderOpen,
  GitBranch,
  Landmark,
  Layers,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

/**
 * Insights Iva sidebar structure. Children are filtered by RBAC per-item `module`.
 * Routes map to existing pages where available; others use /erp/* placeholders.
 */
export const SIDEBAR_NAV = [
  {
    key: "dashboard",
    labelKey: "erpNav.dashboard",
    to: "/",
    icon: LayoutDashboard,
    module: "dashboard",
    end: true,
  },
  {
    key: "manufacturing-workflow",
    labelKey: "erpNav.roleWorkflow",
    label: "Manufacturing Workflow",
    to: "/manufacturing/workflow",
    icon: GitBranch,
    module: "dashboard",
    end: true,
  },
  {
    key: "masters",
    labelKey: "erpNav.masters",
    label: "Masters",
    icon: Layers,
    children: [
      { label: "Customers", to: "/masters/customers", module: "masters" },
      { label: "Vendors", to: "/procurement/vendors", module: "masters" },
      { label: "Products", to: "/masters/products", module: "masters" },
    ],
  },
  {
    key: "production",
    labelKey: "erpNav.production",
    icon: Factory,
    children: [
      { labelKey: "erpNav.productionPlanning", to: "/production/planning", module: "production" },
      { labelKey: "erpNav.workOrders", to: "/production/work-orders", module: "production" },
      { labelKey: "erpNav.jobCard", label: "Job Card", to: "/production/job-card", module: "production" },
      { labelKey: "erpNav.roleWorkflow", label: "Manufacturing Workflow", to: "/manufacturing/workflow", module: "production" },
      { labelKey: "erpNav.productionSchedule", to: "/production/schedule", module: "production" },
      { labelKey: "erpNav.machineAllocation", to: "/production/tasks", module: "production" },
      { labelKey: "erpNav.dailyProductionReports", to: "/production/reports", module: "production" },
    ],
  },
  {
    key: "inventory",
    labelKey: "erpNav.inventory",
    label: "Inventory",
    icon: Boxes,
    module: "inventory",
    children: [
      { label: "Inventory", to: "/inventory", module: "inventory", end: true },
      { label: "Store Dashboard", to: "/inventory/dashboard", module: "inventory" },
      { labelKey: "erpNav.rawMaterials", to: "/inventory/raw-materials", module: "inventory" },
      { labelKey: "erpNav.finishedGoods", to: "/inventory/finished-goods", module: "inventory" },
      { labelKey: "erpNav.stockTransfer", to: "/inventory/stock-transfer", module: "inventory" },
      { labelKey: "erpNav.stockAdjustment", to: "/inventory/stock-adjustment", module: "inventory" },
      { labelKey: "erpNav.stockLedger", to: "/inventory/stock-ledger", module: "inventory" },
      { labelKey: "erpNav.warehouses", to: "/inventory/warehouses", module: "inventory" },
      { label: "Inventory Settings", to: "/inventory/settings", module: "inventory" },
    ],
  },
  {
    key: "procurement",
    label: "Purchases",
    labelKey: "erpNav.procurement",
    icon: ShoppingCart,
    children: [
      { label: "Purchase", to: "/purchases", module: "procurement" },
      { label: "Payments Made", to: "/purchases/payments-made", module: "procurement" },
      { label: "Debit Note", to: "/purchases/debit-notes", module: "procurement" },
      { label: "Purchase Order", to: "/procurement/purchase-orders", module: "procurement" },
    ],
  },
  {
    key: "hr",
    label: "HR",
    labelKey: "erpNav.hr",
    icon: Users,
    children: [
      // Dashboard
      { label: "HR Dashboard", to: "/hr", module: "hr", end: true },
      { label: "Announcements", to: "/hr/announcements", icon: Bell, module: "hr", end: true },
      // Employee Management
      {
        key: "hr-employees",
        label: "Employee Management",
        module: "hr",
        children: [
          { label: "Preboarding", to: "/hr/preboarding", module: "hr" },
          { label: "All Employees", to: "/hr/onboarding", module: "hr" },
        ],
      },
      // Attendance
      {
        key: "hr-attendance",
        label: "Attendance",
        module: "hr",
        children: [
          { label: "View", to: "/hr/attendance", module: "hr" },
          { label: "Approval", to: "/hr/attendance-approval", module: "hr" },
          { label: "Overtime", to: "/hr/shifts-overtime", module: "hr" },
        ],
      },
      {
        key: "hr-shifts",
        label: "Shift Management",
        module: "hr",
        children: [
          { label: "Manage Shifts", to: "/hr/manage-shifts", module: "hr" },
          { label: "Manage Monthly Shift", to: "/hr/manage-monthly-shifts", module: "hr" },
          { label: "Set Weekly Off", to: "/hr/set-weekly-off", module: "hr" },
        ],
      },
      {
        key: "hr-leaves",
        label: "Leave Tracker",
        module: "hr",
        children: [
          { label: "My Leaves", to: "/hr/leave", module: "hr" },
          { label: "Leave Approvals", to: "/hr/leave-approvals", module: "hr" },
          { label: "Holiday", to: "/hr/holidays", module: "hr" },
          { label: "Leave Adjustment", to: "/hr/leave-adjustment", module: "hr" },
          { label: "Leave Plans", to: "/hr/leave-plans", module: "hr" },
        ],
      },
      {
        key: "hr-expenses",
        label: "Expense Management",
        module: "hr",
        children: [
          { label: "Overview", to: "/hr/expenses?view=expenses-overview", module: "hr" },
        ],
      },
      { label: "Site Visit", to: "/hr/site-visits", module: "hr" },
      {
        key: "hr-assets",
        label: "Asset Management",
        module: "hr",
        children: [
          { label: "Company Assets", to: "/hr/asset-management", module: "hr" },
        ],
      },
      {
        key: "hr-payroll",
        label: "Payroll",
        module: "hr",
        children: [
          { label: "Statutory Components", to: "/hr/statutory-components", module: "hr" },
          { label: "Salary Breakup", to: "/hr/salary-breakup", module: "hr" },
          { label: "Monthly Pay", to: "/hr/monthly-pay", module: "hr" },
          { label: "Salary On Hold", to: "/hr/salary-on-hold", module: "hr" },
          { label: "My Payslips", to: "/hr/pay-slips", module: "hr" },
          { label: "Settings", to: "/hr/settings", module: "hr" },
        ],
      },
      {
        key: "hr-reports",
        label: "MIS Reports",
        module: "hr",
        children: [
          { label: "Employee Report",   to: "/hr/employee-report",   module: "hr" },
          { label: "Leave Report",      to: "/hr/leave-report",      module: "hr" },
          { label: "Expense Report",    to: "/hr/expense-report",    module: "hr" },
          { label: "Site Visit Report", to: "/hr/site-visit-report", module: "hr" },
        ],
      },
      {
        key: "hr-configuration",
        label: "Configuration",
        module: "hr",
        children: [
          { label: "Organization Setup", to: "/hr/organization-setup", module: "hr" },
        ],
      },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    labelKey: "erpNav.sales",
    icon: Wallet,
    children: [
      { label: "Invoices", to: "/sales/invoices", module: "sales" },
      { label: "Quotations", to: "/sales/quotations", module: "sales" },
      { label: "Payment Receipts", to: "/sales/payment-receipts", module: "sales" },
      { label: "Refund Vouchers", to: "/sales/refund-vouchers", module: "sales" },
      { label: "Proforma Invoice", to: "/sales/proforma-invoices", module: "sales" },
      { label: "Export Invoice", to: "/sales/export-invoices", module: "sales" },
      { label: "Export Proforma Invoice", to: "/sales/export-proforma-invoices", module: "sales" },
      { label: "Delivery Challans", to: "/sales/delivery-challans", module: "sales" },
      { label: "Credit Note", to: "/sales/credit-notes", module: "sales" },
      { label: "e-Invoice", to: "/sales/e-invoice", module: "sales" },
      { label: "Sales Debit Note", to: "/sales/debit-notes", module: "sales" },
      { label: "E-Waybill Login", to: "/ewaybill/login", module: "sales" },
      { label: "Digital Signature", to: "/digital-signature", module: "sales" },
    ],
  },
  {
    key: "expense",
    label: "Expense",
    to: "/accounts/expenses",
    icon: Wallet,
    module: "accounts",
  },
  {
    key: "finance",
    label: "Accounting",
    labelKey: "erpNav.finance",
    icon: Landmark,
    children: [
      { label: "Ledger", to: "/accounts/ledger", module: "accounts" },
      { label: "Expense", to: "/accounts/expenses", module: "accounts" },
      { label: "Expense Settings", to: "/accounts/expenses/settings", module: "accounts" },
      { label: "Chart of Accounts", to: "/accounts/chart-of-accounts", module: "accounts" },
      { label: "Manual Journal Entry", to: "/accounts/journal-entries", module: "accounts" },
      { label: "Balance Sheet", to: "/accounts/balance-sheet", module: "accounts" },
      { label: "Profit & Loss Report", to: "/accounts/profit-loss", module: "accounts" },
      { label: "Accounting Reports", to: "/accounts/reports", module: "accounts" },
      { label: "Restore Deleted Doc.", to: "/accounts/restore-deleted", module: "accounts" },
    ],
  },
  {
    key: "quality",
    labelKey: "erpNav.quality",
    icon: CheckCircle2,
    children: [
      { labelKey: "erpNav.qualityDashboard", to: "/quality", module: "quality" },
      { labelKey: "erpNav.incomingInspection", to: "/quality/incoming", module: "quality" },
      { labelKey: "erpNav.inProcessQc", to: "/quality/in-process", module: "quality" },
      { labelKey: "erpNav.finalQc", to: "/quality/final", module: "quality" },
      { labelKey: "erpNav.batchReports", to: "/quality/batch-reports", module: "quality" },
      { labelKey: "erpNav.rejections", to: "/quality/defects", module: "quality" },
    ],
  },
  {
    key: "maintenance",
    labelKey: "erpNav.maintenance",
    icon: Wrench,
    children: [
      { labelKey: "erpNav.maintenanceDashboard", to: "/maintenance", module: "maintenance" },
      { labelKey: "erpNav.equipmentSpareParts", to: "/maintenance/equipment", module: "maintenance" },
      { labelKey: "erpNav.preventiveMaintenance", to: "/maintenance/preventive", module: "maintenance" },
      { labelKey: "erpNav.breakdownMaintenance", to: "/maintenance/breakdowns", module: "maintenance" },
      { labelKey: "erpNav.machineHistory", to: "/maintenance/machine-history", module: "maintenance" },
      { labelKey: "erpNav.maintenanceSchedule", to: "/maintenance/schedule", module: "maintenance" },
    ],
  },
  {
    key: "alerts",
    labelKey: "erpNav.alerts",
    icon: Bell,
    children: [
      { labelKey: "erpNav.allAlerts", to: "/alerts", module: "alerts", end: true },
      { labelKey: "erpNav.lowStockAlerts", to: "/alerts/low-stock", module: "alerts" },
      { labelKey: "erpNav.machineFailureAlerts", to: "/alerts/machine-failure", module: "alerts" },
      { labelKey: "erpNav.productionDelayAlerts", to: "/alerts/production-delay", module: "alerts" },
      { labelKey: "erpNav.maintenanceAlerts", to: "/alerts/maintenance", module: "alerts" },
      { labelKey: "erpNav.qualityAlerts", to: "/alerts/quality", module: "alerts" },
      { labelKey: "erpNav.safetyAlerts", to: "/alerts/safety", module: "alerts" },
      { labelKey: "erpNav.generalAlerts", to: "/alerts/general", module: "alerts" },
    ],
  },
  {
    key: "documents",
    labelKey: "erpNav.documents",
    icon: FolderOpen,
    children: [
      { labelKey: "erpNav.allDocuments",       to: "/documents",            module: "documents",     end: true },
      { labelKey: "erpNav.purchaseDocuments",  to: "/documents/purchase",   module: "documents_ops" },
      { labelKey: "erpNav.productionDocuments",to: "/documents/production", module: "documents_ops" },
      { labelKey: "erpNav.qualityDocuments",   to: "/documents/quality",    module: "documents_ops" },
      { labelKey: "erpNav.reportDocuments",    to: "/documents/reports",    module: "documents_ops" },
    ],
  },
  {
    key: "meetings",
    labelKey: "erpNav.meetings",
    icon: CalendarDays,
    children: [
      { labelKey: "erpNav.allMeetings", to: "/meetings", module: "meetings", end: true },
    ],
  },
  {
    key: "analytics",
    labelKey: "erpNav.analytics",
    icon: BarChart3,
    children: [
      { labelKey: "erpNav.executiveDashboard", to: "/analytics/executive", module: "analytics" },
      { labelKey: "erpNav.liveDashboard", to: "/analytics/live", module: "analytics" },
      { labelKey: "erpNav.productionKpi", to: "/analytics/production", module: "analytics" },
      { labelKey: "erpNav.inventoryKpi", to: "/analytics/inventory", module: "analytics" },
      { labelKey: "erpNav.salesKpi", to: "/analytics/sales", module: "analytics" },
      { labelKey: "erpNav.financeKpi", to: "/analytics/finance", module: "analytics" },
    ],
  },
  {
    key: "admin",
    label: "Administration",
    icon: Settings,
    children: [
      { label: "Users", to: "/admin/users", module: "admin" },
      { label: "Roles & Permissions", to: "/admin/roles", module: "admin" },
      { label: "Access Logs", to: "/admin/audit-logs", module: "admin" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    labelKey: "erpNav.settings",
    icon: Settings,
    children: [

      { label: "Workflow", to: "/manufacturing/workflow", module: "dashboard"},

      { label: "All Settings", to: "/settings", module: "settings", end: true },
      { label: "Appearance", to: "/settings/appearance", module: "settings" },
      { label: "Change Format", to: "/settings/change-format", module: "settings" },
      { label: "Invoice Settings", to: "/settings/invoice-settings", module: "settings" },
      { label: "Expense Settings", to: "/accounts/expenses/settings", module: "accounts" },
      { label: "Inventory Settings", to: "/inventory/settings", module: "settings" },
      { label: "Sequence Reset Setting", to: "/settings/sequence-reset", module: "settings" },
    ],
  },
];

export function isPathActive(pathname, to, end = false) {
  const basePath = to?.split("?")[0] || to;
  if (end) return pathname === basePath;
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function sectionHasActiveChild(pathname, section) {
  if (!section.children) return false;
  return section.children.some((c) => c.to
    ? isPathActive(pathname, c.to, c.end)
    : sectionHasActiveChild(pathname, c));
}

/** Flat list of navigable routes for global search (path, label, module, optional section). */
export function flattenNavForSearch() {
  const items = [];
  for (const section of SIDEBAR_NAV) {
    if (section.to) {
      items.push({
        path: section.to,
        labelKey: section.labelKey,
        module: section.module,
        sectionKey: null,
      });
    }
    if (section.children) {
      for (const child of section.children) {
        items.push({
          path: child.to,
          label: child.label,
          labelKey: child.labelKey,
          module: child.module,
          sectionKey: section.labelKey || section.label,
        });
      }
    }
  }
  return items;
}