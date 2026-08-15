import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Boxes,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Cog,
  CreditCard,
  Factory,
  FileClock,
  Gauge,
  IndianRupee,
  Package,
  PackageMinus,
  PackageX,
  Percent,
  PlayCircle,
  Receipt,
  ShoppingCart,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  Wallet,
  Warehouse,
  Wrench,
} from "lucide-react";

/** Lucide icons for ERP dashboard KPI ids — keep semantic and consistent. */
export const KPI_ICONS = {
  "total-orders": ClipboardList,
  "today-production": Factory,
  "machines-running": Cog,
  "pending-orders": Clock,
  "pending-approvals": ClipboardCheck,
  "good-qty": CheckCircle2,
  "reject-qty": AlertTriangle,
  "inventory-value": IndianRupee,
  "low-stock": PackageMinus,
  "raw-materials": Boxes,
  "finished-goods": Package,
  warehouses: Warehouse,
  "stock-movements": ArrowLeftRight,
  "total-users": Users,
  "active-users": UserCheck,
  "total-employees": Users,
  "active-alerts": AlertTriangle,
  "total-sales-orders": ShoppingCart,
  "pending-sales-orders": Clock,
  "todays-sales": TrendingUp,
  "outstanding-receivables": Wallet,
  "monthly-revenue": Banknote,
  quotations: ClipboardList,
  "conversion-rate": Percent,
  "overdue-invoices": AlertCircle,
  "total-production-orders": ClipboardList,
  "planned-orders": CalendarClock,
  "in-progress-orders": PlayCircle,
  "completed-orders": CheckCircle2,
  "delayed-orders": AlertTriangle,
  "production-target": Target,
  "production-efficiency": Gauge,
  "machine-utilization": Gauge,
  "total-inventory-items": Boxes,
  "out-of-stock": PackageX,
  "pending-material-issues": ClipboardList,
  "pending-goods-receipts": ClipboardCheck,
  "present-today": UserCheck,
  "absent-today": UserX,
  "on-leave": Calendar,
  "pending-leave-requests": CalendarClock,
  "new-employees": UserPlus,
  "attendance-rate": Percent,
  "pending-hr-requests": ClipboardList,
  "total-receivables": Wallet,
  "total-payables": CreditCard,
  "todays-revenue": TrendingUp,
  "pending-invoices": FileClock,
  "overdue-payments": AlertCircle,
  expenses: Banknote,
  "gst-payable": Receipt,
  "cash-bank-balance": IndianRupee,
  "my-work-orders": ClipboardList,
  "todays-target": Target,
  "completed-today": CheckCircle2,
  "operator-in-progress": PlayCircle,
  "pending-tasks": Clock,
  "assigned-machine": Cog,
  "machine-status": Wrench,
  "material-availability": Package,
  "quality-checks-pending": BadgeCheck,
};

