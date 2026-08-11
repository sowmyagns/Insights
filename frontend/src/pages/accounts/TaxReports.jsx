import { useCallback, useEffect, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { FileText, IndianRupee } from "lucide-react";

import ExportButtons from "../../components/finance/ExportButtons";
import FinanceFilters from "../../components/finance/FinanceFilters";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getGSTExtended } from "../../api/accountsApi";
import { DEMO_GST, GST_REPORTS, formatInr } from "../../data/financeMasterData";

const PIE_COLORS = ["#2563EB", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function KpiCard({ label, value, icon: Icon, color, highlight }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${highlight ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-medium ${highlight ? "text-blue-700" : "text-slate-500"}`}>{label}</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${highlight ? "text-blue-900" : "text-slate-900"}`}>{value}</p>
        </div>
        {Icon && <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5 text-white" /></div>}
      </div>
    </div>
  );
}

export default function TaxReports() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(DEMO_GST);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [financialYear, setFinancialYear] = useState("2025-26");
  const [month, setMonth] = useState("All Months");
  const [branch, setBranch] = useState("");
  const [activeReport, setActiveReport] = useState("GSTR-3B");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getGSTExtended(year);
      if (res.data) setData({ ...DEMO_GST, ...res.data });
    } catch {
    } finally {
      setLoading(false);
    }
  }, [year, addToast]);

  usePageRefresh(load);


  useEffect(() => { load(); }, [load]);

  const exportExcel = () => {
    const rows = [
      ["GST Report", year],
      ["SGST", data.sgst], ["CGST", data.cgst], ["IGST", data.igst],
      ["Total GST", data.total_gst], ["Taxable Value", data.taxable_value],
      ["GST Payable", data.gst_payable], ["GST Receivable", data.gst_receivable],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GST Report");
    XLSX.writeFile(wb, `GST_Report_${year}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`GST Report ${year}`, 14, 20);
    doc.setFontSize(10);
    let y = 35;
    [["SGST", data.sgst], ["CGST", data.cgst], ["IGST", data.igst], ["Total GST", data.total_gst], ["Taxable Value", data.taxable_value]].forEach(([k, v]) => {
      doc.text(`${k}: ${formatInr(v)}`, 14, y);
      y += 8;
    });
    doc.save(`GST_Report_${year}.pdf`);
  };

  if (loading) return <Loader label="Loading GST reports..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-500">GSTR-1, GSTR-2B, GSTR-3B, GSTR-9, HSN & SAC summaries with trend analysis.</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons onExcel={exportExcel} onPdf={exportPdf} />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="State Goods & Services Tax (SGST)" value={formatInr(data.sgst)} icon={IndianRupee} color="bg-indigo-600" />
        <KpiCard label="Central Goods & Services Tax (CGST)" value={formatInr(data.cgst)} icon={IndianRupee} color="bg-purple-600" />
        <KpiCard label="Integrated Goods & Services Tax (IGST)" value={formatInr(data.igst)} icon={IndianRupee} color="bg-pink-600" />
        <KpiCard label="Total Goods & Services Tax (GST)" value={formatInr(data.total_gst)} icon={IndianRupee} color="bg-blue-600" highlight />
        <KpiCard label="Taxable Value" value={formatInr(data.taxable_value)} icon={FileText} color="bg-slate-600" />
        <KpiCard label="Goods & Services Tax (GST) Payable" value={formatInr(data.gst_payable)} icon={IndianRupee} color="bg-red-500" />
        <KpiCard label="Goods & Services Tax (GST) Receivable" value={formatInr(data.gst_receivable)} icon={IndianRupee} color="bg-green-600" />
      </div>

      <FinanceFilters
        search={search}
        onSearchChange={setSearch}
        financialYear={financialYear}
        onFinancialYearChange={setFinancialYear}
        month={month}
        onMonthChange={setMonth}
        branch={branch}
        onBranchChange={setBranch}
        searchPlaceholder="Search GSTIN, customer..."
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {[2026, 2025, 2024, 2023].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </FinanceFilters>

      <div className="flex flex-wrap gap-2">
        {GST_REPORTS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setActiveReport(r)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeReport === r ? "bg-[#2563EB] text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-900">{activeReport}</h2>
        <p className="text-sm text-slate-500">Summary for FY {financialYear} — {formatInr(data.total_gst)} total GST collected.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Monthly GST Collection</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly_collection || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => formatInr(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatInr(v)} />
                <Bar dataKey="amount" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">GST Trend</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.gst_trend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => formatInr(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatInr(v)} />
                <Legend />
                <Line type="monotone" dataKey="sgst" name="SGST" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cgst" name="CGST" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="igst" name="IGST" stroke="#ec4899" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">GST by Customer</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.gst_by_customer || []} dataKey="gst" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                  {(data.gst_by_customer || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatInr(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">GST by Product</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.gst_by_product || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => formatInr(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => formatInr(v)} />
                <Bar dataKey="gst" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}