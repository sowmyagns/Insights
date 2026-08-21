import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";

const PAGE_SIZES = [20, 50, 100];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function ManageMonthlyShifts() {
  const today = new Date();
  const [month, setMonth] = useState(today.toISOString().slice(0, 7));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axiosInstance.get("/hr/shifts/assignments", { skipGlobalError: true }),
      axiosInstance.get("/hr/employees", { skipGlobalError: true }),
    ])
      .then(([aRes, eRes]) => {
        setAssignments(Array.isArray(aRes.data) ? aRes.data : []);
        setEmployees(Array.isArray(eRes.data) ? eRes.data : []);
      })
      .catch(() => { setAssignments([]); setEmployees([]); })
      .finally(() => setLoading(false));
  }, [month]);

  const navMonth = (d) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(y, m - 1 + d, 1).toISOString().slice(0, 7));
  };

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const empMap = Object.fromEntries(employees.map((e) => [e.id, e.full_name || e.name || `Employee ${e.id}`]));

  const totalPages = Math.max(1, Math.ceil(assignments.length / pageSize));
  const rows = assignments.slice((page - 1) * pageSize, page * pageSize);
  const from = assignments.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, assignments.length);

  return (
    <div className="min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text)]">Manage Monthly Shifts</h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">View and manage employee shift assignments by month.</p>
          </div>
          <div className="flex items-center gap-2">
            
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: "Total Assignments", value: assignments.length, color: "#0e7490" },
            { label: "Employees Assigned", value: new Set(assignments.map((a) => a.employee_id)).size, color: "#1d4ed8" },
            { label: "Active Shifts", value: new Set(assignments.map((a) => a.shift_id)).size, color: "#854d0e" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b76]">{k.label}</p>
              <p className="mt-1.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#e4e4ea] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="border-collapse text-left text-[13px]" style={{ width: "100%", minWidth: Math.max(900, 200 + daysInMonth * 36) }}>
              <thead>
                <tr className="border-b border-[#e8e8ee] bg-[#f8f8fb]">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap sticky left-0 bg-[#f8f8fb] z-10" style={{ minWidth: 48 }}>SR No.</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap sticky bg-[#f8f8fb] z-10" style={{ left: 48, minWidth: 160 }}>Employee</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap">Branch</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#6b6b76] whitespace-nowrap">Department</th>
                  {days.map((d) => {
                    const dow = new Date(y, m - 1, d).getDay();
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <th key={d} className="py-3 text-center whitespace-nowrap" style={{ minWidth: 36, padding: "8px 4px" }}>
                        <div className={`text-[11px] font-bold ${isWeekend ? "text-[#dc2626]" : "text-[#6b6b76]"}`}>{d}</div>
                        <div className="text-[9px] font-medium text-[#9a9aa5]">{["Su","Mo","Tu","We","Th","Fr","Sa"][dow]}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={days.length + 4} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={days.length + 4} className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No shift assignments found.</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={r.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                    <td className="px-4 py-3 text-[#9a9aa5] sticky left-0 bg-white">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-[#1a1a1f] sticky bg-white" style={{ left: 48 }}>{empMap[r.employee_id] || `Employee ${r.employee_id}`}</td>
                    <td className="px-4 py-3 text-[#4a4a55]">{r.branch || "—"}</td>
                    <td className="px-4 py-3 text-[#4a4a55]">{r.department || "—"}</td>
                    {days.map((d) => {
                      const day = `${month}-${String(d).padStart(2, "0")}`;
                      const active = r.shift_from && r.shift_to && day >= r.shift_from && day <= r.shift_to;
                      return (
                        <td key={d} className="text-center" style={{ padding: "8px 4px" }}>
                          {active ? (
                            <div className="mx-auto h-5 w-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-white" />
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#d1d5db]">·</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0f4] px-5 py-3.5 text-[12px] text-[#6b6b76]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-lg border border-[#e2e2e8] bg-white px-2 py-1 outline-none">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-[#9a9aa5]">{assignments.length === 0 ? "0–0 of 0" : `${from}–${to} of ${assignments.length}`}</span>
            </div>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors">‹</button>
              <button className="grid h-8 min-w-[32px] place-items-center rounded-lg border px-2 text-[13px] font-semibold text-white" style={{ background: "var(--color-primary)", borderColor: "var(--color-primary)" }}>{page}</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e2e8] bg-white disabled:opacity-40 hover:bg-[#f5f5f7] transition-colors">›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
