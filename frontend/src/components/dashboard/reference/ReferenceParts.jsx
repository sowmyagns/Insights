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

/** Matched KPI color tones — icon background, icon, and top bar always use the same family. */
const KPI_TONES = {
  primary: {
    iconBg: "bg-[var(--kpi-primary-soft)] text-[var(--kpi-primary)]",
    bar: "bg-[var(--kpi-primary)]",
  },
  success: {
    iconBg: "bg-[var(--kpi-success-soft)] text-[var(--kpi-success)]",
    bar: "bg-[var(--kpi-success)]",
  },
  teal: {
    iconBg: "bg-[var(--kpi-teal-soft)] text-[var(--kpi-teal)]",
    bar: "bg-[var(--kpi-teal)]",
  },
  violet: {
    iconBg: "bg-[var(--kpi-violet-soft)] text-[var(--kpi-violet)]",
    bar: "bg-[var(--kpi-violet)]",
  },
  warning: {
    iconBg: "bg-[var(--kpi-warning-soft)] text-[var(--kpi-warning)]",
    bar: "bg-[var(--kpi-warning)]",
  },
  danger: {
    iconBg: "bg-[var(--kpi-danger-soft)] text-[var(--kpi-danger)]",
    bar: "bg-[var(--kpi-danger)]",
  },
  info: {
    iconBg: "bg-[var(--kpi-info-soft)] text-[var(--kpi-info)]",
    bar: "bg-[var(--kpi-info)]",
  },
  orange: {
    iconBg: "bg-[var(--kpi-orange-soft)] text-[var(--kpi-orange)]",
    bar: "bg-[var(--kpi-orange)]",
  },
  neutral: {
    iconBg: "bg-[var(--kpi-neutral-soft)] text-[var(--kpi-neutral)]",
    bar: "bg-[var(--kpi-neutral)]",
  },
};

const KPI_ID_TONE = {
  "total-orders": "primary",
  "today-production": "success",
  "machines-running": "violet",
  "pending-orders": "warning",
  "pending-approvals": "primary",
  "good-qty": "success",
  "reject-qty": "danger",
  "inventory-value": "primary",
  "low-stock": "danger",
  "raw-materials": "info",
  "finished-goods": "success",
  warehouses: "primary",
  "stock-movements": "orange",
  "total-users": "primary",
  "active-users": "success",
  "total-employees": "teal",
  "active-alerts": "danger",
  "total-sales-orders": "primary",
  "pending-sales-orders": "warning",
  "todays-sales": "success",
  "outstanding-receivables": "violet",
  "monthly-revenue": "teal",
  quotations: "primary",
  "conversion-rate": "info",
  "overdue-invoices": "danger",
  "total-production-orders": "primary",
  "planned-orders": "warning",
  "in-progress-orders": "violet",
  "completed-orders": "success",
  "delayed-orders": "danger",
  "production-target": "teal",
  "production-efficiency": "primary",
  "machine-utilization": "violet",
  "total-inventory-items": "primary",
  "out-of-stock": "danger",
  "pending-material-issues": "warning",
  "pending-goods-receipts": "orange",
  "present-today": "success",
  "absent-today": "danger",
  "on-leave": "warning",
  "pending-leave-requests": "primary",
  "new-employees": "info",
  "attendance-rate": "teal",
  "pending-hr-requests": "violet",
  "total-receivables": "success",
  "total-payables": "warning",
  "todays-revenue": "primary",
  "pending-invoices": "primary",
  "overdue-payments": "danger",
  expenses: "orange",
  "gst-payable": "violet",
  "cash-bank-balance": "teal",
  "my-work-orders": "primary",
  "todays-target": "teal",
  "completed-today": "success",
  "operator-in-progress": "violet",
  "pending-tasks": "warning",
  "assigned-machine": "primary",
  "machine-status": "info",
  "material-availability": "info",
  "quality-checks-pending": "danger",
};

function inferKpiTone(id) {
  const key = String(id || "").toLowerCase();
  if (/reject|overdue|absent|alert|low-stock|out-of-stock|delayed|danger|critical|quality-check/.test(key)) {
    return "danger";
  }
  if (/pending|planned|on-leave|payable|hold|waiting/.test(key)) {
    return "warning";
  }
  if (/complete|good-qty|present|finished|hired|active-user|receivable|todays-sales/.test(key)) {
    return "success";
  }
  if (/machine|utilization|in-progress|gst|operator-in-progress/.test(key)) {
    return "violet";
  }
  if (/employee|revenue|target|attendance|cash-bank/.test(key)) {
    return "teal";
  }
  if (/expense|movement|receipt|goods-receipt/.test(key)) {
    return "orange";
  }
  if (/raw|conversion|material-avail|machine-status|new-employee/.test(key)) {
    return "info";
  }
  return "primary";
}

export function getKpiAccent(id) {
  const tone = KPI_ID_TONE[id] || inferKpiTone(id);
  return KPI_TONES[tone] || KPI_TONES.neutral;
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
