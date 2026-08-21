import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { inputClass } from "../../design-system/classes";

const PAGE_SIZES = [20, 50, 100];
const LEAVE_TYPES = [
  "Casual Leave", "Compensatory Off", "Earned Leave", "Leave Without Pay",
  "Maternity Leave", "Paternity Leave", "Sabbatical Leave", "Sick Leave",
];
const STATUS_STYLE = {
  pending:  { bg: "#fef9c3", text: "#854d0e" },
  approved: { bg: "#dcfce7", text: "#15803d" },
  rejected: { bg: "#fde8e8", text: "#dc2626" },
};
const PANEL_CLASS =
  "flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-l-xl bg-white shadow-2xl animate-[slideInRight_0.28s_ease-out]";

function calcDays(s, e) {
  if (!s || !e) return 0;
  return Math.max(1, Math.ceil((new Date(e) - new Date(s)) / 86400000) + 1);
}

function SoftField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-[#8a8a95]">
        {label}{required && <span className="text-[#e11d48]"> *</span>}
      </span>
      {children}
    </label>
  );
}

function ApplyPanel({ open, employees, onClose, onSaved }) {
  const [form, setForm] = useState({ employee_id: "", leave_type: "", start_date: "", end_date: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({ employee_id: String(employees[0]?.id || ""), leave_type: "", start_date: "", end_date: "", reason: "" });
    setError("");
  }, [open, employees]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const days = calcDays(form.start_date, form.end_date);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.leave_type || !form.start_date || !form.end_date) {
      setError("Please fill all required fields."); return;
    }
    if (form.end_date < form.start_date) { setError("End date cannot be before start date."); return; }
    setSaving(true); setError("");
    try {
      await axiosInstance.post("/hr/leaves", {
        employee_id: parseInt(form.employee_id),
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || null,
        status: "pending",
      });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Save failed.");
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-end bg-black/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <form onSubmit={handleSubmit} className={PANEL_CLASS} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#ececf0] px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">New Leave Request</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-[#f5f5f7]"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-3">
          <SoftField label="Employee" required>
            <select value={form.employee_id} onChange={set("employee_id")} className={inputClass}>
              <option value="">Select Employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name || e.name}</option>)}
            </select>
          </SoftField>
          <SoftField label="Leave Type" required>
            <select value={form.leave_type} onChange={set("leave_type")} className={inputClass}>
              <option value="">Select Leave Type</option>
              {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </SoftField>
          <div className="grid grid-cols-2 gap-3">
            <SoftField label="From Date" required>
              <input type="date" value={form.start_date} onChange={set("start_date")} className={inputClass} />
            </SoftField>
            <SoftField label="To Date" required>
              <input type="date" value={form.end_date} onChange={set("end_date")} className={inputClass} />
            </SoftField>
          </div>
          <div className="flex gap-6 rounded-lg bg-[#f5f5f8] px-4 py-2.5 text-[12px]">
            <span className="text-[#6b6b76]">Days: <b className="text-[#1a1a1f]">{days}</b></span>
            <span className="text-[#6b6b76]">Remaining: <b className="text-[#1a1a1f]">—</b></span>
          </div>
          <SoftField label="Reason">
            <textarea value={form.reason} onChange={set("reason")} placeholder="Enter reason" rows={3} className={inputClass + " resize-none"} />
          </SoftField>
          <SoftField label="Attachment">
            <button type="button" className="ui-btn-outline ui-btn--sm">＋ Upload Document</button>
          </SoftField>
          {error && <div className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">{error}</div>}
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-[#ececf0] px-5 py-3.5">
          <button type="button" onClick={onClose} className="ui-btn-secondary w-full py-3 text-[14px]">Cancel</button>
          <button type="submit" disabled={saving} className="ui-btn-primary py-3 text-[14px] disabled:opacity-60">
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

export default function LeaveApprovals() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lv, emp] = await Promise.all([
        axiosInstance.get("/hr/leaves"),
        axiosInstance.get("/hr/employees"),
      ]);
      setRecords(Array.isArray(lv.data) ? lv.data : []);
      setEmployees(Array.isArray(emp.data) ? emp.data : []);
    } catch { setRecords([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") list = list.filter((r) => (r.status || "").toLowerCase() === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => [r.employee_name, r.leave_type, r.reason].filter(Boolean).join(" ").toLowerCase().includes(q));
    }
    return list;
  }, [records, statusFilter, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const act = async (id, status) => {
    try { await axiosInstance.patch(`/hr/leaves/${id}/approve`, { status }); load(); } catch { /* ignore */ }
  };

  const kpis = [
    { label: "Total Requests", value: records.length, color: "var(--color-primary)" },
    { label: "Pending", value: records.filter((r) => r.status === "pending").length, color: "#854d0e" },
    { label: "Approved", value: records.filter((r) => r.status === "approved").length, color: "#15803d" },
    { label: "Rejected", value: records.filter((r) => r.status === "rejected").length, color: "#dc2626" },
  ];

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-[var(--color-text)]">Leave Approvals</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Review and approve employee leave requests.</p>
          </div>
          <button
            onClick={() => setPanelOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Leave Request
          </button>
        </div>

        {/* KPIs */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3">
              <p className="text-[11px] font-medium text-[#6b6b76]">{k.label}</p>
              <p className="mt-0.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="ui-card p-4 sm:p-5">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search employee or leave type…"
                className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[#d0d0d8] focus:bg-white" />
            </div>
            {["all", "pending", "approved", "rejected"].map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold capitalize transition ${
                  statusFilter === s
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[#e2e2e8] bg-white text-[#6b6b76] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                }`}>
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-[#ececf0]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#e8e8ee] bg-[#f5f5f5] text-[12px] font-medium text-[#6b6b76]">
                    {["SR No.", "Employee", "Leave Type", "From", "To", "Days", "Reason", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">Loading…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No records found</td></tr>
                  ) : rows.map((r, i) => {
                    const sc = STATUS_STYLE[(r.status || "").toLowerCase()] || { bg: "#f3f4f6", text: "#6b7280" };
                    return (
                      <tr key={r.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa]">
                        <td className="px-4 py-3.5 text-[#6b6b76]">{(page - 1) * pageSize + i + 1}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[12px] font-bold text-[var(--color-primary)]">
                              {(r.employee_name || "?")[0].toUpperCase()}
                            </div>
                            <span className="font-semibold text-[#1a1a1f]">{r.employee_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[#4a4a55]">{r.leave_type}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#4a4a55]">{r.start_date || "—"}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#4a4a55]">{r.end_date || "—"}</td>
                        <td className="px-4 py-3.5 font-semibold text-[#1a1a1f]">{r.days ?? "—"}</td>
                        <td className="px-4 py-3.5 text-[#6b6b76] max-w-[160px] truncate">{r.reason || "—"}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                            style={{ background: sc.bg, color: sc.text }}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {r.status === "pending" ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => act(r.id, "approved")}
                                className="rounded-lg bg-[#dcfce7] px-2.5 py-1 text-[11px] font-semibold text-[#15803d] hover:bg-[#bbf7d0]">
                                ✓ Approve
                              </button>
                              <button onClick={() => act(r.id, "rejected")}
                                className="rounded-lg bg-[#fde8e8] px-2.5 py-1 text-[11px] font-semibold text-[#dc2626] hover:bg-[#fecaca]">
                                ✕ Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[12px] text-[#9a9aa5]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#6b6b76]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded border border-[#e2e2e8] bg-white px-2 py-1 outline-none">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>{total === 0 ? "0-0 of 0" : `${from}-${to} of ${total}`}</span>
            </div>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="grid h-8 w-8 place-items-center rounded border border-[#e2e2e8] bg-white disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="grid h-8 min-w-8 place-items-center rounded border px-2 text-[13px] font-semibold text-white"
                style={{ background: "var(--color-action-teal)", borderColor: "var(--color-action-teal)" }}>
                {page}
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="grid h-8 w-8 place-items-center rounded border border-[#e2e2e8] bg-white disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ApplyPanel
        open={panelOpen}
        employees={employees}
        onClose={() => setPanelOpen(false)}
        onSaved={() => { setPanelOpen(false); load(); }}
      />
    </div>
  );
}
