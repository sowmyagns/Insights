import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Download, Play, Search } from "lucide-react";

import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { api } from "../api";
import "./Payroll.css";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const periodKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;
const periodEnd = (year, month) => new Date(year, month, 0).toISOString().slice(0, 10);

function statusClass(status) {
  if (["paid", "approved", "calculated"].includes(status)) return "bg-[#dcfce7] text-[#15803d]";
  if (status === "rejected") return "bg-[#fde8e8] text-[#dc2626]";
  return "bg-[#fef9c3] text-[#854d0e]";
}

export default function Payroll() {
  const { addToast } = useToast();
  const current = new Date();
  const [year, setYear] = useState(current.getFullYear());
  const [month, setMonth] = useState(current.getMonth() + 1);
  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [employeeRows, payrollRows] = await Promise.all([api.employees.list(), api.payroll.list({ month: periodKey(year, month) })]);
      setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
      setRows(Array.isArray(payrollRows) ? payrollRows : []);
    } catch (requestError) {
      setEmployees([]);
      setRows([]);
      setError(requestError.response?.data?.detail || "Could not load payroll records.");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const employeeMap = useMemo(() => Object.fromEntries(employees.map((employee) => [employee.id, employee])), [employees]);
  const period = periodKey(year, month);
  const filtered = useMemo(() => rows.filter((row) => {
    if (String(row.period_start || "").slice(0, 7) !== period) return false;
    const employee = employeeMap[row.employee_id] || {};
    const name = employee.full_name || employee.name || `Employee #${row.employee_id}`;
    return !query.trim() || `${name} ${employee.department || ""} ${row.status || ""}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [rows, employeeMap, period, query]);

  const totals = filtered.reduce((result, row) => ({
    gross: result.gross + Number(row.gross_pay || 0),
    deductions: result.deductions + Number(row.deductions || 0),
    net: result.net + Number(row.net_pay || 0),
  }), { gross: 0, deductions: 0, net: 0 });

  const runPayroll = async () => {
    setRunning(true);
    try {
      const result = await api.payroll.run({ year, month });
      addToast(`Payroll processed for ${result.processed || 0} employees.`, "success");
      await load();
    } catch (requestError) {
      addToast(requestError.response?.data?.detail || "Payroll calculation failed.", "error");
    } finally {
      setRunning(false);
    }
  };

  const approvePayroll = async (row) => {
    try {
      await api.payroll.updateStatus(row.id, "approved");
      addToast("Payroll record approved.", "success");
      await load();
    } catch (requestError) {
      addToast(requestError.response?.data?.detail || "Could not approve payroll record.", "error");
    }
  };

  return (
    <div className="payroll-page min-h-full" style={{ background: "var(--color-bg)" }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1f]">Payroll</h1>
            <p className="mt-1 text-[13px] text-[#6b6b76]">Calculate, review, approve, and export employee payroll.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setYear((value) => value - 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e2e2e8] bg-white"><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-[3rem] text-center text-[14px] font-semibold">{year}</span>
            <button type="button" onClick={() => setYear((value) => value + 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e2e2e8] bg-white"><ChevronRight className="h-4 w-4" /></button>
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="ui-select h-9 min-w-[125px] text-[13px]">
              {MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
            </select>
            <button type="button" onClick={() => api.reports.payrollExcel(period)} className="ui-btn-secondary inline-flex items-center gap-2"><Download className="h-4 w-4" /> Export</button>
            <button type="button" onClick={runPayroll} disabled={running} className="ui-btn-primary inline-flex items-center gap-2 disabled:opacity-50"><Play className="h-4 w-4" /> {running ? "Calculating..." : "Run Payroll"}</button>
          </div>
        </header>

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[{ label: "Employees", value: filtered.length, color: "#0f6d84" }, { label: "Gross Pay", value: money(totals.gross), color: "#15803d" }, { label: "Deductions", value: money(totals.deductions), color: "#dc2626" }, { label: "Net Pay", value: money(totals.net), color: "#1d4ed8" }].map((item) => (
            <div key={item.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3">
              <p className="text-[11px] font-medium text-[#6b6b76]">{item.label}</p>
              <p className="mt-1 text-[22px] font-bold tabular-nums" style={{ color: item.color }}>{item.value}</p>
              <p className="mt-0.5 text-[11px] text-[#9a9aa5]">{MONTHS[month - 1]} {year}</p>
            </div>
          ))}
        </div>

        <section className="ui-card p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[14rem] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employee or department" className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] py-2.5 pl-10 pr-4 text-[13px] outline-none focus:bg-white" />
            </div>
            <div className="inline-flex items-center gap-2 text-[12px] text-[#6b6b76]"><CalendarDays className="h-4 w-4" /> {MONTHS[month - 1]} {year}</div>
          </div>
          {error ? <div className="mb-4 flex justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"><span>{error}</span><button type="button" onClick={load} className="font-semibold underline">Retry</button></div> : null}
          <div className="overflow-hidden rounded-lg border border-[#ececf0]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
                <thead><tr className="border-b border-[#e8e8ee] bg-[#f5f5f5] text-[12px] font-medium text-[#6b6b76]"><th className="px-4 py-3">SR No.</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Base Salary</th><th className="px-4 py-3">Gross Pay</th><th className="px-4 py-3">Deductions</th><th className="px-4 py-3">Net Pay</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={9}><Loader label="Loading payroll..." /></td></tr> : filtered.map((row, index) => {
                    const employee = employeeMap[row.employee_id] || {};
                    const name = employee.full_name || employee.name || `Employee #${row.employee_id}`;
                    return <tr key={row.id} className="border-b border-[#f0f0f4] last:border-b-0 hover:bg-[#fafafa]"><td className="px-4 py-3.5 text-[#6b6b76]">{index + 1}</td><td className="px-4 py-3.5 font-semibold">{name}</td><td className="px-4 py-3.5 text-[#4a4a55]">{employee.department || employee.dept || "-"}</td><td className="px-4 py-3.5">{money(row.base_salary)}</td><td className="px-4 py-3.5 font-semibold text-[#15803d]">{money(row.gross_pay)}</td><td className="px-4 py-3.5 font-semibold text-[#dc2626]">{money(row.deductions)}</td><td className="px-4 py-3.5 font-bold text-[#0f6d84]">{money(row.net_pay)}</td><td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusClass(row.status)}`}>{row.status || "draft"}</span></td><td className="px-4 py-3.5 text-right">{row.status !== "approved" && row.status !== "paid" ? <button type="button" onClick={() => approvePayroll(row)} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold text-[#0f6d84] hover:bg-[#e6f4f6]" title="Approve payroll"><Check className="h-3.5 w-3.5" />Approve</button> : <span className="text-[12px] text-[#8a8a95]">Reviewed</span>}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
            {!loading && !filtered.length ? <div className="px-4 py-16 text-center text-[13px] text-[#8a8a95]">No payroll records for {MONTHS[month - 1]} {year}. Run payroll to calculate this period.</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
