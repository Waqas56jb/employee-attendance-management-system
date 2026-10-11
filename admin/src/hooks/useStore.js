import { useSyncExternalStore } from 'react';
import { getState, subscribe } from '../services/db';

/**
 * Subscribes to the demo database. Every write replaces the root object, so
 * selecting a collection (db.employees, …) returns a stable reference until
 * that data actually changes.
 */
export function useDb() {
  return useSyncExternalStore(subscribe, getState, getState);
}
