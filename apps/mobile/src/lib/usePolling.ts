import { useCallback, useEffect, useRef } from 'react';

/**
 * Runs `load` straight away and then every `everyMs` milliseconds, so a
 * screen keeps showing the latest state without the user pulling to refresh.
 * Returns a function that reloads immediately.
 */
export function usePolling(load: () => Promise<void> | void, everyMs = 4000) {
  const latest = useRef(load);
  latest.current = load;

  useEffect(() => {
    latest.current();
    const timer = setInterval(() => latest.current(), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);

  return useCallback(() => latest.current(), []);
}
