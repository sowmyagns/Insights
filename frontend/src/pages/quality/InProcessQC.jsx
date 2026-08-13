import { useCallback, useEffect, useMemo, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { AlertTriangle, CheckCircle, Clock, Cog, RotateCcw, Trash2, XCircle } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import QualityFilters from "../../components/quality/QualityFilters";
import Loader from "../../components/common/Loader";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";
import { useToast } from "../../context/ToastContext";
import { getProcessEnriched, getProcessSummary } from "../../api/qualityApi";
import { DEMO_PROCESS_LIST, DEMO_PROCESS_SUMMARY, qcStatusColor } from "../../data/qualityMasterData";

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="ui-card p-4 min-h-[86px] flex flex-col justify-between min-w-0 overflow-hidden" title={typeof label === "string" ? label : undefined}>
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <p className="truncate text-[11px] font-medium text-[var(--color-text-muted)] leading-tight sm:text-xs min-w-0 flex-1">{label}</p>
        {Icon && (
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${color}`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="truncate text-xl font-bold tabular-nums text-[var(--color-text)] leading-none sm:text-2xl">{value}</p>
      </div>
    </div>
  );
}

export default function InProcessQC() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(DEMO_PROCESS_SUMMARY);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const emptySummary = { production_running: 0, active_inspections: 0, pending_samples: 0, first_piece_approved: 0, process_compliance: "0%" };
      const [sumRes, listRes] = await Promise.allSettled([getProcessSummary(), getProcessEnriched()]);
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
      setSummary({ production_running: 0, active_inspections: 0, pending_samples: 0, first_piece_approved: 0, process_compliance: "0%" });
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
      if (q && ![r.work_order_number, r.machine_name, r.operator_name, r.product_name].some((v) => String(v || "").toLowerCase().includes(q))) return false;
      if (resultFilter && r.qc_status !== resultFilter) return false;
      return true;
    });
  }, [rows, search, resultFilter]);

  const columns = [
    { key: "work_order_number", label: "Work Order" },
    { key: "machine_name", label: "Machine" },
    { key: "shift", label: "Shift", render: (r) => typeof r.shift === "object" ? (r.shift?.label || r.shift?.id || "—") : (r.shift || "—") },
    { key: "operator_name", label: "Operator" },
    { key: "inspection_time", label: "Inspection Time" },
    { key: "qc_status", label: "Quality Control (QC) Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${qcStatusColor(r.qc_status)}`}>{r.qc_status}</span> },
    { key: "remarks", label: "Remarks" },
    { key: "product_name", label: "Product" },
    { key: "batch_code", label: "Batch" },
  ];

  if (loading) return <Loader label="Loading in-process Quality Control (QC)..." />;

  return (
    <div className="min-h-full pb-8 print:p-0" style={{ background: "#F5F5F5" }}>
      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <div>
          <p className="ui-subtitle print:hidden">Real-time quality checks during manufacturing — work order, machine, shift, operator.</p>
        </div>

        <div className="mb-0 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex flex-wrap gap-2">
          </div>
        </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Production Running" value={summary.production_running} icon={Cog} color="bg-blue-600" />
        <KpiCard label="Quality Control (QC) Pending" value={summary.qc_pending} icon={Clock} color="bg-orange-500" />
        <KpiCard label="Passed" value={summary.passed} icon={CheckCircle} color="bg-green-600" />
        <KpiCard label="Failed" value={summary.failed} icon={XCircle} color="bg-red-500" />
        <KpiCard label="Rework" value={summary.rework} icon={RotateCcw} color="bg-amber-500" />
        <KpiCard label="Scrap" value={summary.scrap} icon={Trash2} color="bg-red-600" />
      </div>

      <QualityFilters search={search} onSearchChange={setSearch} resultFilter={resultFilter} onResultFilterChange={setResultFilter} searchPlaceholder="Search work order, machine, operator..." />

      <div className="ui-card p-4 sm:p-5">
        <DataTable columns={columns} data={filtered} searchPlaceholder="" searchKeys={[]} />
      </div>
      </div>
    </div>
  );
}
