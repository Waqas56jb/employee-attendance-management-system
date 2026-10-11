import { transact } from './db';

export const NOTIFICATION_TYPES = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'payment', label: 'Payments' },
  { value: 'billing', label: 'Rates & billing' },
  { value: 'project', label: 'Projects' },
  { value: 'employee', label: 'Employees' },
  { value: 'customer', label: 'Customers' },
];

export function markNotificationRead(id, isRead = true) {
  return transact((draft) => {
    const n = draft.notifications.find((item) => item.id === id);
    if (n) n.isRead = isRead;
  });
}

export function markAllNotificationsRead() {
  return transact((draft) => {
    draft.notifications.forEach((n) => {
      n.isRead = true;
    });
  });
}

export function dismissNotification(id) {
  return transact((draft) => {
    draft.notifications = draft.notifications.filter((n) => n.id !== id);
  });
}

/** Route of the record a notification or activity entry refers to. */
export function entityPath(type, id) {
  if (!type || !id) return null;
  return (
    {
      employee: `/employees/${id}`,
      customer: `/customers/${id}`,
      project: `/projects/${id}`,
      attendance: `/attendance/${id}`,
      invoice: `/invoices/${id}`,
      settings: { business: '/settings/business', invoices: '/settings/invoices', 'working-hours': '/settings/working-hours' }[id],
    }[type] ?? null
  );
}
