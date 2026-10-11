import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Filter state stored in the URL query string, so filtered views can be
 * linked to (dashboard KPI cards) and survive a refresh.
 *
 *   const [filters, setFilter, resetFilters] = useQueryState({ status: '', q: '' });
 */
export function useQueryState(defaults) {
  const [params, setParams] = useSearchParams();
  const defaultsKey = JSON.stringify(defaults);

  const values = useMemo(() => {
    const base = JSON.parse(defaultsKey);
    return Object.fromEntries(Object.keys(base).map((key) => [key, params.get(key) ?? base[key]]));
  }, [params, defaultsKey]);

  const setValue = useCallback(
    (keyOrPatch, value) => {
      const patch = typeof keyOrPatch === 'string' ? { [keyOrPatch]: value } : keyOrPatch;
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(patch).forEach(([k, v]) => {
            if (v === '' || v === null || v === undefined) next.delete(k);
            else next.set(k, v);
          });
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const reset = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);

  const base = JSON.parse(defaultsKey);
  const isFiltered = Object.keys(base).some((k) => values[k] !== base[k]);

  return [values, setValue, reset, isFiltered];
}
