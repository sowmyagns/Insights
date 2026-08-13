import { useCallback, useEffect, useMemo, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { AlertCircle, CheckCircle, Clock, FileSearch, Timer, XCircle } from "lucide-react";
import KpiCard from "../../components/common/KpiCard";
import PageHeader from "../../components/common/PageHeader";

import DataTable from "../../components/common/DataTable";
import QualityFilters from "../../components/quality/QualityFilters";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getIncomingEnriched, getIncomingSummary } from "../../api/qualityApi";
import { DEMO_INCOMING_LIST, DEMO_INCOMING_SUMMARY, QUALITY_FLOW, qcStatusColor } from "../../data/qualityMasterData";


export default function IncomingInspection() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(DEMO_INCOMING_SUMMARY);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const emptySummary = { todays_inspections: 0, pending_grn: 0, passed: 0, rejected: 0, vendor_rejection_rate: "0%" };
      const [sumRes, listRes] = await Promise.allSettled([getIncomingSummary(), getIncomingEnriched()]);
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
    } catch (err) {
      if (isRefresh) throw err;
      setSummary({ todays_inspections: 0, pending_grn: 0, passed: 0, rejected: 0, vendor_rejection_rate: "0%" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  usePageRefresh(() => load(true));

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (q && ![r.inspection_number, r.vendor_name, r.material_name, r.po_reference].some((v) => String(v || "").toLowerCase().includes(q))) return false;
      if (resultFilter && r.result !== resultFilter && r.status !== resultFilter) return false;
      return true;
    });
  }, [rows, search, resultFilter]);

  const handleInspect = (row) => {
    const key = row.id ?? row.inspection_number;
    setRows((prev) =>
      prev.map((r) =>
        (r.id ?? r.inspection_number) === key
          ? { ...r, status: "inspected", result: r.result === "pending" || !r.result ? "passed" : r.result }
          : r
      )
    );
    addToast(`Inspection ${row.inspection_number || ""} marked as inspected`, "success");
  };

  const columns = [
    { key: "inspection_number", label: "Inspection No" },
    { key: "po_reference", label: "Purchase Order (PO)" },
    { key: "vendor_name", label: "Vendor" },
    { key: "material_name", label: "Material" },
    { key: "batch_code", label: "Batch" },
    { key: "quantity", label: "Quantity" },
    { key: "inspector", label: "Inspector" },
    { key: "result", label: "Result", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${qcStatusColor(r.result)}`}>{r.result}</span> },
    { key: "status", label: "Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${qcStatusColor(r.status)}`}>{r.status}</span> },
    {
      key: "actions",
      label: "Action",
      render: (r) =>
        r.attachment ? (
          <span className="text-xs text-[#2563EB]">{r.attachment}</span>
        ) : (
          <button type="button" onClick={() => handleInspect(r)} className="text-xs font-semibold text-[#2563EB] hover:underline">
            Inspect
          </button>
        ),
    },
  ];

  if (loading) return <Loader label="Loading incoming inspections..." />;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader subtitle="IQC for raw materials — PO, vendor, batch verification before inventory receipt." />

      <div className="ui-grid-kpi">
        <KpiCard label="Today's Inspections" value={summary.todays_inspections} icon={FileSearch} color="bg-[var(--color-primary)]" />
        <KpiCard label="Pending Inspection" value={summary.pending_inspection} icon={Clock} color="bg-orange-500" />
        <KpiCard label="Passed" value={summary.passed} icon={CheckCircle} color="bg-green-600" />
        <KpiCard label="Failed" value={summary.failed} icon={XCircle} color="bg-red-500" />
        <KpiCard label="Rejected Lots" value={summary.rejected_lots} icon={AlertCircle} color="bg-red-600" />
        <KpiCard label="Avg Inspection Time" value={summary.avg_inspection_time} suffix=" min" icon={Timer} color="bg-indigo-600" />
      </div>

      <div className="ui-toolbar ui-card px-4 py-3 text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)]">
        {QUALITY_FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 ring-1 ring-[var(--color-border)]">{s}</span>
            {i < QUALITY_FLOW.length - 1 && <span className="text-[var(--color-text-faint)]">↓</span>}
          </span>
        ))}
      </div>

      <QualityFilters search={search} onSearchChange={setSearch} resultFilter={resultFilter} onResultFilterChange={setResultFilter} searchPlaceholder="Search inspection, vendor, material, PO..." />

      <div className="ui-card p-4">
        <DataTable columns={columns} data={filtered} searchPlaceholder="" searchKeys={[]} />
      </div>
    </div>
  );
}
