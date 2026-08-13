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
  calendar_events: [],
  machine_health: [],
  downtime_trend: [],
  availability_trend: [],
  cost_trend: [],
  breakdown_frequency: [],
  mttr_trend: [],
  mtbf_trend: [],
  preventive_vs_breakdown: [],
  spare_parts: [],
  work_orders: [],
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
