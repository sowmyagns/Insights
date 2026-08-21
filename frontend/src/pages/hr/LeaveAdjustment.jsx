import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { inputClass } from "../../design-system/classes";

const PAGE_SIZES = [20, 50, 100];
const LEAVE_TYPES = [
  "Casual Leave", "Compensatory Off", "Earned Leave", "Leave Without Pay",
  "Maternity Leave", "Paternity Leave", "Sabbatical Leave", "Sick Leave",
];
const PANEL_CLASS =
  "flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-l-xl bg-white shadow-2xl animate-[slideInRight_0.28s_ease-out]";

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

function AdjustPanel({ open, employees, onClose, onSaved }) {
  const [form, setForm] = useState({
    employee_id: "", leave_type: "", total_days: "", adjusted_days: "", adjusted_reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({ employee_id: String(employees[0]?.id || ""), leave_type: "", total_days: "", adjusted_days: "", adjusted_reason: "" });
    setError("");
  }, [open, employees]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.leave_type) { setError("Employee and leave type are required."); return; }
    setSaving(true); setError("");
    try {
      await axiosInstance.post("/hr/leave-balances", {
        employee_id: parseInt(form.employee_id),
        leave_type: form.leave_type,
        total_days: parseFloat(form.total_days) || 0,
        adjusted_days: parseFloat(form.adjusted_days) || 0,
        adjusted_reason: form.adjusted_reason || null,
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
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">Adjust Leave Balance</h2>
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
            <SoftField label="Total Days Allocated">
              <input type="number" min="0" step="0.5" value={form.total_days} onChange={set("total_days")} placeholder="e.g. 12" className={inputClass} />
            </SoftField>
            <SoftField label="Adjustment Days">
              <input type="number" step="0.5" value={form.adjusted_days} onChange={set("adjusted_days")} placeholder="e.g. 2 or -1" className={inputClass} />
            </SoftField>
          </div>
          <SoftField label="Reason for Adjustment">
            <textarea value={form.adjusted_reason} onChange={set("adjusted_reason")} placeholder="Enter reason" rows={3} className={inputClass + " resize-none"} />
          </SoftField>
          {error && <div className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">{error}</div>}
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-[#ececf0] px-5 py-3.5">
          <button type="button" onClick={onClose} className="ui-btn-secondary w-full py-3 text-[14px]">Cancel</button>
          <button type="submit" disabled={saving} className="ui-btn-primary py-3 text-[14px] disabled:opacity-60">
            {saving ? "Saving…" : "Save Adjustment"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

export default function LeaveAdjustment() {
  const [balances, setBalances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bal, emp] = await Promise.all([
        axiosInstance.get("/hr/leave-balances"),
        axiosInstance.get("/hr/employees"),
      ]);
      setBalances(Array.isArray(bal.data) ? bal.data : []);
      setEmployees(Array.isArray(emp.data) ? emp.data : []);
    } catch { setBalances([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? balances.filter((b) => (b.employee_name || "").toLowerCase().includes(search.toLowerCase()))
    : balances;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-[var(--color-text)]">Leave Adjustment</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Adjust employee leave balances by type.</p>
          </div>
          <button
            onClick={() => setPanelOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Adjust Balance
          </button>
        </div>

        {/* KPIs */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Records", value: balances.length, color: "var(--color-primary)" },
            { label: "Employees Covered", value: new Set(balances.map((b) => b.employee_id)).size, color: "#1d4ed8" },
            { label: "Total Allocated Days", value: balances.reduce((s, b) => s + (b.total_days || 0), 0), color: "#15803d" },
            { label: "Total Used Days", value: balances.reduce((s, b) => s + (b.used_days || 0), 0), color: "#854d0e" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3">
              <p className="text-[11px] font-medium text-[#6b6b76]">{k.label}</p>
              <p className="mt-0.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="ui-card p-4 sm:p-5">
          {/* Search */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search employee…"
                className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[#d0d0d8] focus:bg-white" />
            </div>
            {search && (
              <button onClick={() => setSearch("")} className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] text-[#6b6b76] hover:bg-[#f5f5f7]">✕ Clear</button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-[#ececf0]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#e8e8ee] bg-[#f5f5f5] text-[12px] font-medium text-[#6b6b76]">
                    {["SR No.", "Employee", "Leave Type", "Year", "Total Days", "Used Days", "Adjusted", "Available", "Adjusted By"].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">Loading…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No leave balance records found</td></tr>
                  ) : rows.map((r, i) => (
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
                      <td className="px-4 py-3.5 text-[#4a4a55]">{r.year}</td>
                      <td className="px-4 py-3.5 font-semibold text-[#1a1a1f]">{r.total_days}</td>
                      <td className="px-4 py-3.5 text-[#854d0e]">{r.used_days}</td>
                      <td className="px-4 py-3.5">
                        <span className={`font-semibold ${(r.adjusted_days || 0) >= 0 ? "text-[#15803d]" : "text-[#dc2626]"}`}>
                          {(r.adjusted_days || 0) >= 0 ? "+" : ""}{r.adjusted_days}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-[var(--color-primary)]">{r.available}</td>
                      <td className="px-4 py-3.5 text-[#6b6b76]">{r.adjusted_by || "—"}</td>
                    </tr>
                  ))}
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

      <AdjustPanel
        open={panelOpen}
        employees={employees}
        onClose={() => setPanelOpen(false)}
        onSaved={() => { setPanelOpen(false); load(); }}
      />
    </div>
  );
}
