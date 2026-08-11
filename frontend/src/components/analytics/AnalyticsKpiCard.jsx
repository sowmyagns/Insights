import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { changeArrow, changeColor, formatKpiValue } from "../../data/analyticsMasterData";

export default function AnalyticsKpiCard({ kpi, icon: Icon, onClick, active }) {
  if (!kpi) return null;
  const pct = kpi.change_pct;
  const isUp = pct > 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <button
      type="button"
      onClick={() => onClick?.(kpi)}
      className={`w-full rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md dark:bg-slate-800 ${
        active ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800" : "border-slate-200 dark:border-slate-700"
      } bg-white`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatKpiValue(kpi)}</p>
          {pct != null && (
            <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${changeColor(pct)}`}>
              <TrendIcon className="h-3 w-3" />
              {changeArrow(pct)} {Math.abs(pct)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </div>
        )}
      </div>
      {onClick && (
        <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">
          Drill down <ChevronRight className="h-3 w-3" />
        </p>
      )}
    </button>
  );
}
