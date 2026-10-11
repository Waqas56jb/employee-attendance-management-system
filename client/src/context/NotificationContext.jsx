import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePreferences } from '../hooks/usePreferences';
import * as notificationService from '../services/notificationService';
import { NOTIFICATION_TYPES } from '../services/notificationService';
import { STORAGE_KEYS, storageKey } from '../utils/storage';

export const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { employee, handleAuthError } = useAuth();
  const { preferences } = usePreferences();
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState('idle');

  const employeeId = employee?.id;

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!employeeId) return;
      if (!silent) setStatus('loading');
      try {
        setNotifications(await notificationService.getMyNotifications());
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
      setNotifications([]);
      setStatus('idle');
    }
  }, [employeeId, load]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === storageKey(STORAGE_KEYS.notifications)) load({ silent: true });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [load]);

  const isCategoryEnabled = useCallback(
    (type) => preferences.notifications[NOTIFICATION_TYPES[type]?.category] !== false,
    [preferences.notifications],
  );

  // Categories muted in Settings are hidden from the inbox and the unread badge.
  const visible = useMemo(() => notifications.filter((n) => isCategoryEnabled(n.type)), [notifications, isCategoryEnabled]);
  const unreadCount = useMemo(() => visible.filter((n) => !n.isRead).length, [visible]);
  const hiddenCount = notifications.length - visible.length;

  const markAsRead = useCallback(
    async (id) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      try {
        await notificationService.markAsRead(id);
      } catch (error) {
        if (!handleAuthError(error)) load({ silent: true });
      }
    },
    [handleAuthError, load],
  );

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationService.markAllAsRead();
    } catch (error) {
      if (!handleAuthError(error)) load({ silent: true });
    }
  }, [handleAuthError, load]);

  /** Records an in-app notification for a demo event, if its category is enabled. */
  const notify = useCallback(
    async (payload) => {
      if (!isCategoryEnabled(payload.type)) return null;
      try {
        const created = await notificationService.createNotification(payload);
        if (created) setNotifications((prev) => [created, ...prev]);
        return created;
      } catch {
        return null;
      }
    },
    [isCategoryEnabled],
  );

  const value = useMemo(
    () => ({
      notifications: visible,
      unreadCount,
      hiddenCount,
      status,
      reload: load,
      markAsRead,
      markAllAsRead,
      notify,
    }),
    [visible, unreadCount, hiddenCount, status, load, markAsRead, markAllAsRead, notify],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
