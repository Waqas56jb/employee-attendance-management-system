import { useMemo } from 'react';
import { z } from 'zod';
import { useBusiness } from '../../hooks/useBusiness';
import { useNow } from '../../hooks/useNow';
import { ATTENDANCE_STATUS_OPTIONS } from '../../services/attendanceService';
import { displayAttendanceStatus, elapsedMinutes, getBillableMinutes, isShiftOpen } from '../../utils/calculations';
import { formatDate, formatDateTime, isInDateRange, toDate } from '../../utils/dateUtils';
import { formatHours } from '../../utils/formatters';

/** Current time plus the working-hours thresholds used by status rules. */
export function useAttendanceRules(intervalMs = 30000) {
  const { workingHours } = useBusiness();
  const now = useNow(intervalMs);
  return useMemo(
    () => ({
      now,
      openShiftAlertHours: workingHours?.openShiftAlertHours ?? 14,
      reviewShiftsOverHours: workingHours?.reviewShiftsOverHours ?? 12,
      expectedDailyHours: workingHours?.expectedDailyHours ?? 8,
      defaultBreakMinutes: workingHours?.defaultBreakMinutes ?? 0,
    }),
    [now, workingHours],
  );
}

export const ATTENDANCE_FILTER_STATUS_OPTIONS = [...ATTENDANCE_STATUS_OPTIONS, { value: 'missing_checkout', label: 'Missing check-out' }];

export const SHIFT_OPTIONS = [
  { value: 'active', label: 'Open shifts' },
  { value: 'completed', label: 'Completed shifts' },
];

export const SOURCE_LABELS = {
  employee_app: 'Employee app',
  admin: 'Administrator (manual entry)',
};

export const ATTENDANCE_FILTER_DEFAULTS = { q: '', from: '', to: '', customer: '', project: '', status: '', shift: '', employee: '' };

/** Duration shown for a record: recorded minutes, or live elapsed minutes for an open shift. */
export function liveDuration(record, now) {
  if (isShiftOpen(record)) return elapsedMinutes(record.checkInAt, now);
  return record.recordedDurationMinutes ?? null;
}

export function isBillableAdjusted(record) {
  return (
    record.billableDurationMinutes !== null &&
    record.billableDurationMinutes !== undefined &&
    record.billableDurationMinutes !== record.recordedDurationMinutes
  );
}

/** AND-combines all list filters. */
export function filterAttendance(records, f, { employeesById, customersById, projectsById, rules }) {
  const q = f.q.trim().toLowerCase();
  return records.filter((r) => {
    if (f.employee && r.employeeId !== f.employee) return false;
    if (f.customer && r.customerId !== f.customer) return false;
    if (f.project && r.projectId !== f.project) return false;
    if ((f.from || f.to) && !isInDateRange(r.checkInAt, f.from, f.to)) return false;
    if (f.shift === 'active' && !isShiftOpen(r)) return false;
    if (f.shift === 'completed' && (!r.checkOutAt || r.status === 'cancelled')) return false;
    if (f.status && displayAttendanceStatus(r, rules) !== f.status) return false;
    if (q) {
      const employee = employeesById[r.employeeId];
      const haystack = [employee?.fullName, employee?.employeeNumber, customersById[r.customerId]?.companyName, projectsById[r.projectId]?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function attendanceCsvColumns({ employeesById, customersById, projectsById }, rules) {
  return [
    { header: 'Record ID', value: (r) => r.id },
    { header: 'Employee', value: (r) => employeesById[r.employeeId]?.fullName ?? '' },
    { header: 'Employee ID', value: (r) => employeesById[r.employeeId]?.employeeNumber ?? '' },
    { header: 'Date', value: (r) => formatDate(r.checkInAt, 'yyyy-MM-dd') },
    { header: 'Customer', value: (r) => customersById[r.customerId]?.companyName ?? '' },
    { header: 'Project', value: (r) => projectsById[r.projectId]?.name ?? '' },
    { header: 'Check-in', value: (r) => formatDateTime(r.checkInAt) },
    { header: 'Check-out', value: (r) => (r.checkOutAt ? formatDateTime(r.checkOutAt) : '') },
    { header: 'Recorded hours', value: (r) => (r.recordedDurationMinutes ? formatHours(r.recordedDurationMinutes) : '') },
    { header: 'Billable hours', value: (r) => (r.checkOutAt ? formatHours(getBillableMinutes(r)) : '') },
    { header: 'Status', value: (r) => displayAttendanceStatus(r, rules) },
    { header: 'Source', value: (r) => SOURCE_LABELS[r.source] ?? r.source ?? '' },
    { header: 'Check-in note', value: (r) => r.checkInNote ?? '' },
    { header: 'Check-out note', value: (r) => r.checkOutNote ?? '' },
    { header: 'Last updated', value: (r) => formatDateTime(r.updatedAt) },
  ];
}

/** Projects of a customer as select options (archived ones only when already selected). */
export function projectOptionsFor(projects, customerId, keepId) {
  if (!customerId) return [];
  return projects
    .filter((p) => p.customerId === customerId && (p.status !== 'archived' || p.id === keepId))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ value: p.id, label: `${p.name} (${p.projectNumber})${p.status !== 'active' ? ` · ${p.status.replace('_', ' ')}` : ''}` }));
}

export function customerOptions(customers, keepId) {
  return customers
    .filter((c) => c.status !== 'archived' || c.id === keepId)
    .sort((a, b) => a.companyName.localeCompare(b.companyName))
    .map((c) => ({ value: c.id, label: c.companyName }));
}

/** Minutes between two datetime-local values, or null. */
export function previewMinutes(checkInInput, checkOutInput) {
  const a = toDate(checkInInput ? new Date(checkInInput) : null);
  const b = toDate(checkOutInput ? new Date(checkOutInput) : null);
  if (!a || !b) return null;
  const minutes = Math.floor((b.getTime() - a.getTime()) / 60000);
  return minutes > 0 ? minutes : null;
}

const optionalNote = z.string().trim().max(500, 'This text is too long.').optional().or(z.literal(''));

/** Manual entry: same rules as a correction, plus the employee. */
export const manualAttendanceSchema = z
  .object({
    employeeId: z.string().min(1, 'Select an employee.'),
    customerId: z.string().min(1, 'Select a customer.'),
    projectId: z.string().min(1, 'Select a project.'),
    checkInAt: z.string().min(1, 'Check-in time is required.'),
    checkOutAt: z.string().optional().or(z.literal('')),
    checkInNote: optionalNote,
    checkOutNote: optionalNote,
    reason: z.string().trim().min(5, 'Describe the reason in at least 5 characters.').max(500, 'This text is too long.'),
  })
  .refine((v) => !v.checkOutAt || new Date(v.checkOutAt) > new Date(v.checkInAt), {
    path: ['checkOutAt'],
    message: 'Check-out must be after check-in.',
  });
