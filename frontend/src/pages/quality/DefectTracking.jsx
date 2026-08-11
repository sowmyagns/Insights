import { useCallback, useEffect, useMemo, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { AlertTriangle, CheckCircle, ClipboardList, User } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import QualityFilters from "../../components/quality/QualityFilters";
import Loader from "../../components/common/Loader";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";
import { useToast } from "../../context/ToastContext";
import { getDefectsEnriched, getDefectSummary, updateDefectStatus } from "../../api/qualityApi";
import { DEFECT_WORKFLOW, DEMO_DEFECT_LIST, DEMO_DEFECT_SUMMARY, qcStatusColor, severityColor } from "../../data/qualityMasterData";

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

const STATUS_NEXT = {
  open: "assigned",
  new: "assigned",
  assigned: "in_progress",
  in_progress: "verification",
  verification: "resolved",
  resolved: "closed",
};

export default function DefectTracking() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(DEMO_DEFECT_SUMMARY);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const emptySummary = { total_defects: 0, critical: 0, major: 0, minor: 0, defect_rate: "0%", top_cause: "None" };
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
      setSummary({ total_defects: 0, critical: 0, major: 0, minor: 0, defect_rate: "0%", top_cause: "None" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (q && ![r.defect_code, r.description, r.product_name, r.root_cause].some((v) => String(v || "").toLowerCase().includes(q))) return false;
      if (resultFilter && r.status !== resultFilter && r.severity !== resultFilter) return false;
      return true;
    });
  }, [rows, search, resultFilter]);

  const advanceStatus = async (row) => {
    const next = STATUS_NEXT[row.status];
    if (!next) return;
    try {
      await updateDefectStatus(row.id, next);
      addToast(`Defect moved to ${next.replace("_", " ")}`);
      load();
    } catch {
      addToast("Status update failed", "error");
    }
  };

  const columns = [
    { key: "defect_code", label: "Defect ID" },
    { key: "description", label: "Description" },
    { key: "product_name", label: "Product" },
    { key: "batch_code", label: "Batch" },
    { key: "machine_name", label: "Machine" },
    { key: "department", label: "Department" },
    { key: "root_cause", label: "Root Cause" },
    { key: "corrective_action", label: "Corrective Action (CAPA)" },
    { key: "preventive_action", label: "Preventive Action" },
    { key: "assigned_to", label: "Assigned To" },
    { key: "due_date", label: "Due Date", render: (r) => String(r.due_date || "").slice(0, 10) },
    { key: "attachment", label: "Attachment", render: (r) => r.attachment ? <span className="text-xs text-[#2563EB]">{r.attachment}</span> : "—" },
    { key: "severity", label: "Severity", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${severityColor(r.severity)}`}>{r.severity}</span> },
    { key: "status", label: "Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${qcStatusColor(r.status)}`}>{r.status.replace("_", " ")}</span> },
    {
      key: "actions", label: "Action",
      render: (r) => STATUS_NEXT[r.status] ? (
        <button type="button" onClick={() => advanceStatus(r)} className="text-xs font-semibold text-[#2563EB] hover:underline capitalize">
          → {STATUS_NEXT[r.status].replace("_", " ")}
        </button>
      ) : <span className="text-xs text-slate-400">Closed</span>,
    },
  ];

  if (loading) return <Loader label="Loading defect tracking..." />;

  return (
    <div className="min-h-full pb-8 print:p-0" style={{ background: "#F5F5F5" }}>
      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <div>
          <p className="mt-0.5 text-xs text-slate-500 print:hidden">Non-conformance, root cause analysis, corrective/preventive actions, and NCR workflow.</p>
        </div>


        <div className="mb-0 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex flex-wrap gap-2">
          </div>
        </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Defects" value={summary.total_defects} icon={ClipboardList} color="bg-blue-600" />
        <KpiCard label="Open" value={summary.open} icon={AlertTriangle} color="bg-orange-500" />
        <KpiCard label="In Progress" value={summary.in_progress} icon={User} color="bg-indigo-600" />
        <KpiCard label="Resolved" value={summary.resolved} icon={CheckCircle} color="bg-green-600" />
        <KpiCard label="Critical" value={summary.critical} icon={AlertTriangle} color="bg-red-600" />
        <KpiCard label="CAPA Pending" value={summary.capa_pending} icon={ClipboardList} color="bg-amber-500" />
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-medium text-slate-600 sm:text-xs">
        {DEFECT_WORKFLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded bg-white px-1.5 py-0.5 shadow-sm">{s}</span>
            {i < DEFECT_WORKFLOW.length - 1 && <span className="text-slate-400">↓</span>}
          </span>
        ))}
      </div>

      <QualityFilters search={search} onSearchChange={setSearch} resultFilter={resultFilter} onResultFilterChange={setResultFilter} searchPlaceholder="Search defect, product, root cause..." />

      <div className="rounded-xl border border-[#e4e4ea] bg-white p-4 shadow-sm sm:p-5 overflow-x-auto">
        <DataTable columns={columns} data={filtered} searchPlaceholder="" searchKeys={[]} />
      </div>
      </div>
    </div>
  );
}
