import { useEffect, useState } from "react";
import { Activity, Cpu, ClipboardList } from "lucide-react";
import Loader from "../../components/common/Loader";
import { getLiveOperations } from "../../api/iotApi";
import useTenantId from "../../hooks/useTenantId";



export default function LiveOperations() {
  const tenantId = useTenantId();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    getLiveOperations(tenantId)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading live operations..." />;
  if (!data) return <div>Failed to load live operations</div>;

  const machines = data.machines || [];
  const workOrders = data.active_work_orders || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-7 w-7 text-teal-500" />
        <div>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5">
            Machine status & work orders for AR/computer vision overlay
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="h-5 w-5 text-teal-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Machines
            </h3>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {machines.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No machines</p>
            ) : (
              machines.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <span className="font-medium text-slate-900 dark:text-white">
                    {m.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {m.location}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      m.status === "running"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-5 w-5 text-teal-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Active Work Orders
            </h3>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {workOrders.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No active work orders</p>
            ) : (
              workOrders.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <span className="font-medium text-slate-900 dark:text-white">
                    {w.number}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      w.status === "in_progress"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {w.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}