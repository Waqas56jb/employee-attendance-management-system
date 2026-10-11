import { useEffect, useState } from 'react';

/**
 * Returns the current Date, refreshed every `intervalMs`. Pass `enabled=false`
 * to stop ticking (e.g. when no shift is active).
 */
export function useNow(intervalMs = 1000, enabled = true) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return undefined;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);

  return now;
}
