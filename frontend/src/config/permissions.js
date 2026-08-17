/**
 * Enterprise RBAC — module codes, action permissions, and route mapping.
 * Keep in sync with backend `app/core/rbac_constants.py` PERMISSION_MATRIX.
 */

export const ROLES = [
  { id: "admin", name: "Admin", description: "Full system access" },
  { id: "sales_manager", name: "Sales Manager", description: "Leads, quotations, sales orders, customers" },
  { id: "production_manager", name: "Production Manager", description: "Production modules for assigned plant" },
  { id: "store_manager", name: "Store Manager", description: "Inventory and store operations" },
  { id: "hr_manager", name: "HR Manager", description: "Departments and organizational data" },
  { id: "accountant", name: "Accountant", description: "Finance and accounts" },
  { id: "operator", name: "Operator", description: "Assigned work orders and machine only" },
];

export const MODULES = [
  "dashboard", "masters", "production", "inventory", "procurement",
  "sales", "accounts", "quality", "maintenance", "analytics", "alerts", "admin",
  "documents", "documents_ops", "factoryMonitor", "iot", "settings", "meetings",
];

/** Static fallback matrix — API permissions take precedence when present. */
export const ROLE_PERMISSIONS = {
  Admin: MODULES,
  admin: MODULES,
  "Production Manager": [
    "dashboard", "production", "quality", "analytics", "factoryMonitor", "alerts", "documents",
    "masters", "inventory", "maintenance", "procurement", "settings", "iot", "sales", "accounts", "meetings",
  ],
  production_manager: [
    "dashboard", "production", "quality", "analytics", "factoryMonitor", "alerts", "documents",
    "masters", "inventory", "maintenance", "procurement", "settings", "iot", "sales", "accounts", "meetings",
  ],
  "Sales Manager": ["dashboard", "sales", "masters", "alerts", "documents", "analytics", "meetings"],
  sales_manager: ["dashboard", "sales", "masters", "alerts", "documents", "analytics", "meetings"],
  "Store Manager": [
    "dashboard", "inventory", "procurement", "masters", "alerts", "documents", "settings",
  ],
  store_manager: [
    "dashboard", "inventory", "procurement", "masters", "alerts", "documents", "settings",
  ],
  "Purchase Manager": [
    "dashboard", "procurement", "inventory", "masters", "accounts", "alerts", "documents", "analytics",
  ],
  purchase_manager: [
    "dashboard", "procurement", "inventory", "masters", "accounts", "alerts", "documents", "analytics",
  ],
  "Procurement Manager": [
    "dashboard", "procurement", "inventory", "masters", "accounts", "alerts", "documents", "documents_ops", "analytics",
  ],
  procurement_manager: [
    "dashboard", "procurement", "inventory", "masters", "accounts", "alerts", "documents", "analytics",
  ],
  "HR Manager": ["dashboard", "analytics", "alerts", "documents", "masters", "meetings"],
  hr_manager: ["dashboard", "analytics", "alerts", "documents", "masters", "meetings"],
  Accountant: ["dashboard", "accounts", "sales", "documents", "analytics", "alerts", "masters", "meetings"],
  accountant: ["dashboard", "accounts", "sales", "documents", "analytics", "alerts", "masters", "meetings"],
  Operator: [
    "dashboard", "production", "factoryMonitor", "documents", "alerts",
    "quality", "maintenance", "inventory",
  ],
  operator: [
    "dashboard", "production", "factoryMonitor", "documents", "alerts",
    "quality", "maintenance", "inventory",
  ],
};

export const RESTRICTED_ACTION_ROLES = new Set();

export const VALID_ACTIONS = new Set([
  "read", "create", "update", "delete", "approve",
  "create_entry", "update_qty", "update_machine_status", "report_breakdown", "*",
]);

