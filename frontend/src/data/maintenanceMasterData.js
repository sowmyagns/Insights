/** Maintenance demo data and helpers. */

export const MAINTENANCE_FLOW = [
  "Machine Registration", "Preventive Schedule", "Maintenance Reminder",
  "Maintenance Execution", "Machine Inspection", "Machine History Updated", "Reports",
];

export const WORK_ORDER_FLOW = [
  "Reported", "Assigned", "In Progress", "Completed", "Verified", "Closed",
];

export const HISTORY_TIMELINE = [
  "Machine Installed", "Preventive Maintenance", "Breakdown", "Repair", "Calibration", "Replacement Parts",
];

export const DEMO_PREVENTIVE_SUMMARY = {
  total_machines: 0, scheduled_today: 0, overdue_tasks: 0, completed_this_month: 0,
  upcoming_maintenance: 0, machine_availability_pct: 0,
};

export const DEMO_PREVENTIVE_LIST = [];

export const DEMO_BREAKDOWN_SUMMARY = {
  active_breakdowns: 0, total_downtime_hours: 0, avg_repair_time_mttr: 0,
  machine_availability_pct: 0, pending_repairs: 0, emergency_breakdowns: 0,
};

export const DEMO_BREAKDOWN_LIST = [];

export const DEMO_HISTORY_LIST = [];

export const DEMO_MAINTENANCE_HUB = {
  total_machines: 0, running: 0, under_maintenance: 0, breakdown: 0, idle: 0, machine_health_pct: 0,
  mttr_hours: 0, mtbf_hours: 0,
  labour_cost: 0, spare_cost: 0, external_cost: 0, total_cost: 0,
  total_requests: 0, open_requests: 0, in_progress_requests: 0, completed_requests: 0, overdue_requests: 0,
  calendar_events: [],
  machine_health: [],
  downtime_trend: [],
  availability_trend: [],
  cost_trend: [],
  breakdown_frequency: [],
  mttr_trend: [],
  mtbf_trend: [],
  preventive_vs_breakdown: [],
  maintenance_overview: [],
  equipment_status: [],
  spare_parts: [],
  work_orders: [],
  recent_requests: [],
  alerts: [],
};

export function formatInr(v) {
  if (v == null) return "—";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

export function mntStatusColor(s) {
  const m = {
    scheduled: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    in_progress: "bg-indigo-100 text-indigo-800",
    reported: "bg-orange-100 text-orange-800",
    assigned: "bg-amber-100 text-amber-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-slate-200 text-slate-700",
    verified: "bg-teal-100 text-[var(--color-success)]",
    running: "bg-green-100 text-green-800",
    idle: "bg-slate-100 text-slate-700",
    breakdown: "bg-red-100 text-red-800",
    maintenance: "bg-amber-100 text-amber-800",
  };
  return m[s] || "bg-slate-100 text-slate-700";
}

/** Critical=Dark Red, High=Red, Medium=Orange, Low=Green */
export function priorityColor(p) {
  const m = {
    critical: "bg-red-900 text-white",
    high: "bg-red-100 text-red-800",
    medium: "bg-orange-100 text-orange-800",
    low: "bg-green-100 text-green-800",
  };
  return m[p] || "bg-slate-100 text-slate-700";
}

export function healthColor(score) {
  if (score >= 90) return "bg-green-500";
  if (score >= 75) return "bg-amber-500";
  return "bg-red-500";
}

export function healthTextColor(score) {
  if (score >= 90) return "text-green-700";
  if (score >= 75) return "text-amber-700";
  return "text-red-700";
}

export const HISTORY_TABS = [
  { id: "all", label: "All History" },
  { id: "maintenance", label: "Maintenance" },
  { id: "breakdowns", label: "Breakdowns" },
  { id: "repairs", label: "Repairs" },
  { id: "inspections", label: "Inspections" },
  { id: "parts", label: "Parts Replaced" },
];

/** Normalize backend activity strings into history tab categories. */
export function historyActivityCategory(activity) {
  const a = String(activity || "").toLowerCase();
  if (a.includes("breakdown")) return "breakdowns";
  if (a.includes("repair")) return "repairs";
  if (a.includes("inspect") || a.includes("calibration")) return "inspections";
  if (a.includes("part") || a.includes("replacement")) return "parts";
  if (a.includes("maint") || a.includes("preventive") || a.includes("installed")) return "maintenance";
  return "maintenance";
}

export function historyActivityLabel(activity) {
  const cat = historyActivityCategory(activity);
  const map = {
    maintenance: "Maintenance",
    breakdowns: "Breakdown",
    repairs: "Repair",
    inspections: "Inspection",
    parts: "Parts Replaced",
  };
  return map[cat] || String(activity || "Maintenance");
}

export function formatDurationMinutes(mins) {
  if (mins == null || mins === "") return "—";
  const n = Number(mins);
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n < 60) return `${n} mins`;
  const hrs = n / 60;
  return hrs % 1 === 0 ? `${hrs} hrs` : `${hrs.toFixed(2)} hrs`;
}

