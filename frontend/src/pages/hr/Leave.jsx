import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { inputClass } from "../../design-system/classes";

const PAGE_SIZES = [20, 50, 100];
const LEAVE_TYPES = [
  "Casual Leave", "Compensatory Off", "Earned Leave", "Leave Without Pay",
  "Maternity Leave", "Paternity Leave", "Sabbatical Leave", "Sick Leave",
];
const LEAVE_ICONS = {
  "Casual Leave": "🍃", "Compensatory Off": "🧿", "Earned Leave": "🧾",
  "Maternity Leave": "🤱", "Paternity Leave": "🤝", "Sabbatical Leave": "🧳",
  "Sick Leave": "🩺", "Leave Without Pay": "⭕",
};
const STATUS_STYLE = {
  pending:  { bg: "#fef9c3", text: "#854d0e" },
  approved: { bg: "#dcfce7", text: "#15803d" },
  rejected: { bg: "#fde8e8", text: "#dc2626" },
};
const PANEL_CLASS =
  "flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-l-xl bg-white shadow-2xl animate-[slideInRight_0.28s_ease-out]";

const EMPTY_FORM = { employee_id: "", leave_type: "", start_date: "", end_date: "", reason: "" };

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

function LeaveFormPanel({ open, record, employees, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (record) {
      setForm({
        employee_id: String(record.employee_id || ""),
        leave_type: record.leave_type || "",
        start_date: record.start_date || "",
        end_date: record.end_date || "",
        reason: record.reason || "",
      });
    } else {
      setForm({ ...EMPTY_FORM, employee_id: String(employees[0]?.id || "") });
    }
    setError("");
  }, [open, record, employees]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const days = calcDays(form.start_date, form.end_date);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.leave_type || !form.start_date || !form.end_date) {
      setError("Please fill all required fields."); return;
    }
    if (form.end_date < form.start_date) {
      setError("End date cannot be before start date."); return;
    }
    setSaving(true); setError("");
    try {
      const payload = {
        employee_id: parseInt(form.employee_id),
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || null,
        status: "pending",
      };
      if (record?.id) {
        await axiosInstance.put(`/hr/leaves/${record.id}`, payload);
      } else {
        await axiosInstance.post("/hr/leaves", payload);
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-end bg-black/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <form onSubmit={handleSubmit} className={PANEL_CLASS} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#ececf0] px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">
            {record ? "Edit Leave Request" : "New Leave Request"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#1a1a1f] hover:bg-[#f5f5f7]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-3">
          <SoftField label="Employee" required>
            <select value={form.employee_id} onChange={set("employee_id")} className={inputClass}>
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name || e.name}</option>
              ))}
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
            <textarea
              value={form.reason} onChange={set("reason")}
              placeholder="Enter reason for leave"
              rows={3} className={inputClass + " resize-none"}
            />
          </SoftField>

          <SoftField label="Attachment">
            <button type="button" className="ui-btn-outline ui-btn--sm">＋ Upload Document</button>
          </SoftField>

          {error && (
            <div className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">{error}</div>
          )}
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

