import { createContext, useMemo } from 'react';
import { useDb } from '../hooks/useStore';
import * as notificationService from '../services/notificationService';

export const NotificationContext = createContext(null);

/** Administrator notifications and the activity (audit) log. */
export function NotificationProvider({ children }) {
  const { notifications, activity } = useDb();

  const value = useMemo(
    () => ({
      notifications,
      activity,
      unreadCount: notifications.filter((n) => !n.isRead).length,
      markRead: notificationService.markNotificationRead,
      markAllRead: notificationService.markAllNotificationsRead,
      dismiss: notificationService.dismissNotification,
    }),
    [notifications, activity],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
