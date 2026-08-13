import { useCallback, useEffect, useMemo, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CheckCircle, Layers, RotateCcw, Trash2, XCircle } from "lucide-react";
import KpiCard from "../../components/common/KpiCard";
import PageHeader from "../../components/common/PageHeader";

import DataTable from "../../components/common/DataTable";
import QualityFilters from "../../components/quality/QualityFilters";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getBatchEnriched, getBatchSummary } from "../../api/qualityApi";
import { DEMO_BATCH_LIST, DEMO_BATCH_SUMMARY, formatPct } from "../../data/qualityMasterData";


const monthlyYield = [];

export default function BatchQualityReports() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(DEMO_BATCH_SUMMARY);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const emptySummary = { total_batches: 0, passed_batches: 0, failed_batches: 0, retested: 0, avg_pass_rate: "0%", quarantine: 0 };
      const [sumRes, listRes] = await Promise.allSettled([getBatchSummary(), getBatchEnriched()]);
      if (sumRes.status === "fulfilled" && sumRes.value?.data && Object.keys(sumRes.value.data).length > 0) {
        setSummary({ ...emptySummary, ...sumRes.value.data });
      } else {
        setSummary(emptySummary);
      }
      if (listRes.status === "fulfilled" && listRes.value?.data) {
        setRows(listRes.value.data);
      } else {
        setRows([]);


      }
    } catch {
      setSummary({ total_batches: 0, passed_batches: 0, failed_batches: 0, retested: 0, avg_pass_rate: "0%", quarantine: 0 });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  usePageRefresh(() => load(true));

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
    <div className="space-y-5 pb-4">
      <PageHeader subtitle="Batch-wise yield, rejection, and quality trend analysis." />

      <div className="ui-grid-kpi">
        <KpiCard label="Total Batches" value={summary.total_batches} icon={Layers} color="bg-[var(--color-primary)]" />
        <KpiCard label="Passed" value={summary.passed} icon={CheckCircle} color="bg-green-600" />
        <KpiCard label="Failed" value={summary.failed} icon={XCircle} color="bg-red-500" />
        <KpiCard label="Yield %" value={formatPct(summary.yield_pct)} icon={CheckCircle} color="bg-teal-600" />
        <KpiCard label="Scrap %" value={formatPct(summary.scrap_pct)} icon={Trash2} color="bg-red-600" />
        <KpiCard label="Rework %" value={formatPct(summary.rework_pct)} icon={RotateCcw} color="bg-amber-500" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="ui-card p-5 lg:col-span-1">
          <h2 className="ui-section-title mb-4">Monthly Yield</h2>
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
        <div className="ui-card p-5 lg:col-span-1">
          <h2 className="ui-section-title mb-4">Batch Quality Trend</h2>
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
        <div className="ui-card p-5 lg:col-span-1">
          <h2 className="ui-section-title mb-4">Failure / Rejection Trend</h2>
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

      <div className="ui-card p-4">
        <DataTable columns={columns} data={filtered} searchPlaceholder="" searchKeys={[]} />
      </div>
    </div>
  );
}
