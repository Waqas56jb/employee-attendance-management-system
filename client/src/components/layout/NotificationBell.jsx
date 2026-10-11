import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const label = unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications';
  return (
    <Link
      to="/notifications"
      aria-label={label}
      title={label}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-subtle hover:text-ink"
    >
      <Bell size={18} aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="tabular absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white ring-2 ring-surface">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

export default NotificationBell;
