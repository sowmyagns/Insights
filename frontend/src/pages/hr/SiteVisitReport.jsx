import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Download, Search, MapPin } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { exportToExcel } from "../../utils/exportUtils";
import { useToast } from "../../context/ToastContext";

const PAGE_SIZES = [10, 20, 50];

const VISIT_TYPE_COLORS = {
  "Client Visit":    { bg: "#dbeafe", text: "#1d4ed8" },
  "Site Survey":      { bg: "#f3e8ff", text: "#7e22ce" },
  "Delivery":        { bg: "#dcfce7", text: "#15803d" },
  "Other":           { bg: "#f3f4f6", text: "#6b7280" },
};

function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("T")[0].split("-");
  return (!y || !m || !d) ? iso : `${d}-${m}-${y}`;
}
function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function SiteVisitReport() {
  const { addToast } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ from_date: "", to_date: "", visit_type: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/hr/site-visits");
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch { setRecords([]); addToast("Failed to load site visits", "error"); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const text = [r.employee_name, r.visit_type, r.client_name, r.purpose, r.notes]
        .filter(Boolean).join(" ").toLowerCase();
      const dateStr = r.visit_date || "";
      return (
        (!q || text.includes(q)) &&
        (!filters.visit_type || r.visit_type === filters.visit_type) &&
        (!filters.from_date || dateStr >= filters.from_date) &&
        (!filters.to_date || dateStr <= filters.to_date)
      );
    });
  }, [records, search, filters]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasFilters = Object.values(filters).some(Boolean);

  // Count per visit type
  const visitTypeCounts = Object.keys(VISIT_TYPE_COLORS).reduce((acc, t) => {
    acc[t] = records.filter((r) => r.visit_type === t).length;
    return acc;
  }, {});

  const kpis = [
    { label: "Total Visits", value: records.length, color: "#0f6d84" },
    { label: "Client Visit", value: visitTypeCounts["Client Visit"] || 0, color: "#1d4ed8" },
    { label: "Site Survey", value: visitTypeCounts["Site Survey"] || 0, color: "#7e22ce" },
    { label: "This Month", value: records.filter((r) => (r.visit_date || "").startsWith(new Date().toISOString().slice(0, 7))).length, color: "#15803d" },
  ];

  const onExport = () => {
    exportToExcel(
      filtered.map((r) => ({
        "Employee": r.employee_name || "",
        "Visit Date": r.visit_date || "",
        "Visit Type": r.visit_type || "",
        "Client Name": r.client_name || "",
        "Purpose": r.purpose || "",
        "Notes": r.notes || "",
      })),
      [], "site_visit_report"
    );
    addToast("Exported to Excel", "success");
  };

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text)]">Site Visit Report</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">View and export employee site visit records.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
            >
              <Download className="h-4 w-4" /> Export Excel
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b76]">{k.label}</p>
              <p className="mt-1.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-xl border border-[#e4e4ea] bg-white shadow-sm">

          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2 border-b border-[#f0f0f4] px-5 pt-4">
              <span className="text-[12px] text-[#6b6b76]">Active filters:</span>
              {filters.visit_type && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                  {filters.visit_type}
                  <button onClick={() => setFilters((f) => ({ ...f, visit_type: "" }))} className="ml-1 hover:text-[#dc2626]">x</button>
                </span>
              )}
              {(filters.from_date || filters.to_date) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                  {filters.from_date || "..."} -&gt; {filters.to_date || "..."}
                  <button onClick={() => setFilters((f) => ({ ...f, from_date: "", to_date: "" }))} className="ml-1 hover:text-[#dc2626]">x</button>
                </span>
              )}
              <button onClick={() => setFilters({ from_date: "", to_date: "", visit_type: "" })}
                className="text-[11px] text-[#dc2626] hover:underline">Clear all</button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#f0f0f4] px-5 py-4">
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by employee, client, purpose…"
                className="w-full rounded-lg border border-[#e8e8ee] bg-[#f8f8fb] py-2 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[var(--color-primary)] focus:bg-white transition-colors"
              />
            </div>
            <select
              value={filters.visit_type}
              onChange={(e) => { setFilters((f) => ({ ...f, visit_type: e.target.value })); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">All Types</option>
              {Object.keys(VISIT_TYPE_COLORS).map((type) => <option key={type}>{type}</option>)}
            </select>
            <input type="date" value={filters.from_date}
              onChange={(e) => { setFilters((f) => ({ ...f, from_date: e.target.value })); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]"
              aria-label="From date" />
            <input type="date" value={filters.to_date}
              onChange={(e) => { setFilters((f) => ({ ...f, to_date: e.target.value })); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]"
              aria-label="To date" />
            {search && (
              <button onClick={() => setSearch("")} className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] font-semibold text-[#6b6b76] hover:bg-[#f5f5f7]">
                ✕ Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                  {["SR No.", "Employee", "Visit Date", "Visit Type", "Client Name", "Purpose", "Notes"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-[#8a8a96]">
                        <MapPin className="h-10 w-10 opacity-30" />
                        <p className="text-[13px]">No site visit records found.</p>
                      </div>
                    </td>
                  </tr>
                ) : rows.map((r, i) => {
                  const vc = VISIT_TYPE_COLORS[r.visit_type] || { bg: "#f3f4f6", text: "#6b7280" };
                  return (
                    <tr key={r.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                      <td className="px-4 py-3.5 text-[#6b6b76]">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[11px] font-bold text-[var(--color-primary)]">
                            {getInitials(r.employee_name)}
                          </div>
                          <span className="font-semibold text-[#1a1a1f]">{r.employee_name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[#4a4a55]">{fmtDate(r.visit_date)}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{ background: vc.bg, color: vc.text }}>{r.visit_type || "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{r.client_name || "—"}</td>
                      <td className="max-w-[180px] truncate px-4 py-3.5 text-[#4a4a55]">{r.purpose || "—"}</td>
                      <td className="max-w-[180px] truncate px-4 py-3.5 text-[#6b6b76]">{r.notes || "—"}</td>
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
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded border border-[#e2e2e8] bg-white px-2 py-1 outline-none">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>{total === 0 ? "0–0 of 0" : `${from}–${to} of ${total}`}</span>
            </div>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7]">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="grid h-8 min-w-[32px] place-items-center rounded-lg border px-2 text-[13px] font-semibold text-white"
                style={{ background: "var(--color-primary)", borderColor: "var(--color-primary)" }}>{page}</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7]">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
