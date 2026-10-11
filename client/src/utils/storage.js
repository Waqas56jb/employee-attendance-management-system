/**
 * Namespaced, exception-safe wrappers around Web Storage.
 *
 * LocalStorage is used ONLY to persist demo data in the browser. It is not
 * encrypted, is readable by any script on the page and must never be treated
 * as secure storage for real employee information.
 */

const PREFIX = 'shiftline:';

export const STORAGE_KEYS = {
  seedVersion: 'seed-version',
  employees: 'db:employees',
  customers: 'db:customers',
  projects: 'db:projects',
  attendance: 'db:attendance',
  notifications: 'db:notifications',
  session: 'session',
  preferences: 'preferences',
  rememberedEmail: 'remembered-email',
};

export const storageKey = (key) => `${PREFIX}${key}`;

function getStore(type) {
  try {
    return type === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function readJSON(key, fallback = null, type = 'local') {
  const store = getStore(type);
  if (!store) return fallback;
  try {
    const raw = store.getItem(storageKey(key));
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value, type = 'local') {
  const store = getStore(type);
  if (!store) return false;
  try {
    store.setItem(storageKey(key), JSON.stringify(value));
    return true;
  } catch {
    // Quota exceeded or storage disabled (e.g. some private browsing modes).
    return false;
  }
}

export function removeKey(key, type = 'local') {
  const store = getStore(type);
  try {
    store?.removeItem(storageKey(key));
  } catch {
    /* ignore */
  }
}
