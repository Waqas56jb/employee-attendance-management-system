import { useCallback, useEffect, useState } from 'react';
import { readJSON, storageKey, writeJSON } from '../utils/storage';

/**
 * useState that persists to LocalStorage (namespaced) and stays in sync
 * across browser tabs via the `storage` event.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readJSON(key, initialValue));

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        writeJSON(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === storageKey(key)) setValue(readJSON(key, initialValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // initialValue is intentionally excluded: callers pass literals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, update];
}