/** Path-specific overrides evaluated before prefix matching. */
export const ROUTE_MODULE_OVERRIDES = {
  "/settings/permissions": "settings",
  "/settings/alerts": "dashboard",
  "/settings/subscription": "settings",
  "/masters/departments": "masters",
  "/masters/products": "masters",
  "/master/products": "masters",
  "/products": "masters",
  "/masters/bom": "masters",
  "/production/schedule": "production",
  "/procurement/rfq": "procurement",
  "/procurement/vendors": "masters",
  "/masters/vendors": "masters",
  "/finance/accounts-payable": "accounts",
  "/finance/accounts-receivable": "accounts",
  "/finance/payment-tracking": "accounts",
  "/finance/general-ledger": "accounts",
  "/quality/incoming": "quality",
  "/quality/in-process": "quality",
  "/quality/final": "quality",
  "/maintenance/machine-history": "maintenance",
  "/analytics/sales": "analytics",
  "/analytics/finance": "analytics",
  "/manufacturing/workflow": "dashboard",
  "/ewaybill/login": "sales",
  "/digital-signature": "sales",
  "/purchases": "procurement",
};

export const ROUTE_MODULES = {
  "/": "dashboard",
  "/manufacturing": "dashboard",
  "/masters": "masters",
  "/master": "masters",
  "/products": "masters",
  "/production": "production",
  "/inventory": "inventory",
  "/procurement": "procurement",
  "/purchases": "procurement",
  "/sales": "sales",
  "/ewaybill": "sales",
  "/digital-signature": "sales",
  "/accounts": "accounts",
  "/ledger": "accounts",
  "/finance": "accounts",
  "/quality": "quality",
  "/maintenance": "maintenance",
  "/maintenance/equipment": "maintenance",
  "/analytics": "analytics",
  "/alerts": "alerts",
  "/admin": "admin",
  "/settings": "settings",
  "/documents": "documents",
  "/meetings": "meetings",
  "/factory-monitor": "factoryMonitor",
  "/iot": "iot",
};

export function getModuleForPath(pathname) {
  const path = pathname.replace(/\/$/, "") || "/";
  if (ROUTE_MODULE_OVERRIDES[path]) return ROUTE_MODULE_OVERRIDES[path];
  const sorted = Object.keys(ROUTE_MODULES).sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return ROUTE_MODULES[prefix];
    }
  }
  return "dashboard";
}

export function isAdmin(user) {
  if (!user) return false;
  if (Array.isArray(user.permissions) && user.permissions.includes("*")) return true;
  const roles = Array.isArray(user.roles) && user.roles.length
    ? user.roles
    : [user.role, user.role_name].filter(Boolean);
  return roles.includes("Admin");
}

export function getEffectivePermissions(user) {
  if (!user) return [];
  if (isAdmin(user)) return [...MODULES, "*"];
  if (Array.isArray(user.permissions) && user.permissions.length) {
    return user.permissions;
  }
  const roles = Array.isArray(user.roles) && user.roles.length
    ? user.roles
    : [user.role, user.role_name].filter(Boolean);
  const set = new Set();
  for (const role of roles) {
    (ROLE_PERMISSIONS[role] || []).forEach((p) => set.add(p));
  }
  return [...set];
}

export function userHasModule(user, module) {
  if (!user || !module) return false;
  if (isAdmin(user)) return true;
  const perms = getEffectivePermissions(user);
  if (perms.includes("*") || perms.includes(module)) return true;
  return perms.some((p) => typeof p === "string" && p.startsWith(`${module}:`));
}

export function userCanAction(user, module, action) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const perms = getEffectivePermissions(user);
  if (perms.includes("*") || perms.includes(`${module}:*`) || perms.includes(`${module}:${action}`)) {
    return true;
  }
  return perms.includes(module);
}

export function canAccess(userRole, module) {
  if (!userRole || !module) return false;
  if (userRole === "Admin") return true;
  return (ROLE_PERMISSIONS[userRole] || []).includes(module);
}

export function userCanAccess(user, module) {
  return userHasModule(user, module);
}

