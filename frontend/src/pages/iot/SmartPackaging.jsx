import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Package, ArrowLeft } from "lucide-react";
import Loader from "../../components/common/Loader";
import { getSmartPackaging } from "../../api/iotApi";
import useTenantId from "../../hooks/useTenantId";



export default function SmartPackaging() {
  const tenantId = useTenantId();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    getSmartPackaging(tenantId)
      .then((res) => setData(res.data))
      .catch((e) => console.error("Smart packaging load failed", e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading smart packaging..." />;

  const { enabled = false, stations = [], function: fn } = data || {};

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
            <Package className="h-8 w-8 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-slate-600 dark:text-slate-400">
              {fn || "Effective packaging solution for products"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/95 p-5 shadow-sm">
        <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
        <p
          className={`mt-1 text-xl font-bold ${
            enabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"
          }`}
        >
          {enabled ? "Enabled" : "Disabled"}
        </p>
      </div>

      {stations?.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/95 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200/80 dark:border-slate-700/80 px-6 py-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Packaging stations</h2>
          </div>
          <div className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
            {stations.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <span className="font-medium text-slate-900 dark:text-white">
                  {s.location}
                </span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    s.status === "active"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}