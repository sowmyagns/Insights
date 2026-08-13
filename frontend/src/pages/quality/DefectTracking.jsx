import { useCallback, useEffect, useMemo, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { AlertTriangle, CheckCircle, ClipboardList, User } from "lucide-react";
import KpiCard from "../../components/common/KpiCard";
import PageHeader from "../../components/common/PageHeader";

import DataTable from "../../components/common/DataTable";
import QualityFilters from "../../components/quality/QualityFilters";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getDefectsEnriched, getDefectSummary, updateDefectStatus } from "../../api/qualityApi";
import { DEFECT_WORKFLOW, DEMO_DEFECT_LIST, DEMO_DEFECT_SUMMARY, qcStatusColor, severityColor } from "../../data/qualityMasterData";


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

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const emptySummary = { total_defects: 0, critical: 0, major: 0, minor: 0, defect_rate: "0%", top_cause: "None" };
      const [sumRes, listRes] = await Promise.allSettled([getDefectSummary(), getDefectsEnriched()]);
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
      setSummary({ total_defects: 0, critical: 0, major: 0, minor: 0, defect_rate: "0%", top_cause: "None" });
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
    <div className="space-y-5 pb-4">
      <PageHeader subtitle="Non-conformance, root cause analysis, corrective/preventive actions, and NCR workflow." />

      <div className="ui-grid-kpi">
        <KpiCard label="Total Defects" value={summary.total_defects} icon={ClipboardList} color="bg-[var(--color-primary)]" />
        <KpiCard label="Open" value={summary.open} icon={AlertTriangle} color="bg-orange-500" />
        <KpiCard label="In Progress" value={summary.in_progress} icon={User} color="bg-indigo-600" />
        <KpiCard label="Resolved" value={summary.resolved} icon={CheckCircle} color="bg-green-600" />
        <KpiCard label="Critical" value={summary.critical} icon={AlertTriangle} color="bg-red-600" />
        <KpiCard label="CAPA Pending" value={summary.capa_pending} icon={ClipboardList} color="bg-amber-500" />
      </div>

      <div className="ui-toolbar ui-card px-4 py-3 text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)]">
        {DEFECT_WORKFLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 ring-1 ring-[var(--color-border)]">{s}</span>
            {i < DEFECT_WORKFLOW.length - 1 && <span className="text-[var(--color-text-faint)]">↓</span>}
          </span>
        ))}
      </div>

      <QualityFilters search={search} onSearchChange={setSearch} resultFilter={resultFilter} onResultFilterChange={setResultFilter} searchPlaceholder="Search defect, product, root cause..." />

      <div className="ui-card p-4 sm:p-5 overflow-x-auto">
        <DataTable columns={columns} data={filtered} searchPlaceholder="" searchKeys={[]} />
      </div>
    </div>
  );
}
