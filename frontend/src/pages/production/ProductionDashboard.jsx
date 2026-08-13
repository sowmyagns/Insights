import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Cog,
  Cpu,
  Factory,
  Package,
  PlayCircle,
  Users,
  AlertTriangle,
} from "lucide-react";

import Loader from "../../components/common/Loader";
import SkeletonCard from "../../components/common/SkeletonCard";
import ProductionManagerNav from "../../components/production/ProductionManagerNav";
import { useToast } from "../../context/ToastContext";
import { getProductionHub } from "../../api/productionApi";
import {
  HUB_FLOW,
  HUB_MODULES,
  hubStatusColor,
} from "../../data/productionHubMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";
import { useCallback, useEffect, useState } from "react";

function KpiCard({ label, value, accent = false, tone, icon: Icon, iconWrap = "bg-sky-50 text-sky-700" }) {
  const valueClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
        ? "text-amber-700"
        : "text-[var(--color-text)]";
  return (
    <div
      className={`relative overflow-hidden ui-card p-4 ${
        accent ? "ring-1 ring-teal-200" : ""
      }`}
    >
      {accent ? <span className="absolute inset-x-0 top-0 h-0.5 bg-teal-600" aria-hidden /> : null}
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconWrap}`}>
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-[var(--color-text-muted)]">{label}</p>
          <p className={`mt-1 text-3xl font-bold tabular-nums ${valueClass}`}>{value ?? 0}</p>
        </div>
      </div>
    </div>
  );
}

function StatusPanel({ title, items, icon: Icon }) {
  return (
    <section className="ui-card p-4">
      <div className="mb-3 flex items-center gap-2">
        {Icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-800">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        ) : null}
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <dl className="space-y-2">
        {items.map(([label, value, status]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className={`font-bold tabular-nums ${hubStatusColor(status)}`}>{value ?? 0}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ModuleCard({ label, to }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-900"
    >
      {label}
      <ArrowRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}

export default function ProductionDashboard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hub, setHub] = useState({});

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await getProductionHub();
      if (res?.data) setHub(res.data);
      else setHub({});
    } catch (err) {
      if (!isRefresh) {
        addToast("Failed to load production hub", "error");
        setHub({});
      }
      if (isRefresh) throw err;
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);
  useManufacturingRefresh(() => load(true));

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <Loader label="Loading production hub..." />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <ProductionManagerNav />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ui-eyebrow">Operations</p>
          <h2 className="mt-0.5 ui-title">Production Hub</h2>
          <p className="ui-subtitle">
            Planning, schedule, allocation, shop floor, batches, and quality in one control center.
          </p>
        </div>
      </header>

      <ManufacturingWorkflowBar currentStepId="production" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Running Jobs" value={hub.running_jobs} accent icon={Cog} iconWrap="bg-violet-50 text-violet-700" />
        <KpiCard label="Production In Progress" value={hub.production_in_progress} icon={PlayCircle} iconWrap="bg-sky-50 text-sky-700" />
        <KpiCard label="Completed Today" value={hub.production_completed_today} tone="success" icon={CheckCircle2} iconWrap="bg-emerald-50 text-emerald-700" />
        <KpiCard label="Quality Passed" value={hub.quality_passed} tone="success" icon={BadgeCheck} iconWrap="bg-teal-50 text-teal-700" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatusPanel
          title="Machine Status"
          icon={Cpu}
          items={[
            ["Running", hub.machines_running, "running"],
            ["Idle", hub.machines_idle, "idle"],
            ["Down / Maintenance", hub.machines_down, "warning"],
          ]}
        />
        <StatusPanel
          title="Production Status"
          icon={Factory}
          items={[
            ["In Progress", hub.production_in_progress, "running"],
            ["Completed Today", hub.production_completed_today, "ok"],
            ["Running Jobs", hub.running_jobs, "running"],
          ]}
        />
        <StatusPanel
          title="Material Status"
          icon={Package}
          items={[
            ["Available", hub.material_available, "ok"],
            ["Shortages", hub.material_shortages, "warning"],
          ]}
        />
        <StatusPanel
          title="Operator Status"
          icon={Users}
          items={[
            ["Present", hub.operators_present, "ok"],
            ["Absent", hub.operators_absent, "warning"],
          ]}
        />
        <StatusPanel
          title="Quality Status"
          icon={CheckCircle2}
          items={[
            ["Passed", hub.quality_passed, "ok"],
            ["Failed", hub.quality_failed, "warning"],
          ]}
        />
        <section className="ui-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Quick Module Access
          </h3>
          <div className="grid gap-2">
            {HUB_MODULES.map((m) => (
              <ModuleCard key={m.to} label={m.label} to={m.to} />
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ui-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Running Jobs</h3>
            <Link to="/production/work-orders" className="text-xs font-semibold text-teal-700 hover:underline">
              View all
            </Link>
          </div>
          {(hub.recent_jobs || []).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No running jobs right now.</p>
          ) : (
            <div className="space-y-2">
              {(hub.recent_jobs || []).map((j) => (
                <div
                  key={j.work_order_number}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{j.work_order_number}</p>
                    <p className="text-xs text-slate-500">
                      {j.product} · {j.machine}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold tabular-nums text-teal-800">{j.progress_pct}%</p>
                    <p className="text-[10px] capitalize text-slate-500">{j.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ui-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Machine Status</h3>
            <Link to="/production/machines" className="text-xs font-semibold text-teal-700 hover:underline">
              View all
            </Link>
          </div>
          {(hub.machine_status || []).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No machine data available.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(hub.machine_status || []).map((m) => (
                <div key={m.code} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-xs font-bold text-slate-800">{m.name}</p>
                  <p className="text-[10px] capitalize text-slate-500">{m.status}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Module integration flow</p>
        <div className="flex flex-wrap items-center gap-2">
          {HUB_FLOW.map((step, i) => (
            <span key={step} className="flex items-center gap-2 text-xs text-slate-600">
              <span className="rounded-md bg-white px-2 py-1 font-semibold text-teal-800 ring-1 ring-slate-200">{step}</span>
              {i < HUB_FLOW.length - 1 ? <ArrowRight className="h-3 w-3 text-slate-300" aria-hidden /> : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
