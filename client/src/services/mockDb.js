import { createDemoData } from '../data/demoData';
import { STORAGE_KEYS, readJSON, removeKey, writeJSON } from '../utils/storage';

/**
 * A tiny LocalStorage-backed "database" for demo mode. Each collection is a
 * JSON array, playing the role of a backend table. Only the mock services
 * read from here; components never touch it directly.
 */

const SEED_VERSION = 4;

const COLLECTIONS = ['employees', 'customers', 'projects', 'attendance', 'notifications'];

export function ensureSeeded(force = false) {
  if (!force && readJSON(STORAGE_KEYS.seedVersion) === SEED_VERSION) return;
  const data = createDemoData(new Date());
  COLLECTIONS.forEach((name) => writeJSON(STORAGE_KEYS[name], data[name]));
  writeJSON(STORAGE_KEYS.seedVersion, SEED_VERSION);
}

export function getCollection(name) {
  ensureSeeded();
  return readJSON(STORAGE_KEYS[name], []) || [];
}

export function saveCollection(name, rows) {
  if (!writeJSON(STORAGE_KEYS[name], rows)) {
    throw new Error('Browser storage is full or unavailable, so the change could not be saved.');
  }
}

/** Restores the original demo dataset (used by Settings → Reset demo data). */
export function resetDemoData() {
  COLLECTIONS.forEach((name) => removeKey(STORAGE_KEYS[name]));
  ensureSeeded(true);
}

/** Simulates network latency so loading states are visible in the demo. */
export const simulateLatency = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export const createId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
