import { addDays, addHours } from 'date-fns';
import { DEMO_CREDENTIALS } from '../data/demoData';
import { apiClient } from './apiClient';
import { config } from './config';
import { ERROR_CODES, ServiceError } from './errors';
import { createId, getCollection, saveCollection, simulateLatency } from './mockDb';
import { STORAGE_KEYS, readJSON, removeKey, writeJSON } from '../utils/storage';

/*
 * DEMO AUTHENTICATION — NOT PRODUCTION SECURE.
 * Credentials are checked in the browser and the "token" is a random string
 * kept in Web Storage. A real deployment must authenticate against the
 * backend, issue tokens server-side (preferably httpOnly cookies) and enforce
 * every permission on the server. Frontend route guards are cosmetic.
 */

const EDITABLE_PROFILE_FIELDS = ['displayName', 'phone'];

const PUBLIC_EMPLOYEE_FIELDS = [
  'id',
  'fullName',
  'displayName',
  'email',
  'phone',
  'employeeNumber',
  'jobTitle',
  'department',
  'role',
  'avatar',
  'status',
  'employmentStartDate',
  'supervisor',
  'homeBase',
];

const toPublicEmployee = (employee) =>
  employee ? Object.fromEntries(PUBLIC_EMPLOYEE_FIELDS.map((key) => [key, employee[key] ?? null])) : null;

function storeSession(session, remember) {
  removeKey(STORAGE_KEYS.session);
  removeKey(STORAGE_KEYS.session, 'session');
  writeJSON(STORAGE_KEYS.session, session, remember ? 'local' : 'session');
}

/** Returns the stored session, or null when missing or expired. */
export function getSession() {
  const session = readJSON(STORAGE_KEYS.session, null, 'session') || readJSON(STORAGE_KEYS.session, null);
  if (!session?.employeeId || !session?.expiresAt) return null;
  if (new Date(session.expiresAt) <= new Date()) {
    clearSession();
    return null;
  }
  return session;
}

export function clearSession() {
  removeKey(STORAGE_KEYS.session);
  removeKey(STORAGE_KEYS.session, 'session');
}

/** Used by the other mock services: identity always comes from the session, never from page input. */
export function requireEmployeeId() {
  const session = getSession();
  if (!session) throw new ServiceError('Your session has ended. Please sign in again.', ERROR_CODES.UNAUTHENTICATED, 401);
  return session.employeeId;
}

export async function login({ email, password, remember = false }) {
  if (!config.useMockApi) {
    const result = await apiClient.post('/auth/login', { email, password }, { auth: false });
    storeSession(result.session, remember);
    return { session: result.session, employee: result.employee };
  }

  await simulateLatency(650);
  const normalized = email.trim().toLowerCase();
  const match = DEMO_CREDENTIALS.find((c) => c.email === normalized && c.password === password);
  if (!match) {
    throw new ServiceError(
      'The email or password is incorrect. Check your details and try again.',
      ERROR_CODES.INVALID_CREDENTIALS,
      401,
    );
  }

  const employee = getCollection('employees').find((e) => e.id === match.employeeId);
  if (!employee || employee.status !== 'active') {
    throw new ServiceError('This account is not active. Please contact your administrator.', ERROR_CODES.INVALID_CREDENTIALS, 403);
  }

  const now = new Date();
  const session = {
    token: createId('demo-token'),
    employeeId: employee.id,
    role: employee.role,
    issuedAt: now.toISOString(),
    expiresAt: (remember ? addDays(now, 30) : addHours(now, 12)).toISOString(),
  };
  storeSession(session, remember);
  if (remember) writeJSON(STORAGE_KEYS.rememberedEmail, normalized);
  else removeKey(STORAGE_KEYS.rememberedEmail);

  return { session, employee: toPublicEmployee(employee) };
}

export async function logout() {
  if (!config.useMockApi) await apiClient.post('/auth/logout').catch(() => null);
  clearSession();
}

export async function getCurrentEmployee() {
  if (!config.useMockApi) return apiClient.get('/me');
  const employeeId = requireEmployeeId();
  await simulateLatency(120);
  const employee = getCollection('employees').find((e) => e.id === employeeId);
  if (!employee) {
    clearSession();
    throw new ServiceError('Your account could not be found. Please sign in again.', ERROR_CODES.UNAUTHENTICATED, 401);
  }
  return toPublicEmployee(employee);
}

/** Employees may change only their display name and phone number. */
export async function updateProfile(changes) {
  const allowed = Object.fromEntries(
    Object.entries(changes).filter(([key]) => EDITABLE_PROFILE_FIELDS.includes(key)),
  );
  if (!config.useMockApi) return apiClient.patch('/me', allowed);

  const employeeId = requireEmployeeId();
  await simulateLatency(450);
  const rows = getCollection('employees');
  const index = rows.findIndex((e) => e.id === employeeId);
  if (index === -1) throw new ServiceError('Your profile could not be found.', ERROR_CODES.NOT_FOUND, 404);
  rows[index] = { ...rows[index], ...allowed };
  saveCollection('employees', rows);
  return toPublicEmployee(rows[index]);
}

export function getRememberedEmail() {
  return readJSON(STORAGE_KEYS.rememberedEmail, '');
}

/** In demo mode no email is sent; the UI states this explicitly. */
export async function requestPasswordReset(email) {
  if (!config.useMockApi) return apiClient.post('/auth/password-reset', { email }, { auth: false });
  await simulateLatency(700);
  return { delivered: false, demo: true };
}

export async function changePassword(payload) {
  if (!config.useMockApi) return apiClient.post('/me/password', payload);
  await simulateLatency(300);
  throw new ServiceError(
    'Password changes need the secure backend and are unavailable in demo mode. Your password was not changed.',
    ERROR_CODES.UNAVAILABLE_IN_DEMO,
    501,
  );
}
