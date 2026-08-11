import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Watch,
  Cpu,
  Radio,
  Bot,
  Truck,
  Plane,
  Package,
  Eye,
} from "lucide-react";
import Loader from "../../components/common/Loader";
import { getIotDashboard } from "../../api/iotApi";
import useTenantId from "../../hooks/useTenantId";



const cardStyle =
  "rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/95 p-5 shadow-sm hover:shadow-md transition-shadow";

export default function IotDashboard() {
  const tenantId = useTenantId();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    getIotDashboard(tenantId)
      .then((res) => setData(res.data))
      .catch((e) => console.error("IoT dashboard load failed", e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading IoT dashboard..." />;

  const dash = data || {};

  const cards = [
    {
      key: "wearables",
      icon: Watch,
      to: "/iot/wearables",
      count: dash.wearables?.active ?? 0,
      total: dash.wearables?.count ?? 0,
      label: t("nav.wearables"),
      sub: dash.wearables?.function || "Collect data from multiple sources",
    },
    {
      key: "sensors",
      icon: Radio,
      to: "/iot/sensors",
      count: dash.sensors?.active ?? 0,
      total: dash.sensors?.count ?? 0,
      label: t("nav.iotSensors"),
      sub: dash.sensors?.function || "Supply chain & machine monitoring",
    },
    {
      key: "cobots",
      icon: Bot,
      to: "/iot/cobots",
      count: dash.cobots?.active ?? 0,
      total: dash.cobots?.count ?? 0,
      label: t("nav.cobots"),
      sub: dash.cobots?.function || "Collaborative material handling",
    },
    {
      key: "agvs",
      icon: Truck,
      to: "/iot/agvs",
      count: dash.agvs?.active ?? 0,
      total: dash.agvs?.count ?? 0,
      label: t("nav.agvs"),
      sub: dash.agvs?.function || "Easy navigation & transport",
    },
    {
      key: "drones",
      icon: Plane,
      to: "/iot/drones",
      count: dash.drones?.active ?? 0,
      total: dash.drones?.count ?? 0,
      label: t("nav.drones"),
      sub: dash.drones?.function || "Monitor live operational working",
    },
    {
      key: "machine_analytics",
      icon: Cpu,
      to: "/iot/machine-analytics",
      count: dash.machine_analytics?.machines_running ?? 0,
      total: dash.machine_analytics?.machines_total ?? 0,
      label: t("nav.machineAnalytics"),
      sub: "Predictive maintenance & inventory streamlining",
    },
    {
      key: "smart_packaging",
      icon: Package,
      to: "/iot/smart-packaging",
      count: dash.smart_packaging?.enabled ? 1 : 0,
      total: 1,
      label: t("nav.smartPackaging"),
      sub: dash.smart_packaging?.function || "Effective packaging solution",
    },
    {
      key: "computer_vision",
      icon: Eye,
      to: null,
      count: dash.computer_vision?.enabled ? 1 : 0,
      total: 1,
      label: t("nav.computerVision"),
      sub: dash.computer_vision?.function || "Quality & process monitoring",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {t("iot.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const content = (
            <div className={`${cardStyle} ${c.to ? "cursor-pointer" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-teal-100 dark:bg-teal-900/30 p-2.5">
                  <Icon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {c.count}/{c.total}
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
                {c.label}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {c.sub}
              </p>
            </div>
          );
          return c.to ? (
            <Link key={c.key} to={c.to}>
              {content}
            </Link>
          ) : (
            <div key={c.key}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}