import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, FileSpreadsheet, Search, Users } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { exportToExcel } from "../../utils/exportUtils";
import { useToast } from "../../context/ToastContext";

const PAGE_SIZES = [10, 20, 50];

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const DEPT_COLORS = {};
const deptColor = (dept) => {
  if (!dept) return { bg: "#f3f4f6", text: "#6b7280" };
  if (!DEPT_COLORS[dept]) {
    const palette = [
      { bg: "#dbeafe", text: "#1d4ed8" }, { bg: "#dcfce7", text: "#15803d" },
      { bg: "#f3e8ff", text: "#7e22ce" }, { bg: "#fef9c3", text: "#854d0e" },
      { bg: "#e0f2f7", text: "#0f6d84" }, { bg: "#fde8e8", text: "#dc2626" },
    ];
    DEPT_COLORS[dept] = palette[Object.keys(DEPT_COLORS).length % palette.length];
  }
  return DEPT_COLORS[dept];
};

export default function EmployeeReport() {
  const { addToast } = useToast();
  const [records, setRecords]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [deptFilter, setDeptFilter]       = useState("");
  const [typeFilter, setTypeFilter]       = useState("");
  const [statusFilter, setStatusFilter]   = useState("");
  const [page, setPage]                   = useState(1);
  const [pageSize, setPageSize]           = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/hr/employees");
      const data = Array.isArray(res.data) ? res.data : [];
      setRecords(data.map((e) => ({ ...e, name: e.full_name || e.name || "" })));
    } catch { setRecords([]); addToast("Failed to load employees", "error"); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, deptFilter, typeFilter, statusFilter]);

  const departments = useMemo(() => [...new Set(records.map((r) => r.department).filter(Boolean))].sort(), [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const text = [r.name, r.email, r.phone, r.department, r.designation, r.employee_code]
        .filter(Boolean).join(" ").toLowerCase();
      return (
        (!q || text.includes(q)) &&
        (!deptFilter   || r.department       === deptFilter) &&
        (!typeFilter   || r.employment_type  === typeFilter) &&
        (!statusFilter || (r.status || "Active") === statusFilter)
      );
    });
  }, [records, search, deptFilter, typeFilter, statusFilter]);

  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows       = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from       = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to         = Math.min(page * pageSize, total);

  const kpis = [
    { label: "Total Employees", value: records.length,                                                      color: "#0f6d84" },
    { label: "Active",          value: records.filter((r) => (r.status || "Active") === "Active").length,   color: "#15803d" },
    { label: "Departments",     value: departments.length,                                                   color: "#7e22ce" },
    { label: "Filtered",        value: filtered.length,                                                     color: "#1d4ed8" },
  ];

  const onExport = () => {
    exportToExcel(
      filtered.map((r) => ({
        "Employee Code":    r.employee_code    || "",
        "Name":             r.name             || "",
        "Email":            r.email            || "",
        "Phone":            r.phone            || "",
        "Department":       r.department       || "",
        "Designation":      r.designation      || "",
        "Employment Type":  r.employment_type  || "",
        "Status":           r.status           || "Active",
        "Join Date":        r.date_of_joining  || "",
      })),
      [], "employee_report"
    );
    addToast("Exported to Excel", "success");
  };

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text)]">Employee Report</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">View and export complete employee master data.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b76]">{k.label}</p>
              <p className="mt-1.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Main card */}
        <div className="rounded-xl border border-[#e4e4ea] bg-white shadow-sm">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#f0f0f4] px-5 py-4">
            {/* Search */}
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, email, department…"
                className="w-full rounded-lg border border-[#e8e8ee] bg-[#f8f8fb] py-2 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[var(--color-primary)] focus:bg-white transition-colors"
              />
            </div>
            {search && (
              <button onClick={() => setSearch("")} className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] font-semibold text-[#6b6b76] hover:bg-[#f5f5f7] transition-colors">
                ✕ Clear
              </button>
            )}
            {/* Department filter */}
            <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]">
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d}>{d}</option>)}
            </select>
            
            {/* Status filter */}
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]">
              <option value="">All Statuses</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            {/* Export */}
            <button type="button" onClick={onExport}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] font-semibold text-[#4a4a55] hover:bg-[#f5f5f7] transition-colors">
              <FileSpreadsheet className="h-4 w-4 text-[#16a34a]" /> Export
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                  {["SR No.", "Employee", "Department", "Designation", "Employment Type", "Phone", "Join Date", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-[#8a8a96]">
                        <Users className="h-10 w-10 opacity-30" />
                        <p className="text-[13px]">No employees found.</p>
                      </div>
                    </td>
                  </tr>
                ) : rows.map((r, i) => {
                  const dc = deptColor(r.department);
                  const isActive = (r.status || "Active") === "Active";
                  return (
                    <tr key={r.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                      <td className="px-4 py-3.5 text-[#6b6b76]">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[12px] font-bold text-[var(--color-primary)]">
                            {getInitials(r.name)}
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-[#1a1a1f]">{r.name || "—"}</div>
                            <div className="text-[11px] text-[#6b6b76]">{r.email || r.employee_code || ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {r.department
                          ? <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: dc.bg, color: dc.text }}>{r.department}</span>
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{r.designation || "—"}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{r.employment_type || "—"}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{r.phone || "—"}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[#4a4a55]">{r.date_of_joining || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isActive ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#f3f4f6] text-[#6b7280]"}`}>
                          {r.status || "Active"}
                        </span>
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
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded border border-[#e2e2e8] bg-white px-2 py-1 outline-none">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>{total === 0 ? "0–0 of 0" : `${from}–${to} of ${total}`}</span>
            </div>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="grid h-8 min-w-[32px] place-items-center rounded-lg border px-2 text-[13px] font-semibold text-white"
                style={{ background: "var(--color-primary)", borderColor: "var(--color-primary)" }}>{page}</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
