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
  "total-orders": { iconBg: "bg-sky-50 text-sky-700", bar: "bg-sky-600" },
  "today-production": { iconBg: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-600" },
  "machines-running": { iconBg: "bg-violet-50 text-violet-700", bar: "bg-violet-600" },
  "pending-orders": { iconBg: "bg-amber-50 text-amber-700", bar: "bg-amber-600" },
  "pending-approvals": { iconBg: "bg-indigo-50 text-indigo-700", bar: "bg-indigo-600" },
  "good-qty": { iconBg: "bg-teal-50 text-teal-700", bar: "bg-teal-600" },
  "reject-qty": { iconBg: "bg-rose-50 text-rose-700", bar: "bg-rose-600" },
  "inventory-value": { iconBg: "bg-sky-50 text-sky-700", bar: "bg-sky-600" },
  "low-stock": { iconBg: "bg-rose-50 text-rose-700", bar: "bg-rose-600" },
  "raw-materials": { iconBg: "bg-blue-50 text-blue-700", bar: "bg-blue-600" },
  "finished-goods": { iconBg: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-600" },
  warehouses: { iconBg: "bg-indigo-50 text-indigo-700", bar: "bg-indigo-600" },
  "stock-movements": { iconBg: "bg-orange-50 text-orange-700", bar: "bg-orange-600" },
  "total-users": { iconBg: "bg-sky-50 text-sky-700", bar: "bg-sky-600" },
  "active-users": { iconBg: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-600" },
  "total-employees": { iconBg: "bg-teal-50 text-teal-700", bar: "bg-teal-600" },
  "active-alerts": { iconBg: "bg-rose-50 text-rose-700", bar: "bg-rose-600" },
  "total-sales-orders": { iconBg: "bg-sky-50 text-sky-700", bar: "bg-sky-600" },
  "pending-sales-orders": { iconBg: "bg-amber-50 text-amber-700", bar: "bg-amber-600" },
  "todays-sales": { iconBg: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-600" },
  "outstanding-receivables": { iconBg: "bg-violet-50 text-violet-700", bar: "bg-violet-600" },
  "monthly-revenue": { iconBg: "bg-teal-50 text-teal-700", bar: "bg-teal-600" },
  quotations: { iconBg: "bg-indigo-50 text-indigo-700", bar: "bg-indigo-600" },
  "conversion-rate": { iconBg: "bg-sky-50 text-sky-700", bar: "bg-sky-600" },
  "overdue-invoices": { iconBg: "bg-rose-50 text-rose-700", bar: "bg-rose-600" },
  "total-production-orders": { iconBg: "bg-sky-50 text-sky-700", bar: "bg-sky-600" },
  "planned-orders": { iconBg: "bg-amber-50 text-amber-700", bar: "bg-amber-600" },
  "in-progress-orders": { iconBg: "bg-violet-50 text-violet-700", bar: "bg-violet-600" },
  "completed-orders": { iconBg: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-600" },
  "delayed-orders": { iconBg: "bg-rose-50 text-rose-700", bar: "bg-rose-600" },
  "production-target": { iconBg: "bg-teal-50 text-teal-700", bar: "bg-teal-600" },
  "production-efficiency": { iconBg: "bg-indigo-50 text-indigo-700", bar: "bg-indigo-600" },
  "machine-utilization": { iconBg: "bg-violet-50 text-violet-700", bar: "bg-violet-600" },
  "total-inventory-items": { iconBg: "bg-sky-50 text-sky-700", bar: "bg-sky-600" },
  "out-of-stock": { iconBg: "bg-rose-50 text-rose-700", bar: "bg-rose-600" },
  "pending-material-issues": { iconBg: "bg-amber-50 text-amber-700", bar: "bg-amber-600" },
  "pending-goods-receipts": { iconBg: "bg-orange-50 text-orange-700", bar: "bg-orange-600" },
  "present-today": { iconBg: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-600" },
  "absent-today": { iconBg: "bg-rose-50 text-rose-700", bar: "bg-rose-600" },
  "on-leave": { iconBg: "bg-amber-50 text-amber-700", bar: "bg-amber-600" },
  "pending-leave-requests": { iconBg: "bg-indigo-50 text-indigo-700", bar: "bg-indigo-600" },
  "new-employees": { iconBg: "bg-sky-50 text-sky-700", bar: "bg-sky-600" },
  "attendance-rate": { iconBg: "bg-teal-50 text-teal-700", bar: "bg-teal-600" },
  "pending-hr-requests": { iconBg: "bg-violet-50 text-violet-700", bar: "bg-violet-600" },
  "total-receivables": { iconBg: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-600" },
  "total-payables": { iconBg: "bg-amber-50 text-amber-700", bar: "bg-amber-600" },
  "todays-revenue": { iconBg: "bg-sky-50 text-sky-700", bar: "bg-sky-600" },
  "pending-invoices": { iconBg: "bg-indigo-50 text-indigo-700", bar: "bg-indigo-600" },
  "overdue-payments": { iconBg: "bg-rose-50 text-rose-700", bar: "bg-rose-600" },
  expenses: { iconBg: "bg-orange-50 text-orange-700", bar: "bg-orange-600" },
  "gst-payable": { iconBg: "bg-violet-50 text-violet-700", bar: "bg-violet-600" },
  "cash-bank-balance": { iconBg: "bg-teal-50 text-teal-700", bar: "bg-teal-600" },
  "my-work-orders": { iconBg: "bg-sky-50 text-sky-700", bar: "bg-sky-600" },
  "todays-target": { iconBg: "bg-teal-50 text-teal-700", bar: "bg-teal-600" },
  "completed-today": { iconBg: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-600" },
  "operator-in-progress": { iconBg: "bg-violet-50 text-violet-700", bar: "bg-violet-600" },
  "pending-tasks": { iconBg: "bg-amber-50 text-amber-700", bar: "bg-amber-600" },
  "assigned-machine": { iconBg: "bg-indigo-50 text-indigo-700", bar: "bg-indigo-600" },
  "machine-status": { iconBg: "bg-sky-50 text-sky-700", bar: "bg-sky-600" },
  "material-availability": { iconBg: "bg-blue-50 text-blue-700", bar: "bg-blue-600" },
  "quality-checks-pending": { iconBg: "bg-rose-50 text-rose-700", bar: "bg-rose-600" },
};

export function getKpiAccent(id) {
  return KPI_ACCENT[id] || { iconBg: "bg-slate-50 text-slate-700", bar: "bg-slate-600" };
}

export function KpiIcon({ id, className = "h-5 w-5" }) {
  const Icon = KPI_ICONS[id] || BarChart3;
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}

/** Circular light icon well — shared look for dashboard KPI cards. */
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

/** Enterprise light-theme trend line (Dynamics / Fiori style). */
export function TrendBadge({ up, value, label, mode = "change" }) {
  const pct = parseTrendPercent(value);
  const display = value == null || value === "" ? "—" : String(value);
  const isInfo = mode === "info" || mode === "utilization" || pct == null;

  if (isInfo) {
    return (
      <p className="flex min-w-0 items-center gap-1.5 text-[11px] leading-none text-slate-500">
        <span
          className={`shrink-0 font-semibold tabular-nums ${
            mode === "utilization" ? "text-violet-700" : "text-slate-600"
          }`}
        >
          {display}
        </span>
        {label ? <span className="truncate font-medium text-slate-400">{label}</span> : null}
      </p>
    );
  }

  if (pct === 0) {
    return (
      <p className="flex min-w-0 items-center gap-1.5 text-[11px] leading-none text-slate-500">
        <span className="shrink-0 font-semibold tabular-nums">— {display}</span>
        {label ? <span className="truncate font-medium text-slate-400">{label}</span> : null}
      </p>
    );
  }

  const positive = Boolean(up);
  return (
    <p
      className={`flex min-w-0 items-center gap-1.5 text-[11px] leading-none ${
        positive ? "text-emerald-700" : "text-rose-600"
      }`}
    >
      <span className="shrink-0 font-semibold tabular-nums">
        {positive ? "↑" : "↓"} {display}
      </span>
      {label ? <span className="truncate font-medium text-slate-400">{label}</span> : null}
    </p>
  );
}

export function CardShell({ title, children, action, className = "", subtitle }) {
  return (
    <section
      className={`rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
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
    in_progress: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200",
    completed: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
    planned: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
    on_hold: "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200",
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
      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${map[status] || "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200"}`}
    >
      {label}
    </span>
  );
}

export { ChevronRight, Boxes, Package, Wrench, CheckCircle2, ShoppingCart, Users };
