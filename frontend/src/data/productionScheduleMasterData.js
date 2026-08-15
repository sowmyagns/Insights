/** Production schedule demo data and helpers. */

import { PRIORITIES, PRIORITY_COLORS } from "./productionPlanningMasterData";

export { PRIORITIES, PRIORITY_COLORS };

export const TIMELINE_SLOTS = ["08AM", "10AM", "12PM", "02PM", "04PM", "06PM"];

export const SCHEDULE_FLOW_STEPS = [
  "Sales Order",
  "Production Planning",
  "Production Schedule",
  "Machine Allocation",
  "Material Issue",
  "Quality",
  "Finished Goods",
  "Inventory",
];

export const KANBAN_COLUMNS = [
  { id: "planned", label: "Planned", color: "bg-slate-100 border-slate-300" },
  { id: "ready", label: "Ready", color: "bg-blue-50 border-blue-300" },
  { id: "running", label: "Running", color: "bg-green-50 border-green-300" },
  { id: "quality", label: "Quality", color: "bg-amber-50 border-amber-300" },
  { id: "completed", label: "Completed", color: "bg-emerald-50 border-emerald-300" },
];

export const CONFLICT_LABELS = {
  machine_busy: "Machine Already Busy",
  operator_assigned: "Operator Already Assigned",
  material_unavailable: "Material Not Available",
  holiday: "Holiday",
};

export const DEMO_DASHBOARD = {
  today: "2026-07-09",
  production_target: 0,
  completed: 0,
  pending: 0,
  overall_progress_pct: 0,
  machine_utilization_pct: 0,
  operators_present: 0,
  delayed_orders: 0,
  material_shortage: 0,
};

export const DEMO_TIMELINE = [];

export const DEMO_SHIFTS = [];

export const DEMO_LIVE_MACHINES = [];

export const DEMO_QUEUE = [];

export const DEMO_MATERIALS = [];

export const DEMO_CONFLICTS = [];

export const DEMO_BOTTOM_KPIS = {
  todays_production: 0,
  pending_orders: 0,
  machine_efficiency_pct: 0,
  shift_efficiency_pct: 0,
  downtime_minutes: 0,
  power_kwh: 0,
  oee_pct: 0,
  quality_rate_pct: 0,
};

export const DEMO_CALENDAR_EVENTS = [];

export const DEMO_KANBAN = {
  planned: [],
  ready: [],
  running: [],
  quality: [],
  completed: [],
};

export const DEMO_TABLE_ROWS = [];

export const DEMO_RESOURCE = {
  machine: null,
  operator: null,
  shift: null,
  supervisor: null,
};

export function priorityBadge(priority) {
  const p = (priority || "medium").toLowerCase();
  const colors = PRIORITY_COLORS[p] || PRIORITY_COLORS.medium;
  return { label: p.charAt(0).toUpperCase() + p.slice(1), ...colors };
}

export function machineStatusColor(status) {
  const s = (status || "").toLowerCase();
  if (s === "running") return "text-green-600 bg-green-100";
  if (s === "idle") return "text-amber-600 bg-amber-100";
  if (s === "breakdown" || s === "maintenance") return "text-red-600 bg-red-100";
  return "text-slate-600 bg-slate-100";
}

export function machineStatusDot(status) {
  const s = (status || "").toLowerCase();
  if (s === "running") return "🟢";
  if (s === "idle") return "🟡";
  return "🔴";
}

export function formatScheduleDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function mergeTimeline(apiRows) {
  return apiRows?.length ? apiRows : [];
}

export function buildTableFromTimeline(timeline, shifts) {
  if (!timeline?.length) return DEMO_TABLE_ROWS;
  return timeline
    .filter((r) => r.work_order_id)
    .map((r, i) => {
      const shift = shifts?.[i % (shifts?.length || 1)];
      return {
        id: `api-${r.work_order_id}`,
        schedule_id: `SCH-${String(100 + i).padStart(3, "0")}`,
        work_order_number: r.work_order_number,
        product_name: r.job_label,
        machine_name: r.machine_name,
        operator_name: shift?.operator_name || "—",
        shift: shift?.shift_name || "—",
        start: "08:00",
        end: "18:00",
        quantity: shift?.quantity || 0,
        status: r.status,
        priority: "medium",
      };
    });
}
