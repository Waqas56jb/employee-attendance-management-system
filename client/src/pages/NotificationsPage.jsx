import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BellOff, Check, CheckCheck, ExternalLink, Info } from 'lucide-react';
import { isToday, isYesterday } from 'date-fns';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/LoadingSpinner';
import { PageHeader } from '../components/common/PageHeader';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { Select } from '../components/common/Select';
import { PageContainer } from '../components/layout/PageContainer';
import { NotificationIcon } from '../components/notifications/NotificationIcon';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFormatters } from '../hooks/useFormatters';
import { useNotifications } from '../hooks/useNotifications';
import { NOTIFICATION_TYPES } from '../services/notificationService';
import { cn } from '../utils/cn';
import { formatRelative } from '../utils/formatters';

function groupLabel(date) {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return 'Earlier';
}

export function NotificationsPage() {
  useDocumentTitle('Notifications');
  const { notifications, unreadCount, hiddenCount, status, markAsRead, markAllAsRead, reload } = useNotifications();
  const fmt = useFormatters();
  const navigate = useNavigate();
  const [view, setView] = useState('all');
  const [type, setType] = useState('');

  const visible = useMemo(
    () => notifications.filter((n) => (view === 'all' || !n.isRead) && (!type || n.type === type)),
    [notifications, view, type],
  );

  const groups = useMemo(() => {
    const out = [];
    visible.forEach((n) => {
      const label = groupLabel(new Date(n.createdAt));
      const group = out.find((g) => g.label === label);
      if (group) group.items.push(n);
      else out.push({ label, items: [n] });
    });
    return out;
  }, [visible]);

  const open = (n) => {
    if (!n.isRead) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader
        title="Notifications"
        description="Updates about your assignments, shifts and company announcements."
        actions={
          <Button variant="secondary" leftIcon={CheckCheck} onClick={markAllAsRead} disabled={!unreadCount}>
            Mark all as read
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          label="Show"
          value={view}
          onChange={setView}
          options={[
            { value: 'all', label: 'All', count: notifications.length },
            { value: 'unread', label: 'Unread', count: unreadCount },
          ]}
        />
        <div className="sm:w-56">
          <label htmlFor="notification-type" className="sr-only">
            Notification type
          </label>
          <Select id="notification-type" value={type} onChange={(e) => setType(e.target.value)} size="sm">
            <option value="">All types</option>
            {Object.entries(NOTIFICATION_TYPES).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {status === 'error' ? (
          <EmptyState icon={BellOff} title="Notifications could not be loaded" action={<Button onClick={() => reload()}>Try again</Button>} />
        ) : status === 'loading' || status === 'idle' ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !visible.length ? (
          <EmptyState
            icon={BellOff}
            title={view === 'unread' ? 'You are all caught up' : 'No notifications'}
            description={view === 'unread' ? 'There are no unread notifications.' : 'Notifications about your work will appear here.'}
            action={
              (view !== 'all' || type) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setView('all');
                    setType('');
                  }}
                >
                  Show all notifications
                </Button>
              )
            }
          />
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-labelledby={`group-${group.label}`}>
              <h2 id={`group-${group.label}`} className="border-b border-line bg-canvas/70 px-5 py-2 text-2xs font-semibold uppercase tracking-wider text-ink-muted">
                {group.label}
              </h2>
              <ul className="divide-y divide-line">
                {group.items.map((n) => (
                  <li key={n.id} className={cn('relative flex gap-4 px-5 py-4 transition-colors', !n.isRead && 'bg-brand-50/40')}>
                    {!n.isRead && <span className="absolute left-0 top-0 h-full w-0.5 bg-brand-600" aria-hidden="true" />}
                    <NotificationIcon type={n.type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <h3 className={cn('text-sm text-ink', n.isRead ? 'font-medium' : 'font-semibold')}>
                          {n.title}
                          {!n.isRead && <span className="sr-only"> (unread)</span>}
                        </h3>
                        <time dateTime={n.createdAt} title={fmt.dateTime(n.createdAt)} className="shrink-0 text-xs text-ink-muted">
                          {formatRelative(n.createdAt)}
                        </time>
                      </div>
                      <p className="mt-0.5 text-sm text-ink-secondary">{n.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="text-xs text-ink-muted">{NOTIFICATION_TYPES[n.type]?.label ?? 'Notification'}</span>
                        {n.link && (
                          <button type="button" onClick={() => open(n)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                            <ExternalLink size={12} aria-hidden="true" /> Open
                          </button>
                        )}
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => markAsRead(n.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink hover:underline"
                          >
                            <Check size={12} aria-hidden="true" /> Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <div className="mt-4 space-y-1.5 text-xs text-ink-muted">
        <p className="flex items-start gap-1.5">
          <Info size={13} className="mt-px shrink-0" aria-hidden="true" />
          Notifications are shown inside this app only. No emails, text messages or push notifications are sent.
        </p>
        {hiddenCount > 0 && (
          <p className="pl-5">
            {hiddenCount} notification{hiddenCount === 1 ? ' is' : 's are'} hidden by your{' '}
            <Link to="/settings" className="font-medium text-brand-700 hover:underline">
              notification settings
            </Link>
            .
          </p>
        )}
      </div>
    </PageContainer>
  );
}

export default NotificationsPage;
