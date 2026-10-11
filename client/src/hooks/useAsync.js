import { useCallback, useEffect, useState } from 'react';

/** Runs an async loader when `deps` change. Returns { data, error, status, reload }. */
export function useAsync(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, status: 'loading' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    loader()
      .then((data) => !cancelled && setState({ data, error: null, status: 'success' }))
      .catch((error) => !cancelled && setState({ data: null, error, status: 'error' }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