/** Paths Store Manager may open (inventory & warehouse operations only). */
export const STORE_MANAGER_ALLOWED_PATHS = new Set([
  "/",
  "/inventory",
  "/inventory/dashboard",
  "/inventory/settings",
  "/inventory/raw-materials",
  "/inventory/finished-goods",
  "/inventory/stock-transfer",
  "/inventory/stock-adjustment",
  "/inventory/stock-ledger",
  "/inventory/stock-movement",
  "/inventory/stock-in",
  "/inventory/material-requests",
  "/inventory/issue-materials",
  "/inventory/stock-return",
  "/inventory/history",
  "/inventory/warehouses",
  "/inventory/items",
  "/accounts/ledger",
  "/accounts/expenses",
  "/ledger",
  "/procurement/goods-receipt",
  "/procurement/material-requests",
  "/procurement/vendors",
  "/masters/vendors",
  "/masters/products",
  "/settings",
  "/settings/subscription",
  "/settings/my-account",
  "/alerts/low-stock",
  "/documents",
  "/documents/purchase",
]);

export function isProductionManager(user) {
  if (!user || isAdmin(user)) return false;
  const roles = (Array.isArray(user.roles) && user.roles.length
    ? user.roles
    : [user.role, user.role_name]).filter(Boolean).map((r) => (typeof r === "object" ? r?.name || "" : String(r)).toLowerCase());
  return roles.some((r) => r === "production manager" || r === "production_manager" || r.includes("production manager") || r.includes("production_manager"));
}

export function isStoreManager(user) {
  if (!user || isAdmin(user)) return false;
  const roles = (Array.isArray(user.roles) && user.roles.length
    ? user.roles
    : [user.role, user.role_name]).filter(Boolean).map((r) => String(r).toLowerCase());
  return roles.some((r) => r === "store manager" || r === "store_manager" || r.includes("store manager"));
}

export function storeManagerPathAllowed(pathname) {
  if (!pathname) return false;
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/") return true;
  if (STORE_MANAGER_ALLOWED_PATHS.has(path)) return true;
  if (path.startsWith("/inventory")) return true;
  if (path.startsWith("/procurement")) return true;
  if (path.startsWith("/accounts/ledger")) return true;
  if (path.startsWith("/accounts/expenses")) return true;
  if (path.startsWith("/masters/products")) return true;
  if (path.startsWith("/procurement/goods-receipt")) return true;
  if (path.startsWith("/procurement/material-requests")) return true;
  if (path.startsWith("/procurement/vendors")) return true;
  if (path.startsWith("/masters/vendors")) return true;
  if (path.startsWith("/settings")) return true;
  if (path.startsWith("/alerts")) return true;
  if (path.startsWith("/documents")) return true;
  return false;
}

export function userCanAccessPath(user, pathname) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const path = (pathname || "").replace(/\/$/, "") || "/";
  if (path.startsWith("/procurement/vendors") || path.startsWith("/masters/vendors")) {
    if (isProductionManager(user)) return false;
    if (!userCanAccess(user, "masters") && !userCanAccess(user, "procurement")) return false;
    if (isStoreManager(user) && !storeManagerPathAllowed(pathname)) return false;
    return true;
  }
  const module = getModuleForPath(pathname);
  if (!userCanAccess(user, module)) return false;
  if (isStoreManager(user) && !storeManagerPathAllowed(pathname)) return false;
  return true;
}

export function isOperator(user) {
  if (!user) return false;
  const roles = Array.isArray(user.roles)
    ? user.roles.map((r) => (typeof r === "object" ? r?.name || "" : String(r)).toLowerCase())
    : [];
  const roleStr = String(user.role || user.role_name || (typeof user.roles === "string" ? user.roles : "")).toLowerCase();
  const allRoles = [...roles, roleStr];
  return allRoles.some((r) => r === "operator" || r.includes("operator"));
}

/** Human-readable label for a module code or granular permission (e.g. production:read). */
export function permissionLabel(code, modules = []) {
  const exact = modules.find((m) => m.code === code);
  if (exact) return exact.label;
  if (code.includes(":")) {
    const [module, action] = code.split(":", 2);
    const moduleEntry = modules.find((m) => m.code === module);
    const moduleLabel = moduleEntry?.label || module;
    const actionLabel = action.replace(/_/g, " ");
    return `${moduleLabel} (${actionLabel})`;
  }
  return code.replace(/_/g, " ");
}

/** Count module-level grants (excludes granular action codes). */
export function countModulePermissions(permissions = [], modules = []) {
  const moduleCodes = new Set(modules.map((m) => m.code));
  return permissions.filter((p) => moduleCodes.has(p)).length;
}