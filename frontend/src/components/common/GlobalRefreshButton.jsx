import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Fixed bottom-right refresh control for the ERP shell.
 * Performs a full whole-page browser reload (window.location.reload()).
 */
export default function GlobalRefreshButton({ offsetForChat = false }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }, [refreshing]);

  return (
    <div
      className={`pointer-events-none fixed right-5 z-[90] flex flex-col items-end gap-2 sm:right-6 ${
        offsetForChat ? "bottom-24 sm:bottom-28" : "bottom-5 sm:bottom-6"
      }`}
    >
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        title={refreshing ? "Refreshing page…" : "Refresh whole page"}
        aria-label="Refresh whole page"
        aria-busy={refreshing}
        className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-300/80 bg-white text-slate-700 shadow-lg transition-all duration-200 hover:scale-105 hover:border-teal-600 hover:bg-slate-50 hover:text-[var(--color-success)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-400 dark:hover:text-teal-400"
      >
        <RefreshCw
          className={`h-5 w-5 ${refreshing ? "animate-spin text-teal-600 dark:text-teal-400" : ""}`}
          aria-hidden
        />
      </button>
    </div>
  );
}
