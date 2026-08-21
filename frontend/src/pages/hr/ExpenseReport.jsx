import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, FileSpreadsheet, Search, Receipt } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { api } from "../api";
import { exportToExcel } from "../../utils/exportUtils";
import { useToast } from "../../context/ToastContext";

const PAGE_SIZES = [10, 20, 50];
const CATEGORIES = ["Travel", "Food", "Accommodation", "Communication", "Office Supplies", "Other"];

const STATUS_STYLE = {
  pending:  { bg: "#fef9c3", text: "#854d0e" },
  approved: { bg: "#dcfce7", text: "#15803d" },
  rejected: { bg: "#fde8e8", text: "#dc2626" },
};

function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("T")[0].split("-");
  return (!y || !m || !d) ? iso : `${d}-${m}-${y}`;
}
function fmtINR(n) {
  const num = Number(n || 0);
  return num ? `₹${num.toLocaleString("en-IN")}` : "—";
}
function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function parseMeta(description) {
  try {
    const value = JSON.parse(description || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export default function ExpenseReport() {
  const { addToast } = useToast();
  const [records, setRecords]           = useState([]);
  const [employees, setEmployees]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [expenseRes, employeeRows] = await Promise.all([
        axiosInstance.get("/hr/expenses"),
        api.employees.list(),
      ]);
      setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
      setRecords(Array.isArray(expenseRes.data) ? expenseRes.data : []);
    } catch { setRecords([]); addToast("Failed to load expenses", "error"); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, categoryFilter, statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const employeeNames = new Map(employees.map((employee) => [String(employee.id), employee.full_name]));
    return records.filter((r) => {
      const meta = parseMeta(r.description);
      const employeeName = employeeNames.get(String(meta.employee_id || r.employee_id)) || meta.name || r.vendor || "";
      const status = String(meta.status || r.status || "pending").toLowerCase();
      const text = [employeeName, r.category, r.description].filter(Boolean).join(" ").toLowerCase();
      return (
        (!q || text.includes(q)) &&
        (!categoryFilter || r.category === categoryFilter) &&
        (statusFilter === "all" || status === statusFilter)
      );
    });
  }, [records, employees, search, categoryFilter, statusFilter]);

  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows       = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from       = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to         = Math.min(page * pageSize, total);

  const totalAmount = records.reduce((s, r) => s + Number(r.amount || 0), 0);
  const getStatus = (record) => String(parseMeta(record.description).status || record.status || "pending").toLowerCase();
  const getEmployeeName = (record) => {
    const meta = parseMeta(record.description);
    return employees.find((employee) => String(employee.id) === String(meta.employee_id || record.employee_id))?.full_name
      || meta.name
      || record.vendor
      || "—";
  };

  const kpis = [
    { label: "Total Expenses", value: records.length,                                                                  color: "#0f6d84" },
    { label: "Approved",       value: records.filter((r) => getStatus(r) === "approved").length,     color: "#15803d" },
    { label: "Pending",        value: records.filter((r) => getStatus(r) === "pending").length,      color: "#854d0e" },
    { label: "Total Amount",   value: fmtINR(totalAmount),                                                             color: "#7e22ce" },
  ];

  const onExport = () => {
    exportToExcel(
      filtered.map((r) => ({
        "Employee":    getEmployeeName(r),
        "Category":    r.category      || "",
        "Amount (₹)":  r.amount        || 0,
        "Date":        r.expense_date  || r.date || "",
        "Description": r.description  || "",
        "Status":      r.status        || "",
      })),
      [], "expense_report"
    );
    addToast("Exported to Excel", "success");
  };

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text)]">Expense Report</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">View and export employee expense records.</p>
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
                placeholder="Search by employee, category…"
                className="w-full rounded-lg border border-[#e8e8ee] bg-[#f8f8fb] py-2 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[var(--color-primary)] focus:bg-white transition-colors"
              />
            </div>
            {search && (
              <button onClick={() => setSearch("")} className="h-9 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] font-semibold text-[#6b6b76] hover:bg-[#f5f5f7] transition-colors">
                ✕ Clear
              </button>
            )}
            {/* Category filter */}
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]">
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            {/* Status filter */}
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-[#e8e8ee] bg-white px-3 text-[13px] text-[#1a1a1f] outline-none focus:border-[var(--color-primary)]">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            {/* Export */}
            <button type="button" onClick={onExport}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e2e2e8] bg-white px-3 text-[12px] font-semibold text-[#4a4a55] hover:bg-[#f5f5f7] transition-colors">
              <FileSpreadsheet className="h-4 w-4 text-[#16a34a]" /> Export
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                  {["SR No.", "Employee", "Category", "Amount", "Date", "Description", "Status"].map((h) => (
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
                        <Receipt className="h-10 w-10 opacity-30" />
                        <p className="text-[13px]">No expense records found.</p>
                      </div>
                    </td>
                  </tr>
                ) : rows.map((r, i) => {
                  const status = getStatus(r);
                  const employeeName = getEmployeeName(r);
                  const sc = STATUS_STYLE[status] || { bg: "#f3f4f6", text: "#6b7280" };
                  return (
                    <tr key={r.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                      <td className="px-4 py-3.5 text-[#6b6b76]">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[11px] font-bold text-[var(--color-primary)]">
                            {getInitials(employeeName)}
                          </div>
                          <span className="font-semibold text-[#1a1a1f]">{employeeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{r.category || "—"}</td>
                      <td className="px-4 py-3.5 font-semibold text-[#1a1a1f]">{fmtINR(r.amount)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[#4a4a55]">{fmtDate(r.expense_date || r.date)}</td>
                      <td className="max-w-[180px] truncate px-4 py-3.5 text-[#6b6b76]">{r.description || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                          style={{ background: sc.bg, color: sc.text }}>{status}</span>
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
