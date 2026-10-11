/**
 * Mock authentication — DEMO ONLY.
 *
 * Credentials are checked in the browser and the "session" is a JSON blob in
 * Local/SessionStorage. This offers no security: anyone can edit storage.
 * The backend must issue and verify sessions (httpOnly cookies or short-lived
 * tokens), hash passwords, rate-limit logins and enforce authorization on
 * every API call.
 */
import { DEMO_ADMIN, DEMO_CREDENTIALS } from '../data/demoData';
import { delay, ServiceError, SESSION_KEY } from './db';

const SESSION_HOURS = { remember: 24 * 14, default: 12 };

function storeFor(remember) {
  return remember ? localStorage : sessionStorage;
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.expiresAt || new Date(session.expiresAt) < new Date()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export async function login({ email, password, remember }) {
  await delay(650);
  const matches =
    email.trim().toLowerCase() === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password;
  if (!matches) {
    throw new ServiceError('The email or password is incorrect.', { code: 'invalid_credentials' });
  }
  const hours = remember ? SESSION_HOURS.remember : SESSION_HOURS.default;
  const session = {
    user: { ...DEMO_ADMIN },
    token: 'demo-session',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + hours * 3600000).toISOString(),
    remember: Boolean(remember),
  };
  clearSession();
  storeFor(remember).setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function logout() {
  await delay(150);
  clearSession();
}

/**
 * Password recovery placeholder. No email is sent: the backend must generate
 * a single-use token and deliver it through a mail provider.
 */
export async function requestPasswordReset(email) {
  await delay(700);
  return {
    email,
    message:
      'Demo mode: no email was sent. Password recovery will be available once the backend mail integration is connected.',
  };
}
