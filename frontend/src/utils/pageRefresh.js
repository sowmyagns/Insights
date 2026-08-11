/**
 * Registry for the global bottom-right Refresh control.
 * Pages register their data reload functions; the button awaits them.
 */

const handlers = new Map();
let nextId = 1;

/**
 * @param {() => void | Promise<void>} handler
 * @returns {() => void} unsubscribe
 */
export function registerPageRefreshHandler(handler) {
  if (typeof handler !== "function") return () => {};
  const id = nextId++;
  handlers.set(id, handler);
  return () => {
    handlers.delete(id);
  };
}

export function getPageRefreshHandlerCount() {
  return handlers.size;
}

/**
 * Run all registered page refresh handlers in parallel.
 * Rejects if any handler throws (existing page data should remain).
 */
export async function runPageRefresh() {
  const list = [...handlers.values()];
  if (!list.length) {
    return { count: 0 };
  }

  const results = await Promise.allSettled(
    list.map((fn) => Promise.resolve().then(() => fn()))
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length) {
    const reason = failed[0].reason;
    const message =
      reason?.response?.data?.detail ||
      reason?.response?.data?.message ||
      reason?.message ||
      "Failed to refresh page data. Please try again.";
    const err = reason instanceof Error ? reason : new Error(String(message));
    if (!(reason instanceof Error)) err.message = String(message);
    throw err;
  }

  return { count: list.length };
}

export const PAGE_REFRESH_EVENT = "gns:page-refresh";

/** Notify any legacy listeners; prefer registerPageRefreshHandler for awaitable refresh. */
export function emitPageRefreshEvent(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PAGE_REFRESH_EVENT, { detail }));
}
