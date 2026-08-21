import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Plus, Search, X, Check } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { inputClass } from "../../design-system/classes";

const PAGE_SIZES = [20, 50, 100];
const PANEL_CLASS =
  "flex max-h-[90vh] w-full max-w-[440px] flex-col overflow-hidden rounded-l-2xl bg-white shadow-2xl animate-[slideInRight_0.28s_ease-out]";

const STATUS_COLORS = {
  Pending:  { bg: "#fef9c3", text: "#854d0e" },
  Approved: { bg: "#dcfce7", text: "#15803d" },
  Rejected: { bg: "#fee2e2", text: "#dc2626" },
};

function SoftField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-[#6b6b76]">
        {label}{required ? <span className="text-[#e11d48]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

const EMPTY_FORM = { employee_id: "", record_date: new Date().toISOString().slice(0, 10), new_check_in: "", new_check_out: "", reason: "" };

function CorrectionFormPanel({ open, employees, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setError("");
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id) { setError("Please select an employee."); return; }
    if (!form.record_date) { setError("Date is required."); return; }
    if (!form.reason.trim()) { setError("Reason is required."); return; }
    setSaving(true); setError("");
    try {
      await axiosInstance.post("/hr/attendance/corrections", {
        employee_id: Number(form.employee_id),
        record_date: form.record_date,
        new_check_in: form.new_check_in || null,
        new_check_out: form.new_check_out || null,
        reason: form.reason.trim(),
      });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Submit failed.");
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-end bg-black/40 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <form onSubmit={handleSubmit} className={PANEL_CLASS} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#ececf0] px-5 py-4">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">New Correction Request</h2>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[#6b6b76] hover:bg-[#f5f5f7] transition-colors" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            <SoftField label="Employee" required>
              <select value={form.employee_id} onChange={set("employee_id")} className={inputClass}>
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name || e.name || `Employee ${e.id}`}</option>
                ))}
              </select>
            </SoftField>

            <SoftField label="Date" required>
              <input type="date" value={form.record_date} onChange={set("record_date")} className={inputClass} />
            </SoftField>

            <div className="grid grid-cols-2 gap-3">
              <SoftField label="New Check-in Time">
                <input type="time" value={form.new_check_in} onChange={set("new_check_in")} className={inputClass} />
              </SoftField>
              <SoftField label="New Check-out Time">
                <input type="time" value={form.new_check_out} onChange={set("new_check_out")} className={inputClass} />
              </SoftField>
            </div>

            <SoftField label="Reason" required>
              <textarea
                value={form.reason}
                onChange={set("reason")}
                placeholder="Explain the correction reason…"
                rows={3}
                className="ui-input w-full resize-none"
              />
            </SoftField>

            {error && (
              <div className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">{error}</div>
            )}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-[#ececf0] px-5 py-4">
          <button type="button" onClick={onClose} className="ui-btn-secondary w-full py-2.5 text-[14px]">Cancel</button>
          <button type="submit" disabled={saving} className="ui-btn-primary py-2.5 text-[14px] disabled:opacity-60">
            {saving ? "Submitting…" : "Submit"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

export default function AttendanceApproval() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/hr/employees");
      const data = Array.isArray(res.data?.results ?? res.data) ? (res.data?.results ?? res.data) : [];
      setEmployees(data);
    } catch { setEmployees([]); }
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/hr/attendance/corrections");
      const data = Array.isArray(res.data?.results ?? res.data) ? (res.data?.results ?? res.data) : [];
      setRecords(data.map((r) => ({ ...r, approvalStatus: r.approvalStatus || r.approval_status || r.status || "Pending" })));
    } catch { setRecords([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadEmployees(); loadRecords(); }, [loadEmployees, loadRecords]);

  const updateStatus = async (id, status) => {
    try {
      await axiosInstance.patch(`/hr/attendance/corrections/${id}/status`, { status });
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, approvalStatus: status } : r));
    } catch { /* ignore */ }
  };

  const filtered = records.filter((r) => {
    const byStatus = statusFilter === "All" || r.approvalStatus === statusFilter;
    const empName = r.emp || r.employee_name || "";
    const bySearch = !search || empName.toLowerCase().includes(search.toLowerCase());
    return byStatus && bySearch;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pending  = records.filter((r) => r.approvalStatus === "Pending").length;
  const approved = records.filter((r) => r.approvalStatus === "Approved").length;
  const rejected = records.filter((r) => r.approvalStatus === "Rejected").length;

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text)]">Attendance Approvals</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Review and approve attendance correction requests.</p>
          </div>
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> New Correction
          </button>
        </div>

        {/* KPI Strip */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Requests", value: records.length, color: "#0f6d84", bg: "#cffafe" },
            { label: "Pending",        value: pending,        color: "#854d0e", bg: "#fef9c3" },
            { label: "Approved",       value: approved,       color: "#15803d", bg: "#dcfce7" },
            { label: "Rejected",       value: rejected,       color: "#dc2626", bg: "#fee2e2" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b76]">{k.label}</p>
              <p className="mt-1.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#e4e4ea] bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#f0f0f4] px-5 py-4">
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search employee…"
                className="w-full rounded-lg border border-[#e8e8ee] bg-[#f8f8fb] py-2 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[var(--color-primary)] focus:bg-white transition-colors"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {["All", "Pending", "Approved", "Rejected"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-all ${statusFilter === s ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[#e2e2e8] bg-white text-[#6b6b76] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                  {["SR No.", "Employee", "Date", "New Check-in", "New Check-out", "Reason", "Status","Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No correction requests found</td></tr>
                ) : rows.map((r, i) => {
                  const sc = STATUS_COLORS[r.approvalStatus] || { bg: "#f3f4f6", text: "#6b7280" };
                  return (
                    <tr key={r.id || i} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                      <td className="px-4 py-3.5 text-[#9a9aa5]">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3.5 font-semibold text-[#1a1a1f]">{r.emp || r.employee_name || "—"}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55] whitespace-nowrap">{r.date || r.record_date || "—"}</td>
                      <td className="px-4 py-3.5 font-semibold text-[#15803d]">{r.new_check_in || r.newIn || "—"}</td>
                      <td className="px-4 py-3.5 font-semibold text-[#15803d]">{r.new_check_out || r.newOut || "—"}</td>
                      <td className="max-w-[180px] truncate px-4 py-3.5 text-[#4a4a55]" title={r.reason}>{r.reason || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: sc.bg, color: sc.text }}>
                          {r.approvalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {r.approvalStatus === "Pending" ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateStatus(r.id, "Approved")}
                              className="grid h-8 w-8 place-items-center rounded-full bg-[#dcfce7] text-[#15803d] hover:bg-[#bbf7d0] transition-colors"
                              title="Approve"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => updateStatus(r.id, "Rejected")}
                              className="grid h-8 w-8 place-items-center rounded-full bg-[#fee2e2] text-[#dc2626] hover:bg-[#fecaca] transition-colors"
                              title="Reject"
                            >
                              <X className="h-3.5 w-3.5" />
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

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0f4] px-5 py-3.5 text-[12px] text-[#6b6b76]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-lg border border-[#e2e2e8] bg-white px-2 py-1 outline-none focus:border-[var(--color-primary)]">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-[#9a9aa5]">{total === 0 ? "0–0 of 0" : `${from}–${to} of ${total}`}</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors" aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" className="grid h-8 min-w-[32px] place-items-center rounded-lg border px-2 text-[13px] font-semibold text-white" style={{ background: "var(--color-primary)", borderColor: "var(--color-primary)" }}>
                {page}
              </button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors" aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <CorrectionFormPanel
        open={formOpen}
        employees={employees}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); loadRecords(); }}
      />
    </div>
  );
}
