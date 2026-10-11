import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { BellOff, CheckCheck, ChevronRight, Mail, MailOpen, X } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { FilterBar } from '../common/FilterBar';
import { SearchInput } from '../common/SearchInput';
import { SelectField } from '../common/SelectField';
import { StatusBadge } from '../common/StatusBadge';
import { Pagination } from '../common/Pagination';
import { EmptyState } from '../common/EmptyState';
import { NotificationIcon } from '../layout/NotificationIcon';
import { entityPath, NOTIFICATION_TYPES } from '../../services/notificationService';
import { formatDateTime } from '../../utils/dateUtils';

const PAGE_SIZE = 10;
const READ_OPTIONS = [
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];

/** Full notification inbox with filters, read state and navigation to records. */
export function NotificationList({ notifications, unreadCount, markRead, markAllRead, dismiss, filters, setFilter }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return notifications.filter(
      (n) =>
        (!filters.type || n.type === filters.type) &&
        (!filters.read || (filters.read === 'read' ? n.isRead : !n.isRead)) &&
        (!q || `${n.title} ${n.message}`.toLowerCase().includes(q)),
    );
  }, [notifications, filters.q, filters.type, filters.read]);

  useEffect(() => {
    setPage(1);
  }, [filters.q, filters.type, filters.read]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const isFiltered = Boolean(filters.q || filters.type || filters.read);

  const open = (n) => {
    const path = entityPath(n.relatedEntityType, n.relatedEntityId);
    if (!n.isRead) markRead(n.id, true);
    if (path) navigate(path);
  };

  const onDismiss = (n) => {
    dismiss(n.id);
    toast.success('Notification dismissed');
  };

  const onMarkAll = () => {
    markAllRead();
    toast.success('All notifications marked as read');
  };

  return (
    <Card>
      <FilterBar
        count={filtered.length}
        noun="notification"
        isFiltered={isFiltered}
        onReset={() => setFilter({ q: '', type: '', read: '' })}
        actions={
          <Button variant="secondary" size="sm" icon={CheckCheck} onClick={onMarkAll} disabled={!unreadCount}>
            Mark all as read
          </Button>
        }
      >
        <SearchInput value={filters.q} onChange={(v) => setFilter('q', v)} placeholder="Search notifications…" label="Search notifications" className="w-full sm:w-64" />
        <SelectField aria-label="Notification type" size="sm" className="w-full sm:w-44" value={filters.type} onChange={(e) => setFilter('type', e.target.value)} placeholder="All types" options={NOTIFICATION_TYPES} />
        <SelectField aria-label="Read state" size="sm" className="w-full sm:w-36" value={filters.read} onChange={(e) => setFilter('read', e.target.value)} placeholder="Read & unread" options={READ_OPTIONS} />
      </FilterBar>

      {visible.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={isFiltered ? 'No notifications match these filters' : 'You are all caught up'}
          description={isFiltered ? 'Try another type or clear the search.' : 'New alerts about attendance, invoices and payments will appear here.'}
        />
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((n) => {
            const path = entityPath(n.relatedEntityType, n.relatedEntityId);
            return (
              <li key={n.id} className={clsx('flex gap-3 px-4 py-3.5 sm:px-5', !n.isRead && 'bg-brand-50/40')}>
                <NotificationIcon type={n.type} />
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => open(n)} className="group block w-full text-left" aria-label={`${n.title}${path ? ' — open related record' : ''}`}>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={clsx('text-sm', n.isRead ? 'text-ink-secondary' : 'font-semibold text-ink')}>{n.title}</span>
                      <StatusBadge kind="notification" status={n.isRead ? 'read' : 'unread'} showIcon={false} />
                      {path && <ChevronRight size={14} className="text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />}
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-muted">{n.message}</span>
                  </button>
                  <p className="mt-1 text-2xs text-ink-muted">
                    <time dateTime={n.createdAt}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</time>
                    <span aria-hidden> · </span>
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={n.isRead ? Mail : MailOpen}
                    onClick={() => markRead(n.id, !n.isRead)}
                    aria-label={n.isRead ? `Mark "${n.title}" as unread` : `Mark "${n.title}" as read`}
                  >
                    <span className="hidden sm:inline">{n.isRead ? 'Mark unread' : 'Mark read'}</span>
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => onDismiss(n)} aria-label={`Dismiss "${n.title}"`} title="Dismiss">
                    <X size={16} aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > PAGE_SIZE && <Pagination page={current} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />}
    </Card>
  );
}
