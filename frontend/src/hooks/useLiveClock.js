import { useEffect, useMemo, useState } from "react";

import { formatHeaderDateTime } from "../utils/headerDateTime";

/** Live clock labels for the app header — refreshes every second. */
export default function useLiveClock(timeZone) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => formatHeaderDateTime(now, timeZone), [now, timeZone]);
}
