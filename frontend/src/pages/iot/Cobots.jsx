import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, ArrowLeft } from "lucide-react";
import Loader from "../../components/common/Loader";
import { getCobots } from "../../api/iotApi";
import useTenantId from "../../hooks/useTenantId";



export default function Cobots() {
  const tenantId = useTenantId();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    getCobots(tenantId)
      .then((res) => setData(res.data))
      .catch((e) => console.error("Cobots load failed", e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading cobots..." />;

  const { cobots = [], total = 0, active = 0 } = data || {};

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          to="/iot"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-100 dark:bg-teal-900/30 p-3">
            <Bot className="h-8 w-8 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-slate-600 dark:text-slate-400">
              Collaborative material handling
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/95 p-5 shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total cobots</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{total}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/95 p-5 shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {active}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cobots.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/95 p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 dark:text-white">
                {c.name}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  c.status === "working"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {c.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {c.current_task || "Idle"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}