import { useCallback, useEffect, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { Link } from "react-router-dom";
import { AlertTriangle, Cog, IndianRupee, Pause, Play, Timer, TrendingUp, Wrench, Zap } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";

import Loader from "../../components/common/Loader";
import MaintenanceErrorState from "../../components/maintenance/MaintenanceErrorState";
import { useToast } from "../../context/ToastContext";
import { getMaintenanceHub } from "../../api/maintenanceApi";
import { DEMO_MAINTENANCE_HUB, MAINTENANCE_FLOW, formatInr, healthColor, healthTextColor, mntStatusColor, priorityColor } from "../../data/maintenanceMasterData";

const PIE_COLORS = ["#2563EB", "#ef4444"];

function KpiCard({ label, value, icon: Icon, color, suffix }) {
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
        <p className="truncate text-xl font-bold tabular-nums text-[var(--color-text)] leading-none">{value}{suffix || ""}</p>
      </div>
    </div>
  );
}

const alertIcons = { due: Timer, breakdown: AlertTriangle, spare: Wrench, completed: TrendingUp };

export default function MaintenanceDashboard() {
  const { addToast } = useToast();
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

  if (loading) return <Loader label="Loading maintenance dashboard..." />;
  if (error && !hub.total_machines) return <MaintenanceErrorState message={error} onRetry={load} />;

  const calendarDays = Array.from({ length: 14 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="ui-subtitle">Machine health, downtime, MTTR/MTBF, costs, calendar, and spare parts.</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Machines" value={hub.total_machines} icon={Cog} color="bg-blue-600" />
        <KpiCard label="Running" value={hub.running} icon={Play} color="bg-green-600" />
        <KpiCard label="Under Maintenance" value={hub.under_maintenance} icon={Wrench} color="bg-amber-500" />
        <KpiCard label="Breakdown" value={hub.breakdown} icon={Zap} color="bg-red-500" />
        <KpiCard label="Idle" value={hub.idle} icon={Pause} color="bg-slate-500" />
        <KpiCard label="Machine Health" value={hub.machine_health_pct} suffix="%" icon={TrendingUp} color="bg-teal-600" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard label="MTTR (Mean Time To Repair)" value={hub.mttr_hours} suffix=" h" icon={Timer} color="bg-indigo-600" />
        <KpiCard label="MTBF (Mean Time Between Failures)" value={hub.mtbf_hours} suffix=" h" icon={Timer} color="bg-purple-600" />
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-medium text-slate-600 sm:text-xs">
        {MAINTENANCE_FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded bg-white px-1.5 py-0.5 shadow-sm">{s}</span>
            {i < MAINTENANCE_FLOW.length - 1 && <span className="text-slate-400">↓</span>}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-4 font-semibold text-slate-900">Maintenance Calendar — July</h2>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {calendarDays.map((d) => {
              const events = (hub.calendar_events || []).filter((e) => e.day === d);
              return (
                <div key={d} className={`rounded-lg p-1.5 ${events.length ? "bg-blue-50 ring-1 ring-blue-200" : "bg-slate-50"}`}>
                  <div className="font-semibold text-slate-700">{d}</div>
                  {events.map((e) => (
                    <div key={`${d}-${e.machine}`} className="mt-0.5 truncate text-[9px] text-blue-700" title={`${e.machine} — ${e.type}`}>{e.type?.slice(0, 4)}</div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            {(hub.calendar_events || []).slice(0, 4).map((e) => (
              <div key={`${e.day}-${e.machine}`} className="flex justify-between"><span>Jul {e.day} — {e.machine}</span><span className="font-medium text-blue-600">{e.type}</span></div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-900">Machine Health</h2>
          <div className="space-y-3">
            {(hub.machine_health || []).map((m) => (
              <div key={m.code}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{m.name} <span className="text-slate-400">({m.code})</span></span>
                  <span className={`font-semibold ${healthTextColor(m.health)}`}>{m.health}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className={`h-2.5 rounded-full ${healthColor(m.health)}`} style={{ width: `${m.health}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Maintenance Cost Dashboard</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4 text-center"><p className="text-xs text-slate-500">Labour Cost</p><p className="mt-1 text-lg font-bold">{formatInr(hub.labour_cost)}</p></div>
          <div className="rounded-xl bg-slate-50 p-4 text-center"><p className="text-xs text-slate-500">Spare Cost</p><p className="mt-1 text-lg font-bold">{formatInr(hub.spare_cost)}</p></div>
          <div className="rounded-xl bg-slate-50 p-4 text-center"><p className="text-xs text-slate-500">External Service</p><p className="mt-1 text-lg font-bold">{formatInr(hub.external_cost)}</p></div>
          <div className="rounded-xl bg-blue-50 p-4 text-center"><p className="text-xs text-blue-600">Total Cost</p><p className="mt-1 text-lg font-bold text-blue-900">{formatInr(hub.total_cost)}</p></div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Downtime Trend">
          <BarChart data={hub.downtime_trend || []}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip />
            <Bar dataKey="hours" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Machine Availability">
          <LineChart data={hub.availability_trend || []}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis domain={[80, 100]} tick={{ fontSize: 10 }} /><Tooltip />
            <Line type="monotone" dataKey="pct" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Maintenance Cost Trend">
          <BarChart data={hub.cost_trend || []}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tickFormatter={(v) => formatInr(v)} tick={{ fontSize: 10 }} /><Tooltip formatter={(v) => formatInr(v)} />
            <Bar dataKey="cost" fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Breakdown Frequency">
          <BarChart data={hub.breakdown_frequency || []}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Monthly MTTR">
          <LineChart data={hub.mttr_trend || []}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip />
            <Line type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Monthly MTBF">
          <LineChart data={hub.mtbf_trend || []}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip />
            <Line type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Preventive vs Breakdown">
          <PieChart>
            <Pie data={hub.preventive_vs_breakdown || []} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={65}>
              {(hub.preventive_vs_breakdown || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Spare Parts Inventory</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-slate-500"><th className="pb-2">Part No</th><th className="pb-2">Name</th><th className="pb-2">Stock</th><th className="pb-2">Min</th><th className="pb-2">Vendor</th><th className="pb-2">Cost</th></tr></thead>
              <tbody>
                {(hub.spare_parts || []).map((p) => (
                  <tr key={p.part_number} className={`border-b border-slate-100 ${p.stock < p.minimum_stock ? "bg-red-50" : ""}`}>
                    <td className="py-2 font-medium">{p.part_number}</td>
                    <td className="py-2">{p.spare_name}</td>
                    <td className="py-2">{p.stock}{p.stock < p.minimum_stock && <span className="ml-1 text-xs font-semibold text-red-600">Low</span>}</td>
                    <td className="py-2">{p.minimum_stock}</td>
                    <td className="py-2">{p.vendor}</td>
                    <td className="py-2">{formatInr(p.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Work Orders</h2>
          <div className="space-y-3">
            {(hub.work_orders || []).map((wo) => (
              <div key={wo.work_order_number} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{wo.work_order_number}</p>
                  <p className="text-sm text-slate-600">{wo.machine} — {wo.assigned_to}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${priorityColor(wo.priority)}`}>{wo.priority}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${mntStatusColor(wo.status)}`}>{wo.status.replace("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Alerts & Notifications</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(hub.alerts || []).map((a, i) => {
            const Icon = alertIcons[a.type] || AlertTriangle;
            return (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-900">{a.message}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/maintenance/preventive" label="Preventive Maintenance" />
        <QuickLink to="/maintenance/breakdowns" label="Breakdown Maintenance" />
        <QuickLink to="/maintenance/machine-history" label="Machine History" />
        <QuickLink to="/maintenance/schedule" label="Maintenance Schedule" />
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="h-44"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </div>
  );
}

function QuickLink({ to, label }) {
  return <Link to={to} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#2563EB] shadow-sm hover:bg-blue-50">{label} →</Link>;
}