function DeleteModal({ open, busy, onClose, onConfirm }) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-white px-8 py-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 grid h-[72px] w-[72px] place-items-center rounded-full bg-[#fee2e2]">
          <Trash2 className="h-9 w-9 text-[#ef4444]" strokeWidth={1.75} />
        </div>
        <h3 className="text-[22px] font-bold text-[#1a1a1f]">Delete Leave Request?</h3>
        <p className="mt-2 text-[14px] text-[#5a5a66]">This action cannot be undone.</p>
        <div className="mt-7 grid grid-cols-2 gap-4">
          <button type="button" disabled={busy} onClick={onClose} className="ui-btn-secondary w-full py-3 text-[14px]">No</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="ui-btn-danger w-full py-3 text-[14px]">
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Leave() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

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
    if (tab !== "all") list = list.filter((r) => (r.status || "").toLowerCase() === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        [r.employee_name, r.leave_type, r.reason, r.status].filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, tab, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const balanceByType = useMemo(() => {
    const map = {};
    LEAVE_TYPES.forEach((t) => { map[t] = { used: 0, balance: 0 }; });
    records.filter((r) => r.status === "approved").forEach((r) => {
      if (map[r.leave_type]) map[r.leave_type].used += r.days || 0;
    });
    return map;
  }, [records]);

  const quickApprove = async (id, status) => {
    try {
      await axiosInstance.patch(`/hr/leaves/${id}/approve`, { status });
      load();
    } catch { /* ignore */ }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await axiosInstance.delete(`/hr/leaves/${deleting.id}`);
      setDeleting(null); load();
    } catch { /* ignore */ }
    finally { setDeletingBusy(false); }
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

        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-[var(--color-text)]">Leave Tracker</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Manage and track employee leave requests.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Leave Request
          </button>
        </div>

        {/* KPI strip */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3">
              <p className="text-[11px] font-medium text-[#6b6b76]">{k.label}</p>
              <p className="mt-0.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Balance cards */}
        <div className="mb-4 flex gap-2.5 overflow-x-auto pb-1">
          {LEAVE_TYPES.map((t) => (
            <div key={t} className="min-w-[130px] shrink-0 rounded-xl border border-[#e4e4ea] bg-white px-3 py-3 text-center">
              <div className="text-[20px] mb-1">{LEAVE_ICONS[t]}</div>
              <div className="text-[11px] font-semibold text-[#1a1a1f] leading-tight mb-2">{t}</div>
              <div className="flex justify-center gap-3">
                <div>
                  <div className="text-[10px] text-[#6b6b76] font-medium">Balance</div>
                  <div className="text-[15px] font-bold text-[var(--color-primary)]">{balanceByType[t]?.balance ?? 0}</div>
                </div>
                <div className="w-px bg-[#e4e4ea]" />
                <div>
                  <div className="text-[10px] text-[#6b6b76] font-medium">Used</div>
                  <div className="text-[15px] font-bold text-[#6b6b76]">{Math.round(balanceByType[t]?.used ?? 0)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="ui-card p-4 sm:p-5">
          {/* Tabs */}
          <div className="mb-4 flex gap-1 border-b border-[#ececf0]">
            {[
              { id: "all", label: "All Requests" },
              { id: "pending", label: "Pending" },
              { id: "approved", label: "Approved" },
              { id: "rejected", label: "Rejected" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setPage(1); }}
                className={`border-b-2 px-4 py-2.5 text-[13px] font-semibold transition ${
                  tab === t.id
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-[#6b6b76] hover:text-[#1a1a1f]"
                }`}
                style={{ marginBottom: -1 }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search leave requests…"
                className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[#d0d0d8] focus:bg-white"
              />
            </div>
            {search && (
              <button onClick={() => setSearch("")} className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] text-[#6b6b76] hover:bg-[#f5f5f7]">
                ✕ Clear
              </button>
            )}
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
                    <tr><td colSpan={9} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No leave requests found</td></tr>
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
                        <td className="px-4 py-3.5 text-[#4a4a55] whitespace-nowrap">{r.start_date || "—"}</td>
                        <td className="px-4 py-3.5 text-[#4a4a55] whitespace-nowrap">{r.end_date || "—"}</td>
                        <td className="px-4 py-3.5 font-semibold text-[#1a1a1f]">{r.days ?? "—"}</td>
                        <td className="px-4 py-3.5 text-[#6b6b76] max-w-[160px] truncate">{r.reason || "—"}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                            style={{ background: sc.bg, color: sc.text }}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {r.status === "pending" && (
                              <>
                                <button onClick={() => quickApprove(r.id, "approved")}
                                  className="rounded-lg bg-[#dcfce7] px-2.5 py-1 text-[11px] font-semibold text-[#15803d] hover:bg-[#bbf7d0]">
                                  ✓ Approve
                                </button>
                                <button onClick={() => quickApprove(r.id, "rejected")}
                                  className="rounded-lg bg-[#fde8e8] px-2.5 py-1 text-[11px] font-semibold text-[#dc2626] hover:bg-[#fecaca]">
                                  ✕ Reject
                                </button>
                              </>
                            )}
                            <button onClick={() => { setEditing(r); setFormOpen(true); }}
                              className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[#e4e6fc]">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeleting(r)}
                              className="grid h-7 w-7 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada]">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
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

      <LeaveFormPanel
        open={formOpen}
        record={editing}
        employees={employees}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={() => { setFormOpen(false); setEditing(null); load(); }}
      />
      <DeleteModal
        open={Boolean(deleting)}
        busy={deletingBusy}
        onClose={() => !deletingBusy && setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
