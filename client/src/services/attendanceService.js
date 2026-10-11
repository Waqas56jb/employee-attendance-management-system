import { apiClient } from './apiClient';
import { requireEmployeeId } from './authService';
import { config } from './config';
import { ERROR_CODES, ServiceError } from './errors';
import { createId, getCollection, saveCollection, simulateLatency } from './mockDb';
import { ATTENDANCE_STATUS, minutesBetween, toDate } from '../utils/dateUtils';

/*
 * Attendance rules enforced here (and again by the real backend later):
 *  - one active shift per employee at a time;
 *  - check-out requires that employee's own active shift;
 *  - customer and project are mandatory, the project must be assigned to the
 *    employee, be active, and belong to the selected customer;
 *  - timestamps come from the clock at the moment of the action and are
 *    never edited afterwards.
 */

const MAX_NOTE_LENGTH = 280;

let pendingAction = null; // guards against duplicate submissions from rapid clicks

const byNewest = (a, b) => new Date(b.checkInAt) - new Date(a.checkInAt);

function sanitizeNote(note) {
  return typeof note === 'string' ? note.trim().slice(0, MAX_NOTE_LENGTH) : '';
}

function sanitizeLocation(location) {
  if (!location) return null;
  const { latitude, longitude, accuracy, capturedAt } = location;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
    capturedAt: capturedAt ?? new Date().toISOString(),
  };
}

async function exclusive(name, fn) {
  if (pendingAction) {
    throw new ServiceError('Another attendance action is still being processed. Please wait a moment.', ERROR_CODES.CONFLICT, 409);
  }
  pendingAction = name;
  try {
    return await fn();
  } finally {
    pendingAction = null;
  }
}

export async function getMyAttendance() {
  if (!config.useMockApi) return apiClient.get('/me/attendance');
  const employeeId = requireEmployeeId();
  await simulateLatency(350);
  return getCollection('attendance')
    .filter((r) => r.employeeId === employeeId)
    .sort(byNewest);
}

export function checkIn({ customerId, projectId, note, location }) {
  return exclusive('check-in', async () => {
    if (!config.useMockApi) {
      return apiClient.post('/me/attendance/check-in', { customerId, projectId, note, location: sanitizeLocation(location) });
    }
    const employeeId = requireEmployeeId();
    await simulateLatency(500);

    if (!customerId || !projectId) {
      throw new ServiceError('Select both a customer and a project before checking in.', ERROR_CODES.VALIDATION);
    }

    const rows = getCollection('attendance');
    // Re-read storage right before writing: another tab may have started a shift.
    if (rows.some((r) => r.employeeId === employeeId && r.status === ATTENDANCE_STATUS.ACTIVE)) {
      throw new ServiceError('You already have an active shift. Check out before starting a new one.', ERROR_CODES.CONFLICT, 409);
    }

    const project = getCollection('projects').find((p) => p.id === projectId);
    if (!project || !project.assignedEmployeeIds?.includes(employeeId)) {
      throw new ServiceError('This project is not assigned to you.', ERROR_CODES.VALIDATION);
    }
    if (project.customerId !== customerId) {
      throw new ServiceError('The selected project does not belong to the selected customer.', ERROR_CODES.VALIDATION);
    }
    if (project.status !== 'active') {
      throw new ServiceError('You can only check in to projects that are currently active.', ERROR_CODES.VALIDATION);
    }

    const record = {
      id: createId('att'),
      employeeId,
      customerId,
      projectId,
      checkInAt: new Date().toISOString(),
      checkOutAt: null,
      durationMinutes: null,
      status: ATTENDANCE_STATUS.ACTIVE,
      checkInNote: sanitizeNote(note),
      checkOutNote: '',
      checkInLocation: sanitizeLocation(location),
      checkOutLocation: null,
    };
    saveCollection('attendance', [record, ...rows]);
    return record;
  });
}

export function checkOut({ recordId, note, location }) {
  return exclusive('check-out', async () => {
    if (!config.useMockApi) {
      return apiClient.post('/me/attendance/check-out', { recordId, note, location: sanitizeLocation(location) });
    }
    const employeeId = requireEmployeeId();
    await simulateLatency(500);

    const rows = getCollection('attendance');
    const index = rows.findIndex(
      (r) => r.id === recordId && r.employeeId === employeeId && r.status === ATTENDANCE_STATUS.ACTIVE,
    );
    if (index === -1) {
      throw new ServiceError('There is no active shift to check out from. It may already have been completed.', ERROR_CODES.CONFLICT, 409);
    }

    const record = rows[index];
    const checkInAt = toDate(record.checkInAt);
    const now = new Date();
    if (!checkInAt) {
      throw new ServiceError('The check-in time of this shift is invalid. Please contact your supervisor.', ERROR_CODES.VALIDATION);
    }
    if (now < checkInAt) {
      throw new ServiceError('Your device clock is earlier than the check-in time. Correct your device time and try again.', ERROR_CODES.VALIDATION);
    }

    const completed = {
      ...record,
      checkOutAt: now.toISOString(),
      durationMinutes: minutesBetween(checkInAt, now),
      status: ATTENDANCE_STATUS.COMPLETED,
      checkOutNote: sanitizeNote(note),
      checkOutLocation: sanitizeLocation(location),
    };
    rows[index] = completed;
    saveCollection('attendance', rows);
    return completed;
  });
}
