import { Link } from 'react-router-dom';
import { ArrowRight, BellOff } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { formatRelative } from '../../utils/formatters';
import { Card, CardHeader } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { Skeleton } from '../common/LoadingSpinner';
import { NotificationIcon } from '../notifications/NotificationIcon';

export function LatestNotifications({ limit = 4 }) {
  const { notifications, unreadCount, status } = useNotifications();
  const latest = notifications.slice(0, limit);

  return (
    <Card padded={false}>
      <div className="p-5 pb-0 sm:p-6 sm:pb-0">
        <CardHeader
          title="Latest notifications"
          description={unreadCount ? `${unreadCount} unread` : 'You are all caught up'}
          action={
            <Link to="/notifications" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
              View all <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
      </div>
      {status === 'loading' || status === 'idle' ? (
        <div className="space-y-3 p-5 pt-0 sm:p-6 sm:pt-0">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !latest.length ? (
        <EmptyState compact icon={BellOff} title="No notifications" description="Updates about your assignments will appear here." />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {latest.map((n) => (
            <li key={n.id}>
              <Link to="/notifications" className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-canvas sm:px-6">
                <NotificationIcon type={n.type} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    <span className="truncate">{n.title}</span>
                    {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                  </p>
                  <p className="truncate text-xs text-ink-muted">{n.message}</p>
                </div>
                <span className="shrink-0 text-2xs text-ink-muted">{formatRelative(n.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default LatestNotifications;
