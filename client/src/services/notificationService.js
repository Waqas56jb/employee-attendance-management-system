import { apiClient } from './apiClient';
import { requireEmployeeId } from './authService';
import { config } from './config';
import { ERROR_CODES, ServiceError } from './errors';
import { createId, getCollection, saveCollection, simulateLatency } from './mockDb';

/*
 * In-app notifications only. Nothing here sends email, SMS or push messages.
 */

export const NOTIFICATION_TYPES = {
  'new-assignment': { label: 'New assignment', category: 'assignments' },
  'assignment-update': { label: 'Assignment update', category: 'assignments' },
  'shift-confirmation': { label: 'Shift confirmation', category: 'shifts' },
  'check-out': { label: 'Check-out', category: 'shifts' },
  'schedule-reminder': { label: 'Schedule reminder', category: 'reminders' },
  announcement: { label: 'Announcement', category: 'announcements' },
};

const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

export async function getMyNotifications() {
  if (!config.useMockApi) return apiClient.get('/me/notifications');
  const employeeId = requireEmployeeId();
  await simulateLatency(200);
  return getCollection('notifications')
    .filter((n) => n.employeeId === employeeId)
    .sort(byNewest);
}

export async function markAsRead(notificationId) {
  if (!config.useMockApi) return apiClient.post(`/me/notifications/${encodeURIComponent(notificationId)}/read`);
  const employeeId = requireEmployeeId();
  const rows = getCollection('notifications');
  const row = rows.find((n) => n.id === notificationId && n.employeeId === employeeId);
  if (!row) throw new ServiceError('Notification not found.', ERROR_CODES.NOT_FOUND, 404);
  row.isRead = true;
  saveCollection('notifications', rows);
  return row;
}

export async function markAllAsRead() {
  if (!config.useMockApi) return apiClient.post('/me/notifications/read-all');
  const employeeId = requireEmployeeId();
  const rows = getCollection('notifications').map((n) => (n.employeeId === employeeId ? { ...n, isRead: true } : n));
  saveCollection('notifications', rows);
}

/**
 * Demo stand-in for notifications the backend would generate after an event
 * (for example a check-in). With a real API this becomes a no-op because the
 * server creates them.
 */
export async function createNotification({ type, title, message, link = null }) {
  if (!config.useMockApi) return null;
  const employeeId = requireEmployeeId();
  const notification = {
    id: createId('ntf'),
    employeeId,
    title,
    message,
    type,
    link,
    createdAt: new Date().toISOString(),
    isRead: false,
  };
  saveCollection('notifications', [notification, ...getCollection('notifications')]);
  return notification;
}
