import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { inputClass } from "../../design-system/classes";

const PAGE_SIZES = [20, 50, 100];
const LEAVE_TYPES = [
  "All", "Casual Leave", "Compensatory Off", "Earned Leave", "Leave Without Pay",
  "Maternity Leave", "Paternity Leave", "Sabbatical Leave", "Sick Leave",
];
const PANEL_CLASS =
  "flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-l-xl bg-white shadow-2xl animate-[slideInRight_0.28s_ease-out]";

const STATUS_STYLE = {
  pending:  { bg: "#fef9c3", text: "#854d0e" },
  approved: { bg: "#dcfce7", text: "#15803d" },
  rejected: { bg: "#fde8e8", text: "#dc2626" },
};

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

function FilterPanel({ open, onClose, onApply }) {
  const [form, setForm] = useState({ from_date: "", to_date: "", leave_type: "All", status: "all" });

  useEffect(() => {
    if (open) setForm({ from_date: "", to_date: "", leave_type: "All", status: "all" });
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-end bg-black/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={PANEL_CLASS} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#ececf0] px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-[#1a1a1f]">Filter Leave Report</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-[#f5f5f7]"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <SoftField label="From Date">
              <input type="date" value={form.from_date} onChange={set("from_date")} className={inputClass} />
            </SoftField>
            <SoftField label="To Date">
              <input type="date" value={form.to_date} onChange={set("to_date")} className={inputClass} />
            </SoftField>
          </div>
          <SoftField label="Leave Type">
            <select value={form.leave_type} onChange={set("leave_type")} className={inputClass}>
              {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </SoftField>
          <SoftField label="Status">
            <select value={form.status} onChange={set("status")} className={inputClass}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </SoftField>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-[#ececf0] px-5 py-3.5">
          <button type="button" onClick={onClose} className="ui-btn-secondary w-full py-3 text-[14px]">Cancel</button>
          <button type="button" onClick={() => { onApply(form); onClose(); }}
            className="ui-btn-primary py-3 text-[14px]">Apply Filter</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function LeaveReport() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ from_date: "", to_date: "", leave_type: "All", status: "all" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/hr/leaves");
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch { setRecords([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = records;
    if (filters.status !== "all") list = list.filter((r) => (r.status || "").toLowerCase() === filters.status);
    if (filters.leave_type !== "All") list = list.filter((r) => r.leave_type === filters.leave_type);
    if (filters.from_date) list = list.filter((r) => r.start_date >= filters.from_date);
    if (filters.to_date) list = list.filter((r) => r.end_date <= filters.to_date);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => [r.employee_name, r.leave_type, r.reason].filter(Boolean).join(" ").toLowerCase().includes(q));
    }
    return list;
  }, [records, filters, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const exportCSV = () => {
    const headers = ["Employee", "Leave Type", "From", "To", "Days", "Status", "Reason"];
    const csvRows = [headers.join(","), ...filtered.map((r) =>
      [r.employee_name, r.leave_type, r.start_date, r.end_date, r.days, r.status, `"${(r.reason || "").replace(/"/g, '""')}"`].join(",")
    )];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leave_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = filters.status !== "all" || filters.leave_type !== "All" || filters.from_date || filters.to_date;

  const kpis = [
    { label: "Total Leaves", value: records.length, color: "var(--color-primary)" },
    { label: "Approved", value: records.filter((r) => r.status === "approved").length, color: "#15803d" },
    { label: "Pending", value: records.filter((r) => r.status === "pending").length, color: "#854d0e" },
    { label: "Total Days", value: records.filter((r) => r.status === "approved").reduce((s, r) => s + (r.days || 0), 0), color: "#1d4ed8" },
  ];

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-[var(--color-text)]">Leave Report</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">View and export leave reports for your organization.</p>
          </div>
          <div className="flex items-center gap-2">
          </div>
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
          {/* Active filter chips */}
          {hasFilters && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-[#6b6b76]">Active filters:</span>
              {filters.status !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                  Status: {filters.status}
                  <button onClick={() => setFilters((f) => ({ ...f, status: "all" }))} className="ml-1 hover:text-[#dc2626]">×</button>
                </span>
              )}
              {filters.leave_type !== "All" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                  {filters.leave_type}
                  <button onClick={() => setFilters((f) => ({ ...f, leave_type: "All" }))} className="ml-1 hover:text-[#dc2626]">×</button>
                </span>
              )}
              {(filters.from_date || filters.to_date) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                  {filters.from_date || "…"} → {filters.to_date || "…"}
                  <button onClick={() => setFilters((f) => ({ ...f, from_date: "", to_date: "" }))} className="ml-1 hover:text-[#dc2626]">×</button>
                </span>
              )}
              <button onClick={() => setFilters({ from_date: "", to_date: "", leave_type: "All", status: "all" })}
                className="text-[11px] text-[#dc2626] hover:underline">Clear all</button>
            </div>
          )}

          {/* Search */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search employee or leave type…"
                className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[#d0d0d8] focus:bg-white" />
            </div>
            <select
              value={filters.leave_type}
              onChange={(e) => { setFilters((f) => ({ ...f, leave_type: e.target.value })); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]"
            >
              {LEAVE_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
            <select
              value={filters.status}
              onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => { setFilters((f) => ({ ...f, from_date: e.target.value })); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]"
              aria-label="From date"
            />
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => { setFilters((f) => ({ ...f, to_date: e.target.value })); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]"
              aria-label="To date"
            />
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
                    {["SR No.", "Employee", "Leave Type", "From", "To", "Days", "Reason", "Status", "Applied On"].map((h) => (
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
                    const appliedOn = r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "—";
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
                        <td className="px-4 py-3.5 text-[#6b6b76] max-w-[140px] truncate">{r.reason || "—"}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                            style={{ background: sc.bg, color: sc.text }}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#6b6b76]">{appliedOn}</td>
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

    </div>
  );
}
