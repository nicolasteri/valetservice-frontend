// dashboard_airbags.js
// Reusable safety utilities for ValetService Dashboard
// Drop this file into your project (e.g., src/utils/dashboard_airbags.js)

export const DEFAULT_COUNTERS = { nowCount: 0, outCount: 0, totalToday: 0, overnightCount: 0 };

/**
 * Hook that provides:
 *  - countersLive state with safe defaults
 *  - prevCountersRef that always stores the last valid counters
 *  - getCountersSafe() to read counters safely anywhere (render + handlers)
 *  - applyCountersFromResponse(res) to update counters only when payload is valid
 *
 * Usage in Dashboard.js:
 *   import { useCountersAirbag, DEFAULT_COUNTERS } from "@/utils/dashboard_airbags";
 *   const { countersLive, setCountersLive, prevCountersRef, getCountersSafe, applyCountersFromResponse } = useCountersAirbag(React);
 *
 *   // In render:
 *   const counters = getCountersSafe();
 *
 *   // After fetching counters:
 *   const ok = applyCountersFromResponse(resCounters);
 *   if (!ok) console.warn("[counters] not updated");
 */
export function useCountersAirbag(React) {
  const [countersLive, setCountersLive] = React.useState(DEFAULT_COUNTERS);
  const prevCountersRef = React.useRef(DEFAULT_COUNTERS);

  React.useEffect(() => {
    if (countersLive && typeof countersLive === "object") {
      prevCountersRef.current = countersLive;
    }
  }, [countersLive]);

  const getCountersSafe = React.useCallback(() => {
    const c = countersLive;
    if (c && Number.isFinite(c.nowCount)) return c;
    return prevCountersRef.current || DEFAULT_COUNTERS;
  }, [countersLive]);

  const applyCountersFromResponse = React.useCallback((resCounters) => {
    const ok = !!resCounters?.data?.success && typeof resCounters.data === "object";
    if (!ok) return false;
    const d = resCounters.data;
    const next = {
      nowCount:       Number(d.now_count),
      outCount:       Number(d.out_count),
      totalToday:     Number(d.total_today),
      overnightCount: Number(d.overnight_count),
    };
    const allNumbers = Object.values(next).every(Number.isFinite);
    if (!allNumbers) return false;
    setCountersLive(next);
    return true;
  }, [setCountersLive]);

  return { countersLive, setCountersLive, prevCountersRef, getCountersSafe, applyCountersFromResponse };
}