/** HR demo data and helpers. */

export const HR_FLOW = [
  "Employee Joining", "Department Allocation", "Shift Assignment", "Attendance",
  "Production Allocation", "Performance", "Leave", "Payroll", "Exit Process",
];

export const LEAVE_TYPES = ["casual", "sick", "earned", "comp_off", "maternity", "paternity", "lop"];
export const SHIFTS = ["Morning", "General", "Evening", "Night", "Rotational"];
export const EMPLOYMENT_TYPES = ["permanent", "contract", "temporary", "intern"];
export const DEPARTMENT_COLORS = {
  Production: "bg-blue-100 text-blue-800",
  Quality: "bg-purple-100 text-purple-800",
  Maintenance: "bg-orange-100 text-orange-800",
  Stores: "bg-teal-100 text-[var(--color-success)]",
  HR: "bg-pink-100 text-pink-800",
  Finance: "bg-indigo-100 text-indigo-800",
};

export const DEMO_EMP_SUMMARY = {
  total_employees: 0, present_today: 0, absent: 0, on_leave: 0,
  overtime: 0, departments: 0, contract_employees: 0, new_joiners: 0,
};

export const DEMO_EMP_LIST = [];

export const DEMO_ATT_SUMMARY = { present: 0, absent: 0, late: 0, half_day: 0, overtime: 0, night_shift: 0, total_working_hours: 0 };
export const DEMO_ATT_LIST = [];

export const DEMO_LEAVE_SUMMARY = { pending_leave: 0, approved: 0, rejected: 0, available_leave: 0, sick_leave: 0, casual_leave: 0, earned_leave: 0 };
export const DEMO_LEAVE_LIST = [];

export const DEMO_PAY_SUMMARY = { monthly_payroll: 0, pending_salary: 0, processed_salary: 0, overtime_cost: 0, pf: 0, esi: 0, professional_tax: 0 };
export const DEMO_PAY_LIST = [];

export const DEMO_HR_HUB = {
  total_employees: 0, present_today: 0, pending_leave: 0, monthly_payroll: 0,
  overtime_hours: 0, new_joiners: 0, attrition_rate: 0,
  department_strength: [],
  shift_utilization: [],
  alerts: [],
};

export function formatInr(v) {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)} L`;
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

export function statusColor(s) {
  const m = {
    active: "bg-green-100 text-green-800", inactive: "bg-slate-200 text-slate-700",
    present: "bg-green-100 text-green-800", absent: "bg-red-100 text-red-800",
    late: "bg-amber-100 text-amber-800", half_day: "bg-orange-100 text-orange-800",
    pending: "bg-amber-100 text-amber-800", approved: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800",
    draft: "bg-slate-100 text-slate-700", processed: "bg-green-100 text-green-800", paid: "bg-green-100 text-green-800",
  };
  return m[s] || "bg-slate-100 text-slate-700";
}

export function deptColor(dept) {
  return DEPARTMENT_COLORS[dept] || "bg-slate-100 text-slate-700";
}

export function sourceLabel(s) {
  const m = { biometric: "Biometric", rfid: "RFID", gps: "GPS", qr: "QR", face: "Face Recognition", manual: "Manual" };
  return m[s] || s || "—";
}
