import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail, Phone, X, User, Briefcase, Clock, Calendar,
  DollarSign, TrendingUp, Package, Loader2
} from "lucide-react";

import { deptColor, formatInr, statusColor } from "../../data/hrMasterData";
import api from "../../api/axiosConfig";

const TABS = ["Personal", "Job", "Attendance", "Leave", "Payroll", "Performance", "Assets"];

// ─── helpers ────────────────────────────────────────────────────────────────
function Field({ label, value, children, icon: Icon }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      {children || (
        <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
          {Icon && <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
          {value ?? "—"}
        </p>
      )}
    </div>
  );
}

function TabSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
      <p className="text-sm text-slate-500">Loading data…</p>
    </div>
  );
}

function EmptyTab({ icon: Icon, label }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm text-slate-500">No {label} records found for this employee.</p>
    </div>
  );
}

function StatusBadge({ value }) {
  const s = (value || "").toLowerCase();
  const map = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-slate-200 text-slate-600",
    present: "bg-green-100 text-green-700",
    absent: "bg-red-100 text-red-700",
    late: "bg-amber-100 text-amber-700",
    half_day: "bg-orange-100 text-orange-700",
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    draft: "bg-slate-100 text-slate-600",
    processed: "bg-blue-100 text-blue-700",
    paid: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${map[s] || "bg-slate-100 text-slate-600"}`}>
      {value || "—"}
    </span>
  );
}

// ─── tab panels ──────────────────────────────────────────────────────────────
function AttendanceTab({ employeeId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    api.get("/hr/attendance", { params: { employee_id: employeeId } })
      .then(r => setData(Array.isArray(r.data) ? r.data : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) return <TabSpinner />;
  if (!data?.length) return <EmptyTab icon={Clock} label="attendance" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {["Date", "Check In", "Check Out", "Work Hours", "Overtime", "Status"].map(h => (
              <th key={h} className="pb-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.slice(0, 15).map((r, i) => (
            <tr key={r.id ?? i} className="hover:bg-slate-50 transition-colors">
              <td className="py-2 pr-3 font-medium text-slate-700">{r.record_date ? String(r.record_date).slice(0, 10) : "—"}</td>
              <td className="py-2 pr-3 text-slate-600">{r.clock_in ? String(r.clock_in).slice(11, 16) : "—"}</td>
              <td className="py-2 pr-3 text-slate-600">{r.clock_out ? String(r.clock_out).slice(11, 16) : "—"}</td>
              <td className="py-2 pr-3 text-slate-600">{r.work_hours != null ? `${Number(r.work_hours).toFixed(1)}h` : "—"}</td>
              <td className="py-2 pr-3 text-slate-600">{r.overtime_hours != null ? `${Number(r.overtime_hours).toFixed(1)}h` : "—"}</td>
              <td className="py-2"><StatusBadge value={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 15 && (
        <p className="mt-2 text-xs text-slate-400 text-right">Showing 15 of {data.length} records. <Link to="/hr/attendance" className="text-blue-500 hover:underline">View all →</Link></p>
      )}
    </div>
  );
}

function LeaveTab({ employeeId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    api.get("/hr/leave", { params: { employee_id: employeeId } })
      .then(r => setData(Array.isArray(r.data) ? r.data : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) return <TabSpinner />;
  if (!data?.length) return <EmptyTab icon={Calendar} label="leave" />;

  return (
    <div className="space-y-2">
      {data.map((l, i) => (
        <div key={l.id ?? i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800 capitalize">{l.leave_type || "Leave"}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {l.start_date ? String(l.start_date).slice(0, 10) : "—"} → {l.end_date ? String(l.end_date).slice(0, 10) : "—"}
              <span className="ml-2 font-medium text-slate-600">({l.days ?? "?"} day{l.days !== 1 ? "s" : ""})</span>
            </p>
            {l.reason && <p className="text-xs text-slate-400 mt-0.5 italic">"{l.reason}"</p>}
          </div>
          <StatusBadge value={l.status} />
        </div>
      ))}
    </div>
  );
}

function PayrollTab({ employeeId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    api.get("/hr/payroll", { params: { employee_id: employeeId } })
      .then(r => setData(Array.isArray(r.data) ? r.data : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) return <TabSpinner />;
  if (!data?.length) return <EmptyTab icon={DollarSign} label="payroll" />;

  return (
    <div className="space-y-3">
      {data.map((p, i) => (
        <div key={p.id ?? i} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Period</p>
              <p className="text-sm font-semibold text-slate-800">
                {p.period_start ? String(p.period_start).slice(0, 10) : "—"} to {p.period_end ? String(p.period_end).slice(0, 10) : "—"}
              </p>
            </div>
            <StatusBadge value={p.status} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Basic</p>
              <p className="font-semibold text-slate-700">{p.basic != null ? formatInr(p.basic) : "—"}</p>
            </div>
            <div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Gross</p>
              <p className="font-semibold text-slate-700">{p.gross_pay != null ? formatInr(p.gross_pay) : "—"}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
              <p className="text-[10px] text-emerald-600 uppercase font-bold">Net Pay</p>
              <p className="font-bold text-emerald-700">{p.net_pay != null ? formatInr(p.net_pay) : "—"}</p>
            </div>
            <div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Overtime</p>
              <p className="font-semibold text-slate-700">{p.overtime_pay != null ? formatInr(p.overtime_pay) : "—"}</p>
            </div>
            <div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Deductions</p>
              <p className="font-semibold text-red-600">{p.deductions != null ? formatInr(p.deductions) : "—"}</p>
            </div>
            <div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase font-bold">PF + ESI</p>
              <p className="font-semibold text-slate-700">
                {(p.pf != null || p.esi != null) ? formatInr((p.pf || 0) + (p.esi || 0)) : "—"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PerformanceTab({ employeeId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    api.get("/hr/performance", { params: { employee_id: employeeId } })
      .then(r => setData(Array.isArray(r.data) ? r.data : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) return <TabSpinner />;
  if (!data?.length) return <EmptyTab icon={TrendingUp} label="performance" />;

  const scoreColor = (s) => {
    if (!s) return "text-slate-500";
    const n = Number(s);
    if (n >= 4) return "text-green-600";
    if (n >= 3) return "text-blue-600";
    if (n >= 2) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-3">
      {data.map((p, i) => (
        <div key={p.id ?? i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">{p.review_period || p.period || "Review"}</p>
                {p.rating != null && (
                  <span className={`text-sm font-bold ${scoreColor(p.rating)}`}>{Number(p.rating).toFixed(1)} / 5</span>
                )}
              </div>
              {p.reviewer && <p className="text-xs text-slate-500 mt-0.5">Reviewed by: {p.reviewer}</p>}
              {p.review_date && <p className="text-xs text-slate-400">{String(p.review_date).slice(0, 10)}</p>}
              {p.comments && <p className="mt-2 text-sm text-slate-600 bg-white rounded-lg border border-slate-100 px-3 py-2">"{p.comments}"</p>}
            </div>
            {p.status && <StatusBadge value={p.status} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function AssetsTab({ employeeName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeName) return;
    setLoading(true);
    api.get("/hr/assets")
      .then(r => {
        const all = Array.isArray(r.data) ? r.data : [];
        // assigned_to is a name string — match against employee full_name
        const name = (employeeName || "").toLowerCase().trim();
        setData(all.filter(a => (a.assigned_to || "").toLowerCase().trim() === name));
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [employeeName]);

  if (loading) return <TabSpinner />;
  if (!data?.length) return <EmptyTab icon={Package} label="asset" />;

  return (
    <div className="space-y-2">
      {data.map((a, i) => (
        <div key={a.id ?? i} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <Package className="h-4.5 w-4.5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{a.name || "—"}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-2">
              {a.asset_code && <span className="font-mono bg-slate-100 px-1 rounded">{a.asset_code}</span>}
              {a.category && <span className="capitalize">{a.category}</span>}
              {a.location && <span>📍 {a.location}</span>}
              {a.purchase_date && <span>Purchased: {String(a.purchase_date).slice(0, 10)}</span>}
              {a.purchase_cost > 0 && <span>{formatInr(a.purchase_cost)}</span>}
            </p>
          </div>
          <StatusBadge value={a.status} />
        </div>
      ))}
    </div>
  );
}

// ─── main modal ──────────────────────────────────────────────────────────────
export default function EmployeeDetailModal({ employee, onClose }) {
  const [tab, setTab] = useState("Personal");
  if (!employee) return null;

  const empId = employee.id;           // numeric DB id for API calls
  const empName = employee.full_name;  // string name for assets filter

  const tabIcons = {
    Personal: User,
    Job: Briefcase,
    Attendance: Clock,
    Leave: Calendar,
    Payroll: DollarSign,
    Performance: TrendingUp,
    Assets: Package,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 sm:items-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">

        {/* Header */}
        <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white shadow-md">
            {employee.initials || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-blue-600">{employee.employee_id || employee.employee_code || "—"}</p>
            <h2 className="text-xl font-bold text-slate-900 truncate">{employee.full_name}</h2>
            <p className="text-sm text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>{employee.designation || "—"}</span>
              {employee.department && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${deptColor(employee.department)}`}>
                    {employee.department}
                  </span>
                </>
              )}
              {employee.status && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColor(employee.status)}`}>
                    {employee.status}
                  </span>
                </>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 overflow-x-auto border-b border-slate-100 px-5 bg-slate-50/50">
          {TABS.map((t) => {
            const Icon = tabIcons[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                  tab === t
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {t}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="overflow-y-auto px-5 py-4 flex-1">

          {tab === "Personal" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Phone" value={employee.phone || employee.contact_phone} icon={Phone} />
              <Field label="Email" value={employee.email} icon={Mail} />
              <Field label="Joining Date" value={employee.joining_date || employee.hire_date || employee.join_date ? String(employee.joining_date || employee.hire_date || employee.join_date).slice(0, 10) : "—"} />
              <Field label="Salary" value={employee.salary ? formatInr(employee.salary) : "—"} />
              <Field label="Address" value={employee.address || employee.residential_address || "—"} />
            </div>
          )}

          {tab === "Job" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Department">
                <div className="mt-0.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${deptColor(employee.department)}`}>
                    {employee.department || "—"}
                  </span>
                </div>
              </Field>
              <Field label="Designation" value={employee.designation} />
              <Field label="Shift" value={typeof employee.shift === "object" ? (employee.shift?.label || employee.shift?.id || "—") : (employee.shift || "—")} />
              <Field label="Reporting Manager" value={employee.reporting_manager} />
              <Field label="Employee Code" value={employee.employee_code || employee.employee_id} />
              <Field label="Employment Type">
                <p className="mt-0.5 text-sm font-medium text-slate-800 capitalize">{employee.employment_type || "—"}</p>
              </Field>
              <Field label="Hire Date" value={employee.hire_date || employee.joining_date || employee.join_date ? String(employee.hire_date || employee.joining_date || employee.join_date).slice(0, 10) : "—"} />
            </div>
          )}

          {tab === "Attendance" && <AttendanceTab employeeId={empId} />}
          {tab === "Leave"      && <LeaveTab employeeId={empId} />}
          {tab === "Payroll"    && <PayrollTab employeeId={empId} />}
          {tab === "Performance" && <PerformanceTab employeeId={empId} />}
          {tab === "Assets"     && <AssetsTab employeeName={empName} />}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 bg-slate-50/50">
          <Link
            to="/hr/attendance"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Attendance
          </Link>
          <Link
            to="/hr/payroll"
            onClick={onClose}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            View Payroll
          </Link>
          <Link
            to="/hr/leave"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Leave
          </Link>
        </div>
      </div>
    </div>
  );
}
