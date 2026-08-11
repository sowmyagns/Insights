import { useEffect, useRef } from "react";

import { registerPageRefreshHandler } from "../utils/pageRefresh";

/**
 * Register a page data reload with the global Refresh button.
 * Prefer soft reloads that keep existing UI data until new data arrives.
 *
 * @param {() => void | Promise<void>} onRefresh
 */
export default function usePageRefresh(onRefresh) {
  const ref = useRef(onRefresh);
  ref.current = onRefresh;

  useEffect(() => {
    if (!onRefresh) return undefined;
    return registerPageRefreshHandler(() => ref.current?.());
  }, [onRefresh]);
}
