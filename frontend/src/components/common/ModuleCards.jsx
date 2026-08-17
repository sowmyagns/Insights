import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Factory,
  Package,
  ShoppingCart,
  DollarSign,
  CheckCircle,
  Wrench,
  BarChart3,
  Radio,
  ArrowUpRight,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { userCanAccess } from "../../config/permissions";

const modules = [
  { labelKey: "nav.productionManagement", to: "/production/planning", icon: Factory, module: "production", color: "text-teal-600 bg-[var(--color-success-soft)] dark:bg-teal-900/30" },
  { labelKey: "nav.inventoryManagement", to: "/inventory", icon: Package, module: "inventory", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30" },
  { labelKey: "nav.procurementManagement", to: "/procurement/purchase-orders", icon: ShoppingCart, module: "procurement", color: "text-violet-600 bg-violet-50 dark:bg-violet-900/30" },
  { labelKey: "nav.sales", to: "/sales/orders", icon: DollarSign, module: "sales", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30" },
  { labelKey: "nav.accountsReports", to: "/accounts", icon: DollarSign, module: "accounts", color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30" },
  { labelKey: "nav.qualityControl", to: "/quality/inspection", icon: CheckCircle, module: "quality", color: "text-green-600 bg-green-50 dark:bg-green-900/30" },
  { labelKey: "nav.maintenance", to: "/maintenance/machines", icon: Wrench, module: "maintenance", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30" },
  { labelKey: "nav.analytics", to: "/analytics/production", icon: BarChart3, module: "analytics", color: "text-sky-600 bg-sky-50 dark:bg-sky-900/30" },
  { labelKey: "nav.iotSmartFactory", to: "/iot", icon: Radio, module: "iot", color: "text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/30" },
];

export default function ModuleCards() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const visible = modules.filter((m) => userCanAccess(user, m.module));

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {visible.map((m) => {
        const Icon = m.icon;
        return (
          <Link
            key={m.to}
            to={m.to}
            className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:border-teal-300 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-800/50 dark:hover:border-teal-600"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${m.color}`}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
              {t(m.labelKey)}
            </span>
            <ArrowUpRight
              className="h-4 w-4 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100 group-hover:text-teal-600"
              aria-hidden
            />
          </Link>
        );
      })}
    </div>
  );
}
