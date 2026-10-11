import { useCallback, useState } from 'react';

/**
 * Per-browser UI preferences (collapsed sidebar, remembered filters).
 * Never used for business data — that lives in the demo database service.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initialValue : JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  const update = useCallback(
    (next) => {
      setValue((current) => {
        const resolved = typeof next === 'function' ? next(current) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage blocked: keep the in-memory value.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update];
}
