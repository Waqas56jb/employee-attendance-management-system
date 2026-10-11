import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAssignments } from '../hooks/useAssignments';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import * as attendanceService from '../services/attendanceService';
import { ERROR_CODES, ServiceError } from '../services/errors';
import { ATTENDANCE_STATUS } from '../utils/dateUtils';
import { formatDuration } from '../utils/formatters';
import { STORAGE_KEYS, storageKey } from '../utils/storage';

export const AttendanceContext = createContext(null);

/**
 * The employee's attendance records and the check-in / check-out actions.
 * The active shift is derived from the stored records, so the live timer
 * survives page refreshes (it is always computed from checkInAt).
 */
export function AttendanceProvider({ children }) {
  const { employee, handleAuthError } = useAuth();
  const { projectsById, customersById } = useAssignments();
  const { notify } = useNotifications();
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('idle');
  const [submitting, setSubmitting] = useState(null); // 'check-in' | 'check-out' | null
  const lock = useRef(false);

  const employeeId = employee?.id;

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!employeeId) return;
      if (!silent) setStatus('loading');
      try {
        setRecords(await attendanceService.getMyAttendance());
        setStatus('ready');
      } catch (error) {
        if (!handleAuthError(error)) setStatus('error');
      }
    },
    [employeeId, handleAuthError],
  );

  useEffect(() => {
    if (employeeId) load();
    else {
      setRecords([]);
      setStatus('idle');
    }
  }, [employeeId, load]);

  // Keep several open tabs consistent (e.g. checking out in another tab).
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === storageKey(STORAGE_KEYS.attendance)) load({ silent: true });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [load]);

  const activeShift = useMemo(() => records.find((r) => r.status === ATTENDANCE_STATUS.ACTIVE) ?? null, [records]);

  const runExclusive = useCallback(
    async (name, action) => {
      if (lock.current) {
        throw new ServiceError('Please wait — your previous request is still being processed.', ERROR_CODES.CONFLICT, 409);
      }
      lock.current = true;
      setSubmitting(name);
      try {
        return await action();
      } catch (error) {
        handleAuthError(error);
        if (error?.code === ERROR_CODES.CONFLICT) load({ silent: true });
        throw error;
      } finally {
        lock.current = false;
        setSubmitting(null);
      }
    },
    [handleAuthError, load],
  );

  const checkIn = useCallback(
    (payload) =>
      runExclusive('check-in', async () => {
        if (activeShift) {
          throw new ServiceError('You already have an active shift. Check out before starting a new one.', ERROR_CODES.CONFLICT, 409);
        }
        const record = await attendanceService.checkIn(payload);
        setRecords((prev) => [record, ...prev.filter((r) => r.id !== record.id)]);
        const project = projectsById[record.projectId];
        const customer = customersById[record.customerId];
        notify({
          type: 'shift-confirmation',
          title: 'Shift started',
          message: `Check-in confirmed for ${project?.name ?? 'your project'} at ${customer?.companyName ?? 'the customer'}.`,
          link: '/check-in-out',
        });
        return record;
      }),
    [runExclusive, activeShift, projectsById, customersById, notify],
  );

  const checkOut = useCallback(
    (payload) =>
      runExclusive('check-out', async () => {
        if (!activeShift) {
          throw new ServiceError('There is no active shift to check out from.', ERROR_CODES.CONFLICT, 409);
        }
        const record = await attendanceService.checkOut({ ...payload, recordId: activeShift.id });
        setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
        const project = projectsById[record.projectId];
        const customer = customersById[record.customerId];
        notify({
          type: 'check-out',
          title: 'Check-out recorded',
          message: `Your shift on ${project?.name ?? 'your project'} (${customer?.companyName ?? 'customer'}) was recorded: ${formatDuration(record.durationMinutes)}.`,
          link: '/attendance',
        });
        return record;
      }),
    [runExclusive, activeShift, projectsById, customersById, notify],
  );

  const value = useMemo(
    () => ({
      records,
      activeShift,
      status,
      isLoading: status === 'loading' || status === 'idle',
      submitting,
      checkIn,
      checkOut,
      reload: load,
    }),
    [records, activeShift, status, submitting, checkIn, checkOut, load],
  );

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}
