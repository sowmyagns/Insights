import { useCallback, useEffect, useMemo, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { CheckCircle, Clock, FileCheck, Package, Truck, XCircle } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import QualityFilters from "../../components/quality/QualityFilters";
import Loader from "../../components/common/Loader";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";
import { useToast } from "../../context/ToastContext";
import { getFinalEnriched, getFinalSummary } from "../../api/qualityApi";
import { DEMO_FINAL_LIST, DEMO_FINAL_SUMMARY, FINAL_QC_FLOW, qcStatusColor } from "../../data/qualityMasterData";

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

export default function FinalQC() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(DEMO_FINAL_SUMMARY);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const emptySummary = { pending_final: 0, passed_today: 0, rejected_today: 0, fg_released: 0, avg_inspection_time: "0 min" };
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
      setSummary({ pending_final: 0, passed_today: 0, rejected_today: 0, fg_released: 0, avg_inspection_time: "0 min" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (q && ![r.inspection_number, r.customer_name, r.product_name, r.sales_order_number].some((v) => String(v || "").toLowerCase().includes(q))) return false;
      if (resultFilter && r.result !== resultFilter && r.status !== resultFilter) return false;
      return true;
    });
  }, [rows, search, resultFilter]);

  const columns = [
    { key: "inspection_number", label: "Inspection No" },
    { key: "customer_name", label: "Customer" },
    { key: "sales_order_number", label: "Sales Order" },
    { key: "product_name", label: "Product" },
    { key: "batch_code", label: "Batch" },
    { key: "packing_status", label: "Packing Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${qcStatusColor(r.packing_status)}`}>{r.packing_status || "—"}</span> },
    { key: "approval", label: "Approval", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${qcStatusColor(r.approval)}`}>{r.approval || "—"}</span> },
    { key: "certificate_ref", label: "Quality Control (QC) Certificate", render: (r) => r.certificate_ref ? <span className="text-xs font-medium text-[#2563EB]">{r.certificate_ref}</span> : "—" },
    { key: "result", label: "Result", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${qcStatusColor(r.result)}`}>{r.result}</span> },
    { key: "inspector", label: "Inspector" },
  ];

  if (loading) return <Loader label="Loading final QC..." />;

  return (
    <div className="min-h-full pb-8 print:p-0" style={{ background: "#F5F5F5" }}>
      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <div>
          <p className="mt-0.5 text-xs text-slate-500 print:hidden">Pre-dispatch quality check — customer, sales order, packing, and QC certificate approval.</p>
        </div>

        <div className="mb-0 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex flex-wrap gap-2">
          </div>
        </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Pending Final QC" value={summary.pending_final} icon={Clock} color="bg-orange-500" />
        <KpiCard label="Passed" value={summary.passed} icon={CheckCircle} color="bg-green-600" />
        <KpiCard label="Failed" value={summary.failed} icon={XCircle} color="bg-red-500" />
        <KpiCard label="Packed" value={summary.packed} icon={Package} color="bg-blue-600" />
        <KpiCard label="Ready Dispatch" value={summary.ready_dispatch} icon={Truck} color="bg-teal-600" />
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-medium text-slate-600 sm:text-xs">
        {FINAL_QC_FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded bg-white px-1.5 py-0.5 shadow-sm">{s}</span>
            {i < FINAL_QC_FLOW.length - 1 && <span className="text-slate-400">↓</span>}
          </span>
        ))}
      </div>

      <QualityFilters search={search} onSearchChange={setSearch} resultFilter={resultFilter} onResultFilterChange={setResultFilter} searchPlaceholder="Search customer, SO, product..." />

      <div className="rounded-xl border border-[#e4e4ea] bg-white p-4 shadow-sm sm:p-5">
        <DataTable columns={columns} data={filtered} searchPlaceholder="" searchKeys={[]} />
      </div>
      </div>
    </div>
  );
}
