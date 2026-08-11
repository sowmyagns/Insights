/**
 * Shared async page-load helper for module screens.
 * Use with ErrorState / OfflineState / SkeletonTable / EmptyState / NoResultsState.
 *
 * Example:
 *   const { loading, error, data, reload, online } = useAsyncResource(fetcher, []);
 */
import { useCallback, useEffect, useState } from "react";

import { useNetworkStatus } from "../context/NetworkStatusContext";
import usePageRefresh from "./usePageRefresh";

export default function useAsyncResource(fetcher, deps = []) {
  const { online, markRequestStart, markRequestEnd, registerRetry } = useNetworkStatus();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    markRequestStart();
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : !navigator.onLine
            ? "You appear to be offline."
            : "Failed to load data. Please try again."
      );
      throw err;
    } finally {
      markRequestEnd();
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  useEffect(() => registerRetry(reload), [registerRetry, reload]);
  usePageRefresh(reload);

  return {
    loading,
    error,
    data,
    setData,
    reload,
    online,
    isOfflineError: Boolean(error) && !online,
  };
}
