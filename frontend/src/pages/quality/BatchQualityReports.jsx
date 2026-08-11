import { useCallback, useEffect, useMemo, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CheckCircle, Layers, RotateCcw, Trash2, XCircle } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import QualityFilters from "../../components/quality/QualityFilters";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getBatchEnriched, getBatchSummary } from "../../api/qualityApi";
import { DEMO_BATCH_LIST, DEMO_BATCH_SUMMARY, formatPct } from "../../data/qualityMasterData";

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs min-h-[86px] flex flex-col justify-between min-w-0 overflow-hidden" title={typeof label === "string" ? label : undefined}>
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <p className="truncate text-[11px] font-medium text-slate-500 leading-tight sm:text-xs min-w-0 flex-1">{label}</p>
        {Icon && (
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${color}`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="truncate text-xl font-bold tabular-nums text-slate-900 leading-none sm:text-2xl">{value}</p>
      </div>
    </div>
  );
}

const monthlyYield = [];

export default function BatchQualityReports() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(DEMO_BATCH_SUMMARY);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const emptySummary = { total_batches: 0, passed_batches: 0, failed_batches: 0, retested: 0, avg_pass_rate: "0%", quarantine: 0 };
      if (sumRes.status === "fulfilled" && sumRes.value?.data && Object.keys(sumRes.value.data).length > 0) {
        setSummary({ ...emptySummary, ...sumRes.value.data });
      } else {
        setSummary(emptySummary);
      }
      if (listRes.status === "fulfilled" && listRes.value?.data) {
        setRows(listRes.value.data);
      } else {
        setRows([]);

  usePageRefresh(load);

      }
    } catch {
      setSummary({ total_batches: 0, passed_batches: 0, failed_batches: 0, retested: 0, avg_pass_rate: "0%", quarantine: 0 });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (q && ![r.batch_code, r.product_name, r.inspector].some((v) => String(v || "").toLowerCase().includes(q))) return false;
      if (resultFilter === "pass" && r.yield_pct < 95) return false;
      if (resultFilter === "fail" && r.yield_pct >= 95) return false;
      return true;
    });
  }, [rows, search, resultFilter]);

  const columns = [
    { key: "batch_code", label: "Batch" },
    { key: "product_name", label: "Product" },
    { key: "shift", label: "Shift", render: (r) => typeof r.shift === "object" ? (r.shift?.label || r.shift?.id || "—") : (r.shift || "—") },
    { key: "production_qty", label: "Production Qty" },
    { key: "pass_qty", label: "Pass Qty" },
    { key: "reject_qty", label: "Reject Qty" },
    { key: "yield_pct", label: "Yield", render: (r) => <span className={r.yield_pct >= 95 ? "font-semibold text-green-700" : r.yield_pct >= 90 ? "font-semibold text-orange-600" : "font-semibold text-red-600"}>{formatPct(r.yield_pct)}</span> },
    { key: "inspector", label: "Inspector" },
    { key: "report_date", label: "Date", render: (r) => String(r.report_date || "").slice(0, 10) },
  ];

  if (loading) return <Loader label="Loading batch reports..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-500">Batch-wise yield, rejection, and quality trend analysis.</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Batches" value={summary.total_batches} icon={Layers} color="bg-blue-600" />
        <KpiCard label="Passed" value={summary.passed} icon={CheckCircle} color="bg-green-600" />
        <KpiCard label="Failed" value={summary.failed} icon={XCircle} color="bg-red-500" />
        <KpiCard label="Yield %" value={formatPct(summary.yield_pct)} icon={CheckCircle} color="bg-teal-600" />
        <KpiCard label="Scrap %" value={formatPct(summary.scrap_pct)} icon={Trash2} color="bg-red-600" />
        <KpiCard label="Rework %" value={formatPct(summary.rework_pct)} icon={RotateCcw} color="bg-amber-500" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Monthly Yield</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyYield}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[85, 100]} />
                <Tooltip />
                <Bar dataKey="yield" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Batch Quality Trend</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyYield}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="yield" stroke="#2563EB" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Failure / Rejection Trend</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyYield}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="failures" name="Failures" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <QualityFilters search={search} onSearchChange={setSearch} resultFilter={resultFilter} onResultFilterChange={setResultFilter} searchPlaceholder="Search batch, product, inspector..." />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <DataTable columns={columns} data={filtered} searchPlaceholder="" searchKeys={[]} />
      </div>
    </div>
  );
}
