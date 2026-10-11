/**
 * Demo persistence layer
 * ----------------------
 * One JSON document in LocalStorage holds every collection. Services change it
 * only through `transact()`, which works on a deep copy and commits all-or-
 * nothing, so a validation error halfway through never leaves partial writes.
 * React subscribes through `subscribe()` / `getState()` (useSyncExternalStore).
 *
 * In production this module is replaced by HTTP calls to the server/ API;
 * the service functions keep their signatures.
 */
import { buildDemoData, DEMO_ADMIN } from '../data/demoData';
import { computeInvoiceStatus } from '../utils/calculations';
import { formatMoney } from '../utils/currency';
import { nowIso, todayKey } from '../utils/dateUtils';

export const STORAGE_KEY = 'shiftwise.admin.db.v1';
const SCHEMA_VERSION = 1;

let state = null;
const listeners = new Set();

export class ServiceError extends Error {
  constructor(message, { field, code, details } = {}) {
    super(message);
    this.name = 'ServiceError';
    this.field = field;
    this.code = code;
    this.details = details;
  }
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.version === SCHEMA_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function writeStorage(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    throw new ServiceError('Browser storage is full or unavailable. Reset the demo data to free space.', {
      code: 'storage',
      details: error,
    });
  }
}

/**
 * Applies time-based rules that change without user action: unpaid invoices
 * become overdue once their due date passes. Paid invoices are never touched.
 */
function applyTimeRules(draft) {
  const today = todayKey();
  draft.invoices.forEach((invoice) => {
    const next = computeInvoiceStatus(invoice, today);
    if (next !== invoice.status) {
      invoice.status = next;
      if (next === 'overdue') {
        draft.notifications.unshift({
          id: createId('ntf'),
          title: 'Invoice overdue',
          message: `${invoice.invoiceNumber} is past its due date with ${formatMoney(invoice.balanceDue, invoice.currency)} outstanding.`,
          type: 'invoice',
          relatedEntityType: 'invoice',
          relatedEntityId: invoice.id,
          createdAt: nowIso(),
          isRead: false,
        });
      }
    }
  });
  draft.lastTimeRulesRun = today;
  return draft;
}

function initialize() {
  const stored = readStorage();
  if (stored) {
    state = stored.lastTimeRulesRun === todayKey() ? stored : applyTimeRules(structuredClone(stored));
  } else {
    state = applyTimeRules(buildDemoData(new Date()));
  }
  try {
    writeStorage(state);
  } catch {
    // Keep running in memory if storage is blocked (private mode, quota).
  }
  return state;
}

export function getState() {
  return state ?? initialize();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((listener) => listener());
}

/**
 * Runs `mutator(draft)` on a copy of the database and commits it.
 * Whatever the mutator returns is passed back to the caller.
 */
export function transact(mutator) {
  const draft = structuredClone(getState());
  const result = mutator(draft);
  draft.updatedAt = nowIso();
  writeStorage(draft);
  state = draft;
  emit();
  return result;
}

/** Discards all demo changes and regenerates the seed dataset. */
export function resetDatabase() {
  state = applyTimeRules(buildDemoData(new Date()));
  writeStorage(state);
  emit();
}

/** Re-applies time rules (e.g. from the dashboard refresh button). */
export function refreshTimeRules() {
  return transact((draft) => applyTimeRules(draft));
}

// Keep several open tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    const stored = readStorage();
    if (stored) {
      state = stored;
      emit();
    }
  });
}

/* ------------------------------------------------------------------------- */
/* Helpers shared by services                                                 */
/* ------------------------------------------------------------------------- */

let idCounter = 0;
export function createId(prefix) {
  idCounter = (idCounter + 1) % 1296;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36).padStart(2, '0')}${Math.random().toString(36).slice(2, 6)}`;
}

const SESSION_KEY = 'shiftwise.admin.session';

/** The administrator performing the current action (from the demo session). */
export function currentActor() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    const session = raw ? JSON.parse(raw) : null;
    if (session?.user) return { id: session.user.id, name: session.user.name };
  } catch {
    // fall through
  }
  return { id: DEMO_ADMIN.id, name: DEMO_ADMIN.name };
}

export { SESSION_KEY };

export function logActivity(draft, { action, entityType, entityId, summary, previousValues = null, newValues = null, reason = '' }) {
  const actor = currentActor();
  const entry = {
    id: createId('act'),
    actorId: actor.id,
    actorName: actor.name,
    action,
    entityType,
    entityId,
    summary,
    previousValues,
    newValues,
    reason,
    createdAt: nowIso(),
  };
  draft.activity.unshift(entry);
  if (draft.activity.length > 500) draft.activity.length = 500;
  return entry;
}

export function notify(draft, { title, message, type, relatedEntityType = null, relatedEntityId = null }) {
  draft.notifications.unshift({
    id: createId('ntf'),
    title,
    message,
    type,
    relatedEntityType,
    relatedEntityId,
    createdAt: nowIso(),
    isRead: false,
  });
  if (draft.notifications.length > 300) draft.notifications.length = 300;
}

/** Simulated network latency so loading states are visible in the demo. */
export function delay(ms = 350) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Wraps a synchronous transaction in a promise with simulated latency. */
export async function mutate(mutator, ms) {
  await delay(ms);
  return transact(mutator);
}

export function findOrThrow(collection, id, label = 'Record') {
  const record = collection.find((item) => item.id === id);
  if (!record) throw new ServiceError(`${label} not found. It may have been removed.`, { code: 'not_found' });
  return record;
}

/** Shallow diff of selected fields, for audit entries. */
export function diffFields(before, after, fields) {
  const previous = {};
  const next = {};
  fields.forEach((field) => {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      previous[field] = before[field];
      next[field] = after[field];
    }
  });
  return Object.keys(next).length ? { previous, next } : null;
}

