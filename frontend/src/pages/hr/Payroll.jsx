import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock, Download, HeartPulse, IndianRupee, Plus, Receipt, Shield, TrendingUp, Wallet, X, Save } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import PayrollDetailModal from "../../components/hr/PayrollDetailModal";
import { useToast } from "../../context/ToastContext";
import { getPayrollEnriched, getPayrollSummary, createPayroll, getEmployeesEnriched, updatePayrollStatus } from "../../api/hrApi";
import useTenantId from "../../hooks/useTenantId";
import usePageRefresh from "../../hooks/usePageRefresh";
import { DEMO_PAY_SUMMARY, formatInr, statusColor } from "../../data/hrMasterData";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all";

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans">{label}</p>
          <p className="mt-1 text-lg sm:text-xl font-black tracking-tight text-slate-900 tabular-nums truncate" title={String(value)}>
            {value}
          </p>
        </div>
        {Icon && (
          <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105 ${color}`}>
            <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-white shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Payroll() {
  const tenantId = useTenantId();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(DEMO_PAY_SUMMARY);
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    tenant_id: tenantId,
    employee_id: "",
    period_start: new Date().toISOString().slice(0, 7) + "-01",
    period_end: new Date().toISOString().slice(0, 10),
    regular_hours: "160",
    overtime_hours: "0",
    regular_pay: "0",
    overtime_pay: "0",
    gross_pay: "0",
    pf: "0",
    esi: "0",
    tax: "0",
    deductions: "0",
    net_pay: "0",
    status: "draft",
  });

  const load = useCallback(async (isManual = false) => {
    setLoading(true);
    try {
      const [sumRes, listRes, empRes] = await Promise.allSettled([
        getPayrollSummary(),
        getPayrollEnriched(),
        getEmployeesEnriched()
      ]);

      if (sumRes.status === "fulfilled" && sumRes.value?.data) {
        setSummary({ ...DEMO_PAY_SUMMARY, ...sumRes.value.data });
      }
      if (listRes.status === "fulfilled" && Array.isArray(listRes.value?.data)) {
        setRows(listRes.value.data);
      }
      if (empRes.status === "fulfilled" && Array.isArray(empRes.value?.data)) {
        setEmployees([...empRes.value.data]);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    await load();
  };

  usePageRefresh(handleRefresh);

  useEffect(() => { load(); }, [load]);

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto compute pay and deduction breakdown values
      const regPay = Number(field === "regular_pay" ? value : prev.regular_pay) || 0;
      const otPay = Number(field === "overtime_pay" ? value : prev.overtime_pay) || 0;
      
      const pf = Number(field === "pf" ? value : prev.pf) || 0;
      const esi = Number(field === "esi" ? value : prev.esi) || 0;
      const tax = Number(field === "tax" ? value : prev.tax) || 0;
      
      const gross = regPay + otPay;
      const totalDeductions = pf + esi + tax;
      const net = Math.max(0, gross - totalDeductions);

      updated.gross_pay = String(gross);
      updated.deductions = String(totalDeductions);
      updated.net_pay = String(net);
      
      return updated;
    });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.period_start || !form.period_end) {
      setError("Please fill all required fields.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createPayroll({
        ...form,
        employee_id: Number(form.employee_id),
        regular_hours: Number(form.regular_hours) || 0,
        overtime_hours: Number(form.overtime_hours) || 0,
        regular_pay: Number(form.regular_pay) || 0,
        basic: Number(form.regular_pay) || 0,
        overtime_pay: Number(form.overtime_pay) || 0,
        gross_pay: Number(form.gross_pay) || 0,
        pf: Number(form.pf) || 0,
        esi: Number(form.esi) || 0,
        tax: Number(form.tax) || 0,
        deductions: Number(form.deductions) || 0,
        net_pay: Number(form.net_pay) || 0,
      });
      addToast("Payroll record created successfully", "success");
      setShowCreateModal(false);
      setForm({
        tenant_id: tenantId,
        employee_id: "",
        period_start: new Date().toISOString().slice(0, 7) + "-01",
        period_end: new Date().toISOString().slice(0, 10),
        regular_hours: "160",
        overtime_hours: "0",
        regular_pay: "0",
        overtime_pay: "0",
        gross_pay: "0",
        pf: "0",
        esi: "0",
        tax: "0",
        deductions: "0",
        net_pay: "0",
        status: "draft",
      });
      load();
    } catch (err) {
      setError("Failed to create payroll record.");
      addToast("Failed to create payroll", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setRows((prev) =>
      prev.map((r) => (String(r.id) === String(id) ? { ...r, status: newStatus } : r))
    );
    try {
      await updatePayrollStatus(id, newStatus);
      addToast(`Payroll status updated to ${newStatus}`, "success");
    } catch {
      addToast("Failed to update payroll status", "error");
      await load();
    }
  };

  const columns = [
    { key: "employee_name", label: "Employee" },
    { key: "basic", label: "Regular Pay", render: (r) => formatInr(r.basic || r.regular_pay) },
    { key: "overtime", label: "OT Pay", render: (r) => formatInr(r.overtime || r.overtime_pay) },
    { key: "gross_pay", label: "Gross Pay", render: (r) => formatInr(r.gross_pay) },
    { key: "pf", label: "PF", render: (r) => formatInr(r.pf) },
    { key: "esi", label: "ESI", render: (r) => formatInr(r.esi) },
    { key: "tax", label: "Tax", render: (r) => formatInr(r.tax) },
    { key: "deductions", label: "Total Deductions", render: (r) => <span className="text-red-600 font-medium">{formatInr(r.deductions)}</span> },
    { key: "net_salary", label: "Net Salary", render: (r) => <span className="font-bold text-emerald-700">{formatInr(r.net_salary || r.net_pay)}</span> },
    { key: "status", label: "Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColor(r.status)}`}>{r.status}</span> },
    { key: "actions", label: "Actions", render: (r) => (
      <div className="flex items-center gap-2">
        {r.status === "draft" && (
          <button
            type="button"
            onClick={() => handleStatusChange(r.id, "processed")}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
          >
            Process
          </button>
        )}
        {r.status === "processed" && (
          <button
            type="button"
            onClick={() => handleStatusChange(r.id, "paid")}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            Mark Paid
          </button>
        )}
        <button type="button" onClick={() => setSelected(r)} className="text-xs font-semibold text-[#2563EB] hover:underline">
          Payslip
        </button>
      </div>
    )},
  ];

  const handleExport = () => {
    if (!rows || rows.length === 0) {
      addToast("No payroll records available to export", "error");
      return;
    }
    const headers = ["Employee", "Period Start", "Period End", "Regular Pay", "OT Pay", "Gross Pay", "PF", "ESI", "Tax", "Total Deductions", "Net Salary", "Status"];
    const csvLines = [
      headers.join(","),
      ...rows.map((r) => [
        `"${r.employee_name || ''}"`,
        `"${r.period_start || ''}"`,
        `"${r.period_end || ''}"`,
        r.basic || r.regular_pay || 0,
        r.overtime || r.overtime_pay || 0,
        r.gross_pay || 0,
        r.pf || 0,
        r.esi || 0,
        r.tax || 0,
        r.deductions || 0,
        r.net_salary || r.net_pay || 0,
        `"${r.status || ''}"`
      ].join(","))
    ];

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Payroll_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Payroll register exported to CSV", "success");
  };

  const liveSummary = useMemo(() => {
    if (!rows || rows.length === 0) return summary;

    let monthly_payroll = 0;
    let pending_salary = 0;
    let processed_salary = 0;
    let overtime_cost = 0;
    let pf = 0;
    let esi = 0;
    let professional_tax = 0;

    rows.forEach((r) => {
      const gross = Number(r.gross_pay || (Number(r.basic || r.regular_pay || 0) + Number(r.overtime || r.overtime_pay || 0))) || 0;
      const net = Number(r.net_salary || r.net_pay) || 0;
      const ot = Number(r.overtime || r.overtime_pay) || 0;
      const pfVal = Number(r.pf) || 0;
      const esiVal = Number(r.esi) || 0;
      const taxVal = Number(r.tax || r.professional_tax) || 0;

      monthly_payroll += net;
      overtime_cost += ot;
      pf += pfVal;
      esi += esiVal;
      professional_tax += taxVal;

      const st = String(r.status || "").toLowerCase();
      if (st === "processed" || st === "paid" || st === "approved") {
        processed_salary += net;
      } else {
        pending_salary += net;
      }
    });

    return {
      monthly_payroll,
      pending_salary,
      processed_salary,
      overtime_cost,
      pf,
      esi,
      professional_tax,
    };
  }, [rows, summary]);

  if (loading && rows.length === 0) return <Loader label="Loading payroll..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-500">Enterprise payroll with PF, ESI, tax, overtime, and salary slip generation.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="ui-btn-hr"
          >
            <Plus className="h-4 w-4" /> Create Payroll
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
        <KpiCard label="Monthly Payroll" value={formatInr(liveSummary.monthly_payroll)} icon={Wallet} color="bg-blue-600" />
        <KpiCard label="Pending Salary" value={formatInr(liveSummary.pending_salary)} icon={Clock} color="bg-amber-500" />
        <KpiCard label="Processed" value={formatInr(liveSummary.processed_salary)} icon={CheckCircle} color="bg-green-600" />
        <KpiCard label="OT Cost" value={formatInr(liveSummary.overtime_cost)} icon={TrendingUp} color="bg-orange-500" />
        <KpiCard label="PF" value={formatInr(liveSummary.pf)} icon={Shield} color="bg-indigo-600" />
        <KpiCard label="ESI" value={formatInr(liveSummary.esi)} icon={HeartPulse} color="bg-teal-600" />
        <KpiCard label="Prof. Tax" value={formatInr(liveSummary.professional_tax)} icon={Receipt} color="bg-purple-600" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 font-sans">Payroll Register</h2>
          <button type="button" onClick={handleExport} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-[#2563EB]"><Download className="h-4 w-4" /> Export</button>
        </div>
        <DataTable columns={columns} data={rows} searchPlaceholder="Search employee..." searchKeys={["employee_name", "status"]} />
      </div>

      {selected && <PayrollDetailModal record={selected} onClose={() => setSelected(null)} />}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Payroll Record</h3>
                <p className="text-xs text-slate-500 mt-0.5">Generate a new monthly payroll details entry.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Employee *</label>
                <select
                  value={form.employee_id}
                  onChange={(e) => handleFormChange("employee_id", e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Period Start *</label>
                  <input
                    type="date"
                    required
                    value={form.period_start}
                    onChange={(e) => handleFormChange("period_start", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Period End *</label>
                  <input
                    type="date"
                    required
                    value={form.period_end}
                    onChange={(e) => handleFormChange("period_end", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Regular Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.regular_hours}
                    onChange={(e) => handleFormChange("regular_hours", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Overtime Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.overtime_hours}
                    onChange={(e) => handleFormChange("overtime_hours", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Regular Pay (₹)</label>
                  <input
                    type="number"
                    value={form.regular_pay}
                    onChange={(e) => handleFormChange("regular_pay", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Overtime Pay (₹)</label>
                  <input
                    type="number"
                    value={form.overtime_pay}
                    onChange={(e) => handleFormChange("overtime_pay", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Deductions Breakdown: PF, ESI, Tax */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Deductions Breakdown</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500">PF (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={form.pf}
                      onChange={(e) => handleFormChange("pf", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">ESI (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={form.esi}
                      onChange={(e) => handleFormChange("esi", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Tax / TDS (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={form.tax}
                      onChange={(e) => handleFormChange("tax", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Summary: Gross Pay, Total Deductions, Net Pay */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Pay (₹)</label>
                  <input
                    type="number"
                    disabled
                    value={form.gross_pay}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-700 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Total Deductions (₹)</label>
                  <input
                    type="number"
                    disabled
                    value={form.deductions}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-red-600 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Net Pay (₹)</label>
                  <input
                    type="number"
                    disabled
                    value={form.net_pay}
                    className="mt-1.5 w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="ui-btn-hr"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Create Payroll"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
