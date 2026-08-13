import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  emitPageRefreshEvent,
  playPageRefreshBlink,
  runPageRefresh,
} from "../../utils/pageRefresh";

const SUCCESS_TTL_MS = 2800;
const ERROR_TTL_MS = 4200;
const MIN_SPIN_MS = 400;

/**
 * Fixed bottom-right refresh control for the ERP shell.
 * Re-fetches registered page API loaders (not a full browser reload).
 */
export default function GlobalRefreshButton({ offsetForChat = false }) {
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success" | "error", message }
  const statusTimerRef = useRef(null);
  const inFlightRef = useRef(false);

  const clearStatusTimer = useCallback(() => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  }, []);

  const showStatus = useCallback(
    (type, message, ttl) => {
      clearStatusTimer();
      setStatus({ type, message });
      statusTimerRef.current = setTimeout(() => {
        setStatus(null);
        statusTimerRef.current = null;
      }, ttl);
    },
    [clearStatusTimer]
  );

  useEffect(() => () => clearStatusTimer(), [clearStatusTimer]);

  const handleRefresh = useCallback(async () => {
    if (inFlightRef.current || refreshing) return;
    inFlightRef.current = true;
    clearStatusTimer();
    setStatus(null);
    setRefreshing(true);
    const started = Date.now();

    try {
      // Soft one-shot page fade (visual only) while API handlers re-fetch.
      playPageRefreshBlink();

      // Notify optional listeners; registered handlers below are the source of truth.
      emitPageRefreshEvent({ source: "global-refresh" });

      const { count } = await runPageRefresh();
      const elapsed = Date.now() - started;
      if (elapsed < MIN_SPIN_MS) {
        await new Promise((r) => setTimeout(r, MIN_SPIN_MS - elapsed));
      }

      if (count === 0) {
        showStatus("error", "This page has nothing to refresh yet.", ERROR_TTL_MS);
      } else {
        showStatus("success", "Updated just now", SUCCESS_TTL_MS);
      }
    } catch {
      const elapsed = Date.now() - started;
      if (elapsed < MIN_SPIN_MS) {
        await new Promise((r) => setTimeout(r, MIN_SPIN_MS - elapsed));
      }
      showStatus("error", "Failed to refresh. Please try again.", ERROR_TTL_MS);
    } finally {
      setRefreshing(false);
      inFlightRef.current = false;
    }
  }, [clearStatusTimer, refreshing, showStatus]);

  const statusTone =
    status?.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/80 dark:text-emerald-200"
      : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/80 dark:text-rose-200";

  return (
    <div
      className={`pointer-events-none fixed right-5 z-[90] flex flex-col items-end gap-2 sm:right-6 ${
        offsetForChat ? "bottom-24 sm:bottom-28" : "bottom-5 sm:bottom-6"
      }`}
    >
      {status ? (
        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none max-w-[220px] rounded-lg border px-3 py-1.5 text-xs font-medium shadow-md transition-opacity ${statusTone}`}
        >
          {status.message}
        </div>
      ) : null}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        title={refreshing ? "Refreshing…" : "Refresh"}
        aria-label="Refresh page data"
        aria-busy={refreshing}
        className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:bg-[var(--color-surface-muted)] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
      >
        <RefreshCw
          className={`h-5 w-5 text-[var(--color-primary)] ${refreshing ? "animate-spin" : ""}`}
          aria-hidden
        />
      </button>
    </div>
  );
}
