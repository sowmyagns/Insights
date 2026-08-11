import { useCallback, useEffect, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { Link } from "react-router-dom";
import { AlertTriangle, Briefcase, Clock, IndianRupee, UserCheck, Users } from "lucide-react";

import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getHRHub } from "../../api/hrApi";
import { HR_FLOW, formatInr } from "../../data/hrMasterData";

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs min-h-[86px] flex flex-col justify-between min-w-0 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md" title={typeof label === "string" ? label : undefined}>
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <p className="truncate text-[11px] font-medium text-slate-500 leading-tight sm:text-xs min-w-0 flex-1">{label}</p>
        {Icon && (
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-transform duration-200 group-hover:scale-105 ${color}`}>
            <Icon className="h-3.5 w-3.5 text-white shrink-0" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="truncate text-xl font-bold tabular-nums text-slate-900 leading-none sm:text-2xl" title={String(value)}>
          {value}
        </p>
      </div>
    </div>
  );
}

const alertIcons = { certification: AlertTriangle, leave: Briefcase, payroll: IndianRupee, attendance: Clock };

export default function HRDashboard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hub, setHub] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHRHub();
      if (res.data) setHub(res.data || {});
      else setHub({});
    } catch {
      setHub({});
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    await load();
  };

  usePageRefresh(handleRefresh);

  useEffect(() => { load(); }, [load]);

  if (loading && !hub.total_employees) return <Loader label="Loading HR dashboard..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-500">Workforce analytics, attendance, leave, payroll, and manufacturing HR insights.</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Employees" value={hub.total_employees} icon={Users} color="bg-blue-600" />
        <KpiCard label="Present Today" value={hub.present_today} icon={UserCheck} color="bg-green-600" />
        <KpiCard label="Pending Leave" value={hub.pending_leave} icon={Briefcase} color="bg-amber-500" />
        <KpiCard label="Monthly Payroll" value={formatInr(hub.monthly_payroll)} icon={IndianRupee} color="bg-indigo-600" />
        <KpiCard label="Overtime (h)" value={hub.overtime_hours} icon={Clock} color="bg-orange-500" />
        <KpiCard label="New Joiners" value={hub.new_joiners} icon={Users} color="bg-teal-600" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-[11px] font-semibold text-slate-600 shadow-sm">
        {HR_FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="rounded-lg border border-slate-200/60 bg-white px-2.5 py-1 text-slate-700 shadow-xs">{s}</span>
            {i < HR_FLOW.length - 1 && <span className="text-slate-400">→</span>}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <h2 className="mb-4 text-base font-bold text-slate-900 tracking-tight font-sans">Department Strength</h2>
          {hub.department_strength && hub.department_strength.length > 0 ? (
            <ul className="space-y-2.5">
              {hub.department_strength.map((d) => (
                <li key={d.name} className="flex items-center justify-between rounded-xl bg-slate-50/80 border border-slate-100 px-3.5 py-2.5 text-sm transition-colors hover:bg-slate-100/80">
                  <span className="font-semibold text-slate-700">{d.name}</span>
                  <span className="inline-flex items-center justify-center rounded-lg bg-blue-50 px-2.5 py-0.5 text-xs font-extrabold text-[#2563EB]">{d.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic">No department data recorded yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <h2 className="mb-4 text-base font-bold text-slate-900 tracking-tight font-sans">Shift Utilization</h2>
          {hub.shift_utilization && hub.shift_utilization.length > 0 ? (
            <ul className="space-y-3.5">
              {hub.shift_utilization.map((s) => (
                <li key={s.name}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold text-slate-700">{s.name}</span>
                    <span className="font-bold text-[#2563EB]">{s.utilization}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-[#2563EB] transition-all duration-500" style={{ width: `${s.utilization}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic">No shift allocation recorded yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
        <h2 className="mb-4 text-base font-bold text-slate-900 tracking-tight font-sans">Alerts & Notifications</h2>
        {hub.alerts && hub.alerts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {hub.alerts.map((a, i) => {
              const Icon = alertIcons[a.type] || AlertTriangle;
              return (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50/80 px-4 py-3 shadow-xs">
                  <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600" />
                  <p className="text-sm font-medium text-amber-900">{a.message}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">No active alerts at this time.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/hr/employees" label="Employees" />
        <QuickLink to="/hr/attendance" label="Attendance" />
        <QuickLink to="/hr/leave" label="Leave" />
        <QuickLink to="/hr/payroll" label="Payroll" />
        <QuickLink to="/hr/shifts" label="Shifts" />
        <QuickLink to="/hr/performance" label="Performance" />
        <QuickLink to="/hr/assets" label="Assets" />
        <QuickLink to="/hr/incidents" label="Incidents" />
        <QuickLink to="/hr/documents" label="Human Resources (HR) Documents" />
        <QuickLink to="/masters/departments" label="Departments" />
      </div>
    </div>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link to={to} className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-xs hover:border-[#2563EB] hover:text-[#2563EB] transition-all hover:shadow-sm">
      <span>{label}</span>
      <span className="transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}
