import { useCallback, useEffect, useMemo, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { CheckCircle, Clock, FileCheck, Package, Truck, XCircle } from "lucide-react";
import KpiCard from "../../components/common/KpiCard";
import PageHeader from "../../components/common/PageHeader";

import DataTable from "../../components/common/DataTable";
import QualityFilters from "../../components/quality/QualityFilters";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getFinalEnriched, getFinalSummary } from "../../api/qualityApi";
import { DEMO_FINAL_LIST, DEMO_FINAL_SUMMARY, FINAL_QC_FLOW, qcStatusColor } from "../../data/qualityMasterData";


export default function FinalQC() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(DEMO_FINAL_SUMMARY);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const emptySummary = { pending_final: 0, passed_today: 0, rejected_today: 0, fg_released: 0, avg_inspection_time: "0 min" };
      const [sumRes, listRes] = await Promise.allSettled([getFinalSummary(), getFinalEnriched()]);
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
      setSummary({ pending_final: 0, passed_today: 0, rejected_today: 0, fg_released: 0, avg_inspection_time: "0 min" });
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
    <div className="space-y-5 pb-4">
      <PageHeader subtitle="Pre-dispatch quality check — customer, sales order, packing, and QC certificate approval." />

      <div className="ui-grid-kpi">
        <KpiCard label="Pending Final QC" value={summary.pending_final} icon={Clock} color="bg-orange-500" />
        <KpiCard label="Passed" value={summary.passed} icon={CheckCircle} color="bg-green-600" />
        <KpiCard label="Failed" value={summary.failed} icon={XCircle} color="bg-red-500" />
        <KpiCard label="Packed" value={summary.packed} icon={Package} color="bg-[var(--color-primary)]" />
        <KpiCard label="Ready Dispatch" value={summary.ready_dispatch} icon={Truck} color="bg-teal-600" />
      </div>

      <div className="ui-toolbar ui-card px-4 py-3 text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)]">
        {FINAL_QC_FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 ring-1 ring-[var(--color-border)]">{s}</span>
            {i < FINAL_QC_FLOW.length - 1 && <span className="text-[var(--color-text-faint)]">↓</span>}
          </span>
        ))}
      </div>

      <QualityFilters search={search} onSearchChange={setSearch} resultFilter={resultFilter} onResultFilterChange={setResultFilter} searchPlaceholder="Search customer, SO, product..." />

      <div className="ui-card p-4 sm:p-5">
        <DataTable columns={columns} data={filtered} searchPlaceholder="" searchKeys={[]} />
      </div>
    </div>
  );
}
