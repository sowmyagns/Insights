import { Link } from "react-router-dom";
import { FileBarChart2, Scale, BookOpen, Landmark } from "lucide-react";

const REPORTS = [
  { to: "/accounts/profit-loss", label: "Profit & Loss Report", icon: FileBarChart2 },
  { to: "/accounts/balance-sheet", label: "Balance Sheet", icon: Scale },
  { to: "/accounts/trial-balance", label: "Trial Balance", icon: BookOpen },
  { to: "/accounts/chart-of-accounts", label: "Chart of Accounts", icon: Landmark },
  { to: "/accounts/tax-reports", label: "GST / Tax Reports", icon: FileBarChart2 },
];

export default function AccountingReports() {
  return (
    <div className="space-y-4 p-6">
      <p className="text-sm text-slate-500">Open a report from the list below.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.to}
              to={r.to}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#0f6d84]"
            >
              <Icon className="h-5 w-5 text-slate-500" />
              <span className="font-semibold text-slate-800">{r.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
