import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Runs a service call with a pending flag and toast feedback.
 *
 *   const [run, pending] = useAsyncAction();
 *   run(() => createEmployee(values), { success: 'Employee created' });
 *
 * Errors are shown as a toast and re-thrown only when `rethrow` is set,
 * so forms can map field errors.
 */
export function useAsyncAction() {
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  const run = useCallback(async (action, { success, error, rethrow = false } = {}) => {
    if (busy.current) return undefined;
    busy.current = true;
    setPending(true);
    try {
      const result = await action();
      if (success) toast.success(typeof success === 'function' ? success(result) : success);
      return result;
    } catch (err) {
      toast.error(error ?? err?.message ?? 'Something went wrong. Please try again.');
      if (rethrow) throw err;
      return undefined;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, []);

  return [run, pending];
}