export function formatDowntimeDisplay(mins) {
  if (mins == null || mins === "") return "0 mins";
  const n = Number(mins);
  if (!Number.isFinite(n) || n <= 0) return "0 mins";
  if (n < 60) return `${n} mins`;
  const hrs = n / 60;
  return hrs % 1 === 0 ? `${hrs.toFixed(2)} hrs` : `${hrs.toFixed(2)} hrs`;
}

export function downtimeColorClass(mins) {
  const n = Number(mins);
  if (!Number.isFinite(n) || n <= 0) return "text-slate-700";
  if (n >= 120) return "text-[var(--kpi-danger)] font-semibold";
  if (n >= 90) return "text-[var(--kpi-orange)] font-semibold";
  return "text-slate-700";
}

export function historyStatusLabel(status, activity) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "Completed";
  if (s === "resolved") return "Resolved";
  if (s === "in_progress") return "In Progress";
  if (s === "reported") return historyActivityCategory(activity) === "breakdowns" ? "In Progress" : "Reported";
  if (s === "closed") return "Closed";
  if (s === "verified") return "Verified";
  if (!s) return historyActivityCategory(activity) === "breakdowns" ? "Resolved" : "Completed";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

/** Month-over-month trend for KPI cards — pass rows with a date field. */
export function computeMonthTrend(rows, { dateKey = "event_date", match } = {}) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const countInMonth = (month, year) =>
    rows.filter((r) => {
      if (match && !match(r)) return false;
      const raw = r[dateKey];
      const d = raw ? new Date(String(raw).includes("T") ? raw : `${String(raw).slice(0, 10)}T12:00:00`) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;

  const current = countInMonth(thisMonth, thisYear);
  const previous = countInMonth(lastMonth, lastYear);
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { pct: 100, dir: "up", positive: true };
  const pct = Math.round(Math.abs(((current - previous) / previous) * 100));
  const dir = current >= previous ? "up" : "down";
  return { pct, dir, positive: true };
}

export function pctOfTotal(part, total) {
  if (!total) return "0% of total";
  return `${Math.round((part / total) * 100)}% of total`;
}

export function equipmentStatusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "running") return "Running";
  if (s === "maintenance" || s === "under_maintenance") return "Under Maintenance";
  if (s === "breakdown" || s === "out_of_service") return "Out of Service";
  if (s === "idle") return "Idle";
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

export function equipmentStatusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "running") return "bg-[var(--kpi-success-soft)] text-[var(--kpi-success)]";
  if (s === "maintenance" || s === "under_maintenance") return "bg-[var(--kpi-orange-soft)] text-[var(--kpi-orange)]";
  if (s === "breakdown" || s === "out_of_service") return "bg-[var(--kpi-danger-soft)] text-[var(--kpi-danger)]";
  return "bg-[var(--kpi-neutral-soft)] text-[var(--kpi-neutral)]";
}
