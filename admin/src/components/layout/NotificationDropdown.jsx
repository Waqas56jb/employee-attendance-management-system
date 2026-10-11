import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useClickOutside } from '../../hooks/useClickOutside';
import { entityPath } from '../../services/notificationService';
import { NotificationIcon } from './NotificationIcon';

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);
  const latest = notifications.slice(0, 6);

  const openItem = (n) => {
    markRead(n.id);
    setOpen(false);
    const path = entityPath(n.relatedEntityType, n.relatedEntityId);
    if (path) navigate(path);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-subtle hover:text-ink"
      >
        <Bell size={18} aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-40 animate-scale-in rounded-xl border border-line bg-surface shadow-overlay sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <button
              type="button"
              onClick={markAllRead}
              disabled={!unreadCount}
              className="inline-flex items-center gap-1 rounded text-xs font-medium text-brand-700 hover:underline disabled:text-ink-muted disabled:no-underline"
            >
              <CheckCheck size={14} aria-hidden /> Mark all read
            </button>
          </div>
          <ul className="scrollbar-thin max-h-[60vh] overflow-y-auto">
            {latest.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-muted">You are all caught up.</li>}
            {latest.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => openItem(n)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-subtle">
                  <NotificationIcon type={n.type} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={clsx('truncate text-sm', n.isRead ? 'text-ink-secondary' : 'font-semibold text-ink')}>{n.title}</span>
                      {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted">{n.message}</span>
                    <span className="mt-1 block text-2xs text-ink-muted">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-line p-2">
            <Link to="/notifications" onClick={close} className="block rounded-lg py-2 text-center text-sm font-medium text-brand-700 hover:bg-brand-50">
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
