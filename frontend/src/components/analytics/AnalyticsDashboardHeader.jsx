import { Clock } from "lucide-react";

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/**
 * Analytics toolbar only — page title is shown in the global Navbar (AppPageTitle).
 * Refresh is handled by the global bottom-right Refresh control.
 */
export default function AnalyticsDashboardHeader({
  title: _title,
  subtitle,
  lastUpdated,
  onRefresh: _onRefresh,
  autoRefresh,
  onAutoRefreshChange,
  loading: _loading,
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {subtitle ? <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        {lastUpdated ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" /> Last updated: {formatTime(lastUpdated)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => onAutoRefreshChange?.(e.target.checked)}
            className="rounded border-slate-300"
          />
          Auto refresh (60s)
        </label>
      </div>
    </header>
  );
}
