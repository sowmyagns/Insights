import KpiCard from "../../components/common/KpiCard";
import PageHeader from "../../components/common/PageHeader";
﻿import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Calendar, CheckCircle, Clock, Coffee, HeartPulse, Plus, XCircle, X, Save } from "lucide-react";
import usePageRefresh from "../../hooks/usePageRefresh";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getLeaveEnriched, getLeaveSummary, updateLeaveRequest, createLeaveRequest, getEmployeesEnriched } from "../../api/hrApi";
import { LEAVE_TYPES, statusColor } from "../../data/hrMasterData";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all";

const ALL_LEAVE_TYPES = [
  { value: "casual", label: "Casual Leave (CL)" },
  { value: "sick", label: "Sick / Medical Leave (SL)" },
  { value: "earned", label: "Earned / Privilege Leave (EL/PL)" },
  { value: "annual", label: "Annual Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "comp_off", label: "Compensatory Off (Comp-Off)" },
  { value: "marriage", label: "Marriage Leave" },
  { value: "bereavement", label: "Bereavement Leave" },
  { value: "study", label: "Study / Training Leave" },
  { value: "unpaid", label: "Loss of Pay (LOP) / Unpaid Leave" },
];


export default function Leave() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState("table");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    employee_id: "",
    leave_type: "casual",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    reason: "",
  });

  const load = useCallback(async (isManual = false) => {
    setLoading(true);
    try {
      const [sumRes, listRes, empRes] = await Promise.allSettled([
        getLeaveSummary(),
        getLeaveEnriched(),
        getEmployeesEnriched()
      ]);
      if (sumRes.status === "fulfilled" && sumRes.value?.data) {
        setSummary(sumRes.value.data || {});
      } else {
        setSummary({});
      }
      if (listRes.status === "fulfilled" && Array.isArray(listRes.value?.data)) {
        setRows([...listRes.value.data]);
      } else {
        setRows([]);
      }
      if (empRes.status === "fulfilled" && Array.isArray(empRes.value?.data)) {
        setEmployees([...empRes.value.data]);
      } else {
        setEmployees([]);
      }
    } catch {
      setSummary({});
      setRows([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    await load();
  };

  usePageRefresh(handleRefresh);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!statusFilter) return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  const handleStatus = async (id, status) => {
    if (typeof id === "number") {
      try {
        await updateLeaveRequest(id, { status });
        addToast(`Leave ${status}`);
        load();
      } catch (err) {
        addToast(err.response?.data?.detail || "Update failed", "error");
      }
    } else {
      addToast(`Leave ${status} (demo)`);
      load();
    }
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.start_date || !form.end_date) {
      setError("Select employee and date range.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createLeaveRequest({
        employee_id: Number(form.employee_id),
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason.trim() || null,
        status: "pending",
      });
      addToast("Leave request submitted successfully", "success");
      setShowCreateModal(false);
      setForm({
        employee_id: "",
        leave_type: "casual",
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
        reason: "",
      });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit leave request.");
      addToast("Failed to submit request", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "employee_name", label: "Employee" },
    { key: "leave_type", label: "Type", render: (r) => <span className="capitalize">{r.leave_type?.replace("_", " ")}</span> },
    { key: "start_date", label: "From" },
    { key: "end_date", label: "To" },
    { key: "days", label: "Days" },
    { key: "reason", label: "Reason", render: (r) => r.reason || "—" },
    { key: "status", label: "Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColor(r.status)}`}>{r.status}</span> },
    { key: "actions", label: "Actions", render: (r) => r.status === "pending" ? (
      <div className="flex gap-2">
        <button type="button" onClick={() => handleStatus(r.id, "approved")} className="text-xs font-semibold text-green-600 hover:underline">Approve</button>
        <button type="button" onClick={() => handleStatus(r.id, "rejected")} className="text-xs font-semibold text-red-600 hover:underline">Reject</button>
      </div>
    ) : "—" },
  ];

  if (loading && rows.length === 0) return <Loader label="Loading leave requests..." />;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        subtitle="Leave calendar, multi-level approval workflow, and balance tracking."
        action={
          <>
            <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="ui-btn-hr"
          >
            <Plus className="h-4 w-4" /> Request Leave
          </button>
          </>
        }
      />

      <div className="ui-grid-kpi">
        <KpiCard label="Pending Requests" value={summary.pending_leave} icon={Clock} color="bg-amber-500" />
        <KpiCard label="Approved" value={summary.approved} icon={CheckCircle} color="bg-green-600" />
        <KpiCard label="Rejected" value={summary.rejected} icon={XCircle} color="bg-red-500" />
        <KpiCard label="Pending Leave Days" value={summary.available_leave} icon={Calendar} color="bg-[var(--color-primary)]" />
        <KpiCard label="Sick Leave" value={summary.sick_leave} icon={HeartPulse} color="bg-orange-500" />
        <KpiCard label="Casual" value={summary.casual_leave} icon={Coffee} color="bg-indigo-600" />
        <KpiCard label="Earned" value={summary.earned_leave} icon={Award} color="bg-teal-600" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
        {["Employee", "Manager", "Human Resources (HR)", "Approved"].map((s, i, arr) => (
          <span key={s} className="flex items-center gap-2">
            <span className="rounded-lg bg-white px-2 py-1 shadow-sm">{s}</span>
            {i < arr.length - 1 && <span className="text-slate-400">↓</span>}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ui-input">
          <option value="">All Status</option>
          {["pending", "approved", "rejected"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
          <button type="button" onClick={() => setView("table")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === "table" ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-slate-500"}`}>Table</button>
          <button type="button" onClick={() => setView("calendar")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === "calendar" ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-slate-500"}`}>Calendar</button>
        </div>
      </div>

      {view === "table" ? (
        <div className="ui-card p-4">
          <DataTable columns={columns} data={filtered} searchPlaceholder="Search employee, type..." searchKeys={["employee_name", "leave_type"]} />
        </div>
      ) : (
        <div className="ui-card p-5">
          <h2 className="mb-4 font-semibold text-slate-900 font-sans">July 2026 — Leave Calendar</h2>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-2 font-semibold text-slate-500">{d}</div>)}
            {Array.from({ length: 31 }, (_, i) => {
              const day = i + 1;
              const hasLeave = filtered.some((l) => {
                const s = new Date(l.start_date).getDate();
                const e = new Date(l.end_date).getDate();
                return day >= s && day <= e;
              });
              return (
                <div key={day} className={`rounded-lg py-2 ${hasLeave ? "bg-amber-100 font-semibold text-amber-800" : "text-slate-600"}`}>{day}</div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {LEAVE_TYPES.map((t) => <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">{t.replace("_", " ")}</span>)}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Request Leave</h3>
                <p className="text-xs text-slate-500 mt-0.5">Submit a new employee leave request.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Employee *</label>
                <select
                  value={form.employee_id}
                  onChange={(e) => handleFormChange("employee_id", e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Type</label>
                <select
                  value={form.leave_type}
                  onChange={(e) => handleFormChange("leave_type", e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {ALL_LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => handleFormChange("start_date", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">End Date *</label>
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => handleFormChange("end_date", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</label>
                <textarea
                  rows={3}
                  placeholder="Describe reason for leave request..."
                  value={form.reason}
                  onChange={(e) => handleFormChange("reason", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="ui-btn-hr"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
