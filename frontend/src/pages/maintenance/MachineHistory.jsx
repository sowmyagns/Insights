import { useCallback, useEffect, useMemo, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { History, LayoutList } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import PageHeader from "../../components/common/PageHeader";
import MaintenanceErrorState from "../../components/maintenance/MaintenanceErrorState";
import MaintenanceFilters from "../../components/maintenance/MaintenanceFilters";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getMachineHistory } from "../../api/maintenanceApi";
import { DEMO_HISTORY_LIST, HISTORY_TIMELINE, formatInr } from "../../data/maintenanceMasterData";

const activityIcons = {
  "Machine Installed": "🏭",
  "Preventive Maintenance": "🔧",
  Breakdown: "⚠️",
  Repair: "🛠️",
  Calibration: "📐",
  "Replacement Parts": "⚙️",
};

export default function MachineHistory() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState("timeline");

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await getMachineHistory();
      if (res.data?.length) setRows(res.data);
      else setRows([]);

    } catch (e) {
      setError(e.message || "Network error");
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
      if (q && ![r.machine_name, r.activity, r.engineer, r.remarks].some((v) => String(v || "").toLowerCase().includes(q))) return false;
      if (statusFilter && r.activity?.toLowerCase() !== statusFilter) return false;
      return true;
    });
  }, [rows, search, statusFilter]);

  const columns = [
    { key: "machine_name", label: "Machine" },
    { key: "activity", label: "Activity" },
    { key: "event_date", label: "Date", render: (r) => String(r.event_date || "").slice(0, 10) },
    { key: "engineer", label: "Engineer" },
    { key: "cost", label: "Cost", render: (r) => formatInr(r.cost) },
    { key: "spare_parts", label: "Spare Parts", render: (r) => r.spare_parts || "—" },
    { key: "downtime_minutes", label: "Downtime", render: (r) => r.downtime_minutes != null ? `${r.downtime_minutes} min` : "—" },
    { key: "remarks", label: "Remarks" },
  ];

  if (loading) return <Loader label="Loading machine history..." />;
  if (error && !rows.length) return <MaintenanceErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        subtitle="Complete maintenance timeline — installation, PM, breakdowns, repairs, calibration."
        action={
          <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            <button type="button" onClick={() => setView("timeline")} className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ${view === "timeline" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)]"}`}><History className="h-3.5 w-3.5" /> Timeline</button>
            <button type="button" onClick={() => setView("table")} className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ${view === "table" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)]"}`}><LayoutList className="h-3.5 w-3.5" /> Table</button>
          </div>
        }
      />

      <div className="ui-toolbar ui-card px-4 py-3 text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)]">
        {HISTORY_TIMELINE.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 ring-1 ring-[var(--color-border)]">{s}</span>
            {i < HISTORY_TIMELINE.length - 1 && <span className="text-[var(--color-text-faint)]">↓</span>}
          </span>
        ))}
      </div>

      <MaintenanceFilters search={search} onSearchChange={setSearch} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} searchPlaceholder="Search machine, activity, engineer..." />

      {view === "timeline" ? (
        <div className="ui-card p-6">
          <div className="relative space-y-0">
            {filtered.map((item, i) => (
              <div key={item.id} className="relative flex gap-4 pb-8 last:pb-0">
                {i < filtered.length - 1 && <div className="absolute left-[15px] top-8 h-full w-0.5 bg-[var(--color-border)]" />}
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-sm">
                  {activityIcons[item.activity] || "📋"}
                </div>
                <div className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{item.activity}</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">{item.machine_name}</p>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">{String(item.event_date || "").slice(0, 10)}</span>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-[var(--color-text-muted)] sm:grid-cols-2">
                    {item.engineer && <span>Engineer: {item.engineer}</span>}
                    {item.cost != null && <span>Cost: {formatInr(item.cost)}</span>}
                    {item.spare_parts && <span>Parts: {item.spare_parts}</span>}
                    {item.downtime_minutes != null && <span>Downtime: {item.downtime_minutes} min</span>}
                  </div>
                  {item.remarks && <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{item.remarks}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="ui-card p-4 sm:p-5 overflow-x-auto">
          <DataTable columns={columns} data={filtered} searchPlaceholder="" searchKeys={[]} />
        </div>
      )}
    </div>
  );
}
