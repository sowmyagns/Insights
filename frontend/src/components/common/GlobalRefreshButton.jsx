import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";

import { useToast } from "../../context/ToastContext";
import {
  emitPageRefreshEvent,
  runPageRefresh,
} from "../../utils/pageRefresh";

/**
 * Fixed bottom-right refresh control for the ERP shell.
 * Re-fetches registered page API loaders (not a full browser reload).
 */
export default function GlobalRefreshButton({ offsetForChat = false }) {
  const { addToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    const started = Date.now();

    try {
      // Notify optional listeners; registered handlers below are the source of truth.
      emitPageRefreshEvent({ source: "global-refresh" });

      const { count } = await runPageRefresh();
      if (count === 0) {
        // Page has no registered loader yet — avoid a hard browser reload.
        addToast("This page has nothing to refresh yet.", "error");
      }

      const elapsed = Date.now() - started;
      if (elapsed < 400) {
        await new Promise((r) => setTimeout(r, 400 - elapsed));
      }
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to refresh page data. Please try again.";
      addToast(typeof message === "string" ? message : "Failed to refresh page data.", "error");
    } finally {
      setRefreshing(false);
    }
  }, [addToast, refreshing]);

  return (
    <div
      className={`pointer-events-none fixed right-5 z-[90] sm:right-6 ${
        offsetForChat ? "bottom-24 sm:bottom-28" : "bottom-5 sm:bottom-6"
      }`}
    >
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        title="Refresh"
        aria-label="Refresh page data"
        aria-busy={refreshing}
        className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200/90 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_6px_18px_rgba(15,23,42,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195CCF]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        <RefreshCw
          className={`h-5 w-5 text-[#195CCF] dark:text-sky-400 ${refreshing ? "animate-spin" : ""}`}
          aria-hidden
        />
      </button>
    </div>
  );
}
