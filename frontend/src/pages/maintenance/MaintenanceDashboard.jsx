import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import usePageRefresh from "../../hooks/usePageRefresh";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  FileStack,
  IndianRupee,
  MoreVertical,
  Plus,
  Timer,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import MaintenanceErrorState from "../../components/maintenance/MaintenanceErrorState";
import MaintenanceKpiCard from "../../components/maintenance/MaintenanceKpiCard";
import { getMaintenanceHub } from "../../api/maintenanceApi";
import {
  DEMO_MAINTENANCE_HUB,
  computeMonthTrend,
  formatInr,
  mntStatusColor,
  priorityColor,
} from "../../data/maintenanceMasterData";

function formatCostCompact(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return formatInr(n);
}

function RequestStatusBadge({ status }) {
  const label = String(status || "open").replace(/_/g, " ");
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${mntStatusColor(status)}`}>
      {label}
    </span>
  );
}

export default function MaintenanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hub, setHub] = useState(DEMO_MAINTENANCE_HUB);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await getMaintenanceHub();
      if (res.data) setHub({ ...DEMO_MAINTENANCE_HUB, ...res.data });
    } catch (e) {
      if (isRefresh) throw e;
      setError(e.message || "Network error");
      setHub(DEMO_MAINTENANCE_HUB);
    } finally {
      setLoading(false);
    }
  }, []);

  usePageRefresh(() => load(true));
  useEffect(() => { load(); }, [load]);

  const requestRows = useMemo(
    () => (hub.recent_requests || []).map((r) => ({ ...r, event_date: r.sort_date || r.due_date })),
    [hub.recent_requests]
  );

  const trends = useMemo(
    () => ({
      total: computeMonthTrend(requestRows),
      open: computeMonthTrend(requestRows, { match: (r) => ["scheduled", "reported", "open"].includes(String(r.status || "").toLowerCase()) }),
      inProgress: computeMonthTrend(requestRows, { match: (r) => ["in_progress", "assigned"].includes(String(r.status || "").toLowerCase()) }),
      completed: computeMonthTrend(requestRows, { match: (r) => ["completed", "resolved", "closed"].includes(String(r.status || "").toLowerCase()) }),
      overdue: computeMonthTrend(requestRows, { match: () => false }),
      cost: null,
    }),
    [requestRows]
  );

  const equipmentPie = (hub.equipment_status || []).filter((s) => s.count > 0);
  const overviewBars = hub.maintenance_overview || [];
  const costTrend = hub.cost_trend || [];

  if (loading) return <Loader label="Loading maintenance dashboard..." />;
  if (error && !hub.total_machines && !hub.total_requests) {
    return <MaintenanceErrorState message={error} onRetry={load} />;
  }

  return (
    <div className="min-w-0 space-y-5 pb-5">
      <PageHeader
        subtitle="Overview of maintenance requests, equipment status, and costs"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/maintenance/preventive"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)]"
            >
              <Plus className="h-4 w-4" />
              New Maintenance Request
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <MoreVertical className="h-4 w-4" />
              More Actions
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MaintenanceKpiCard label="Total Requests" value={hub.total_requests} icon={FileStack} tone="violet" trend={trends.total} />
        <MaintenanceKpiCard label="Open Requests" value={hub.open_requests} icon={Clock3} tone="success" trend={trends.open} />
        <MaintenanceKpiCard label="In Progress" value={hub.in_progress_requests} icon={Timer} tone="orange" trend={trends.inProgress} />
        <MaintenanceKpiCard label="Completed" value={hub.completed_requests} icon={CheckCircle2} tone="info" trend={trends.completed} />
        <MaintenanceKpiCard
          label="Overdue"
          value={hub.overdue_requests}
          icon={AlertTriangle}
          tone="danger"
          trend={hub.overdue_requests > 0 ? { pct: hub.overdue_requests, dir: "down", positive: false } : null}
        />
        <MaintenanceKpiCard label="Maintenance Cost" value={formatCostCompact(hub.total_cost)} icon={IndianRupee} tone="teal" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Equipment Status">
          {equipmentPie.length === 0 ? (
            <EmptyChart message="No equipment status data yet" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={equipmentPie} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2}>
                    {equipmentPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Maintenance Cost Trend">
          {costTrend.length === 0 ? (
            <EmptyChart message="No cost trend data yet" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--kpi-violet)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--kpi-violet)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4ea" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCostCompact(v)} />
                  <Tooltip formatter={(v) => formatInr(v)} />
                  <Area type="monotone" dataKey="cost" stroke="var(--kpi-violet)" fill="url(#costFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Maintenance Overview">
          {overviewBars.length === 0 ? (
            <EmptyChart message="No maintenance overview data yet" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overviewBars} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4ea" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {overviewBars.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent Maintenance Requests">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full w-full border-collapse text-left text-[13px]">
            <thead className="bg-[#eef6ff] text-[12px] font-semibold text-slate-700">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3">Request No</th>
                <th className="border-b border-slate-200 px-3 py-3">Machine</th>
                <th className="border-b border-slate-200 px-3 py-3">Type</th>
                <th className="border-b border-slate-200 px-3 py-3">Priority</th>
                <th className="border-b border-slate-200 px-3 py-3">Status</th>
                <th className="border-b border-slate-200 px-3 py-3">Assigned To</th>
                <th className="border-b border-slate-200 px-3 py-3">Due Date</th>
                <th className="border-b border-slate-200 px-3 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {(hub.recent_requests || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="border-b border-slate-100 px-3 py-10 text-center text-[13px] text-slate-500">
                    No maintenance requests found
                  </td>
                </tr>
              ) : (
                hub.recent_requests.map((row, idx) => (
                  <tr key={row.id} className={idx % 2 === 1 ? "bg-slate-50/60 hover:bg-slate-50" : "hover:bg-slate-50/80"}>
                    <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-800">{row.request_number}</td>
                    <td className="border-b border-slate-100 px-3 py-3 text-slate-600">{row.machine_name}</td>
                    <td className="border-b border-slate-100 px-3 py-3 text-slate-600">{row.request_type}</td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${priorityColor(row.priority)}`}>
                        {row.priority}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <RequestStatusBadge status={row.status} />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-slate-600">{row.assigned_to}</td>
                    <td className="border-b border-slate-100 px-3 py-3 text-slate-600">
                      {row.due_date ? String(row.due_date).slice(0, 10) : "—"}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <div className="flex items-center justify-center">
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-primary)] hover:bg-[var(--kpi-primary-soft)]" aria-label="View request">
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {(hub.alerts || []).length > 0 ? (
        <Panel title="Alerts & Notifications">
          <div className="grid gap-3 sm:grid-cols-2">
            {hub.alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-[var(--kpi-warning-soft)] bg-[var(--kpi-warning-soft)]/40 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kpi-warning)]" />
                <p className="text-sm text-slate-700">{a.message}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/maintenance/equipment" label="Equipment & Spare Parts" />
        <QuickLink to="/maintenance/preventive" label="Preventive Maintenance" />
        <QuickLink to="/maintenance/breakdowns" label="Breakdown Maintenance" />
        <QuickLink to="/maintenance/machine-history" label="Machine History" />
      </div>
    </div>
  );
}

function Panel({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="mb-4 text-[15px] font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 text-[13px] text-slate-500">
      {message}
    </div>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link to={to} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-primary)] shadow-sm transition hover:bg-[var(--kpi-primary-soft)]">
      {label} →
    </Link>
  );
}
