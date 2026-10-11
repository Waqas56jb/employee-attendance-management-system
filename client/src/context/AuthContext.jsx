import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';
import { ERROR_CODES } from '../services/errors';
import { ensureSeeded } from '../services/mockDb';
import { STORAGE_KEYS, storageKey } from '../utils/storage';

export const AuthContext = createContext(null);

/**
 * Holds the signed-in employee. status: 'loading' | 'authenticated' | 'unauthenticated'.
 * Frontend checks are for UX only; the backend must authorize every request.
 */
export function AuthProvider({ children }) {
  const [employee, setEmployee] = useState(null);
  const [status, setStatus] = useState('loading');

  const restore = useCallback(async () => {
    ensureSeeded();
    if (!authService.getSession()) {
      setEmployee(null);
      setStatus('unauthenticated');
      return;
    }
    try {
      setEmployee(await authService.getCurrentEmployee());
      setStatus('authenticated');
    } catch {
      authService.clearSession();
      setEmployee(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    restore();
  }, [restore]);

  // Signing out (or in) in another tab updates this tab too.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === storageKey(STORAGE_KEYS.session) || event.key === null) restore();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [restore]);

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials);
    setEmployee(result.employee);
    setStatus('authenticated');
    return result.employee;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setEmployee(null);
    setStatus('unauthenticated');
  }, []);

  const updateProfile = useCallback(async (changes) => {
    const updated = await authService.updateProfile(changes);
    setEmployee(updated);
    return updated;
  }, []);

  /** Call when a service reports an expired session. */
  const handleAuthError = useCallback(
    (error) => {
      if (error?.code === ERROR_CODES.UNAUTHENTICATED) {
        authService.clearSession();
        setEmployee(null);
        setStatus('unauthenticated');
        return true;
      }
      return false;
    },
    [],
  );

  const value = useMemo(
    () => ({
      employee,
      status,
      isAuthenticated: status === 'authenticated',
      role: employee?.role ?? null,
      login,
      logout,
      updateProfile,
      handleAuthError,
    }),
    [employee, status, login, logout, updateProfile, handleAuthError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