const KPI_ACCENT = {
  "total-orders": { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "today-production": { iconBg: "bg-[#e8f8ef] text-[#15803d]", bar: "bg-[#15803d]", border: "border-emerald-200 hover:border-emerald-500 dark:border-emerald-900/60" },
  "machines-running": { iconBg: "bg-[#f3eefc] text-[#6d28d9]", bar: "bg-[#6d28d9]", border: "border-purple-200 hover:border-purple-500 dark:border-purple-900/60" },
  "pending-orders": { iconBg: "bg-[#fff6e5] text-[#b45309]", bar: "bg-[#b45309]", border: "border-amber-200 hover:border-amber-500 dark:border-amber-900/60" },
  "pending-approvals": { iconBg: "bg-[#e0f2fe] text-[#0284c7]", bar: "bg-[#0284c7]", border: "border-sky-200 hover:border-sky-500 dark:border-sky-900/60" },
  "good-qty": { iconBg: "bg-[#e8f8ef] text-[#15803d]", bar: "bg-[#15803d]", border: "border-emerald-200 hover:border-emerald-500 dark:border-emerald-900/60" },
  "reject-qty": { iconBg: "bg-[#fde8e8] text-[#ef4444]", bar: "bg-[#ef4444]", border: "border-red-200 hover:border-red-500 dark:border-red-900/60" },
  "inventory-value": { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "low-stock": { iconBg: "bg-[#fde8e8] text-[#ef4444]", bar: "bg-[#ef4444]", border: "border-red-200 hover:border-red-500 dark:border-red-900/60" },
  "raw-materials": { iconBg: "bg-[#e8f1ff] text-[#2563eb]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "finished-goods": { iconBg: "bg-[#e8f8ef] text-[#15803d]", bar: "bg-[#15803d]", border: "border-emerald-200 hover:border-emerald-500 dark:border-emerald-900/60" },
  warehouses: { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "stock-movements": { iconBg: "bg-[#fff1e8] text-[#c2410c]", bar: "bg-[#c2410c]", border: "border-orange-200 hover:border-orange-500 dark:border-orange-900/60" },
  "total-users": { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-indigo-200 hover:border-indigo-500 dark:border-indigo-900/60" },
  "active-users": { iconBg: "bg-[#e8f8ef] text-[#15803d]", bar: "bg-[#15803d]", border: "border-emerald-200 hover:border-emerald-500 dark:border-emerald-900/60" },
  "total-employees": { iconBg: "bg-[#e8f8ef] text-[#0f766e]", bar: "bg-[#0f766e]", border: "border-teal-200 hover:border-teal-500 dark:border-teal-900/60" },
  "active-alerts": { iconBg: "bg-[#fde8e8] text-[#ef4444]", bar: "bg-[#ef4444]", border: "border-red-200 hover:border-red-500 dark:border-red-900/60" },
  "total-sales-orders": { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "pending-sales-orders": { iconBg: "bg-[#fff6e5] text-[#b45309]", bar: "bg-[#b45309]", border: "border-amber-200 hover:border-amber-500 dark:border-amber-900/60" },
  "todays-sales": { iconBg: "bg-[#e8f8ef] text-[#15803d]", bar: "bg-[#15803d]", border: "border-emerald-200 hover:border-emerald-500 dark:border-emerald-900/60" },
  "outstanding-receivables": { iconBg: "bg-[#f3eefc] text-[#6d28d9]", bar: "bg-[#6d28d9]", border: "border-purple-200 hover:border-purple-500 dark:border-purple-900/60" },
  "monthly-revenue": { iconBg: "bg-[#e8f8ef] text-[#0f766e]", bar: "bg-[#0f766e]", border: "border-teal-200 hover:border-teal-500 dark:border-teal-900/60" },
  quotations: { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "conversion-rate": { iconBg: "bg-[#e8f1ff] text-[#2563eb]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "overdue-invoices": { iconBg: "bg-[#fde8e8] text-[#ef4444]", bar: "bg-[#ef4444]", border: "border-red-200 hover:border-red-500 dark:border-red-900/60" },
  "total-production-orders": { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "planned-orders": { iconBg: "bg-[#fff6e5] text-[#b45309]", bar: "bg-[#b45309]", border: "border-amber-200 hover:border-amber-500 dark:border-amber-900/60" },
  "in-progress-orders": { iconBg: "bg-[#f3eefc] text-[#6d28d9]", bar: "bg-[#6d28d9]", border: "border-purple-200 hover:border-purple-500 dark:border-purple-900/60" },
  "completed-orders": { iconBg: "bg-[#e8f8ef] text-[#15803d]", bar: "bg-[#15803d]", border: "border-emerald-200 hover:border-emerald-500 dark:border-emerald-900/60" },
  "delayed-orders": { iconBg: "bg-[#fde8e8] text-[#ef4444]", bar: "bg-[#ef4444]", border: "border-red-200 hover:border-red-500 dark:border-red-900/60" },
  "production-target": { iconBg: "bg-[#e8f8ef] text-[#0f766e]", bar: "bg-[#0f766e]", border: "border-teal-200 hover:border-teal-500 dark:border-teal-900/60" },
  "production-efficiency": { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "machine-utilization": { iconBg: "bg-[#f3eefc] text-[#6d28d9]", bar: "bg-[#6d28d9]", border: "border-purple-200 hover:border-purple-500 dark:border-purple-900/60" },
  "total-inventory-items": { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "out-of-stock": { iconBg: "bg-[#fde8e8] text-[#ef4444]", bar: "bg-[#ef4444]", border: "border-red-200 hover:border-red-500 dark:border-red-900/60" },
  "pending-material-issues": { iconBg: "bg-[#fff6e5] text-[#b45309]", bar: "bg-[#b45309]", border: "border-amber-200 hover:border-amber-500 dark:border-amber-900/60" },
  "pending-goods-receipts": { iconBg: "bg-[#fff1e8] text-[#c2410c]", bar: "bg-[#c2410c]", border: "border-orange-200 hover:border-orange-500 dark:border-orange-900/60" },
  "present-today": { iconBg: "bg-[#e8f8ef] text-[#15803d]", bar: "bg-[#15803d]", border: "border-emerald-200 hover:border-emerald-500 dark:border-emerald-900/60" },
  "absent-today": { iconBg: "bg-[#fde8e8] text-[#ef4444]", bar: "bg-[#ef4444]", border: "border-red-200 hover:border-red-500 dark:border-red-900/60" },
  "on-leave": { iconBg: "bg-[#fff6e5] text-[#b45309]", bar: "bg-[#b45309]", border: "border-amber-200 hover:border-amber-500 dark:border-amber-900/60" },
  "pending-leave-requests": { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "new-employees": { iconBg: "bg-[#e8f1ff] text-[#2563eb]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "attendance-rate": { iconBg: "bg-[#e8f8ef] text-[#0f766e]", bar: "bg-[#0f766e]", border: "border-teal-200 hover:border-teal-500 dark:border-teal-900/60" },
  "pending-hr-requests": { iconBg: "bg-[#f3eefc] text-[#6d28d9]", bar: "bg-[#6d28d9]", border: "border-purple-200 hover:border-purple-500 dark:border-purple-900/60" },
  "total-receivables": { iconBg: "bg-[#e8f8ef] text-[#15803d]", bar: "bg-[#15803d]", border: "border-emerald-200 hover:border-emerald-500 dark:border-emerald-900/60" },
  "total-payables": { iconBg: "bg-[#fff6e5] text-[#b45309]", bar: "bg-[#b45309]", border: "border-amber-200 hover:border-amber-500 dark:border-amber-900/60" },
  "todays-revenue": { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "pending-invoices": { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "overdue-payments": { iconBg: "bg-[#fde8e8] text-[#ef4444]", bar: "bg-[#ef4444]", border: "border-red-200 hover:border-red-500 dark:border-red-900/60" },
  expenses: { iconBg: "bg-[#fff1e8] text-[#c2410c]", bar: "bg-[#c2410c]", border: "border-orange-200 hover:border-orange-500 dark:border-orange-900/60" },
  "gst-payable": { iconBg: "bg-[#f3eefc] text-[#6d28d9]", bar: "bg-[#6d28d9]", border: "border-purple-200 hover:border-purple-500 dark:border-purple-900/60" },
  "cash-bank-balance": { iconBg: "bg-[#e8f8ef] text-[#0f766e]", bar: "bg-[#0f766e]", border: "border-teal-200 hover:border-teal-500 dark:border-teal-900/60" },
  "my-work-orders": { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "todays-target": { iconBg: "bg-[#e8f8ef] text-[#0f766e]", bar: "bg-[#0f766e]", border: "border-teal-200 hover:border-teal-500 dark:border-teal-900/60" },
  "completed-today": { iconBg: "bg-[#e8f8ef] text-[#15803d]", bar: "bg-[#15803d]", border: "border-emerald-200 hover:border-emerald-500 dark:border-emerald-900/60" },
  "operator-in-progress": { iconBg: "bg-[#f3eefc] text-[#6d28d9]", bar: "bg-[#6d28d9]", border: "border-purple-200 hover:border-purple-500 dark:border-purple-900/60" },
  "pending-tasks": { iconBg: "bg-[#fff6e5] text-[#b45309]", bar: "bg-[#b45309]", border: "border-amber-200 hover:border-amber-500 dark:border-amber-900/60" },
  "assigned-machine": { iconBg: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]", bar: "bg-[var(--color-primary)]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "machine-status": { iconBg: "bg-[#e8f1ff] text-[#2563eb]", bar: "bg-[#2563eb]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "material-availability": { iconBg: "bg-[#e8f1ff] text-[#2563eb]", bar: "bg-[#2563eb]", border: "border-blue-200 hover:border-blue-500 dark:border-blue-900/60" },
  "quality-checks-pending": { iconBg: "bg-[#fde8e8] text-[#ef4444]", bar: "bg-[#ef4444]", border: "border-red-200 hover:border-red-500 dark:border-red-900/60" },
};

export function getKpiAccent(id) {
  return KPI_ACCENT[id] || { iconBg: "bg-[#f3f3f6] text-[#4a4a55]", bar: "bg-[#6b6b76]", border: "border-slate-200 hover:border-slate-400 dark:border-slate-700" };
}

export function KpiIcon({ id, className = "h-5 w-5" }) {
  const Icon = KPI_ICONS[id] || BarChart3;
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}

/** Circular light icon well — Products-page soft wells. */
export function KpiIconWell({ id, className = "" }) {
  const accent = getKpiAccent(id);
  return (
    <div
      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accent.iconBg} ${className}`}
    >
      <KpiIcon id={id} className="h-5 w-5" />
    </div>
  );
}

function parseTrendPercent(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  if (!raw.includes("%")) return null;
  const n = Number.parseFloat(raw.replace(/[%+\s,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Trend line styled like Masters → Products muted typography. */
export function TrendBadge({ up, value, label, mode = "change" }) {
  const pct = parseTrendPercent(value);
  const display = value == null || value === "" ? "—" : String(value);
  const isInfo = mode === "info" || mode === "utilization" || pct == null;

  if (isInfo) {
    return (
      <p className="flex min-w-0 items-center gap-1.5 text-[11px] leading-none text-[#6b6b76]">
        <span
          className={`shrink-0 font-semibold tabular-nums ${
            mode === "utilization" ? "text-[var(--color-primary)]" : "text-[#4a4a55]"
          }`}
        >
          {display}
        </span>
        {label ? <span className="truncate font-medium text-[#9a9aa5]">{label}</span> : null}
      </p>
    );
  }

  if (pct === 0) {
    return (
      <p className="flex min-w-0 items-center gap-1.5 text-[11px] leading-none text-[#6b6b76]">
        <span className="shrink-0 font-semibold tabular-nums">— {display}</span>
        {label ? <span className="truncate font-medium text-[#9a9aa5]">{label}</span> : null}
      </p>
    );
  }

  const positive = Boolean(up);
  return (
    <p
      className={`flex min-w-0 items-center gap-1.5 text-[11px] leading-none ${
        positive ? "text-[#15803d]" : "text-[#ef4444]"
      }`}
    >
      <span className="shrink-0 font-semibold tabular-nums">
        {positive ? "↑" : "↓"} {display}
      </span>
      {label ? <span className="truncate font-medium text-[#9a9aa5]">{label}</span> : null}
    </p>
  );
}

/** Card shell matching Masters → Products tokens. */
export function CardShell({ title, children, action, className = "", subtitle }) {
  return (
    <section className={`ui-card p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold tracking-tight text-[var(--color-text)] sm:text-sm">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ status }) {
  const { t } = useTranslation();
  const map = {
    in_progress: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
    completed: "bg-[#e8f8ef] text-[#15803d]",
    planned: "bg-[#fff6e5] text-[#b45309]",
    on_hold: "bg-[#fde8e8] text-[#ef4444]",
  };
  const labelKey = {
    in_progress: "refDashboard.statusInProgress",
    completed: "refDashboard.statusCompleted",
    planned: "refDashboard.statusPlanned",
    on_hold: "refDashboard.statusOnHold",
  }[status];
  const label = labelKey ? t(labelKey) : String(status || "").replace(/_/g, " ");
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${map[status] || "bg-[#f3f3f6] text-[#4a4a55]"}`}
    >
      {label}
    </span>
  );
}

export { ChevronRight, Boxes, Package, Wrench, CheckCircle2, ShoppingCart, Users };
