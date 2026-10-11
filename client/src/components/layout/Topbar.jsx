import { useAuth } from '../../hooks/useAuth';
import { useNow } from '../../hooks/useNow';
import { formatLongDate } from '../../utils/formatters';
import { getGreeting } from '../../utils/dateUtils';
import { AccountMenu } from './AccountMenu';
import { NotificationBell } from './NotificationBell';
import { ShiftIndicator } from './ShiftIndicator';

/** Desktop top bar (lg and up). */
export function Topbar({ onLogout }) {
  const { employee } = useAuth();
  const now = useNow(60_000);

  return (
    <header className="sticky top-0 z-20 hidden h-16 items-center border-b border-line bg-surface/85 backdrop-blur-md lg:flex">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-8">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">
            {getGreeting(now)}, {employee?.displayName || employee?.fullName}
          </p>
          <p className="text-xs text-ink-muted">
            <time dateTime={now.toISOString()}>{formatLongDate(now)}</time>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShiftIndicator />
          <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
          <NotificationBell />
          <AccountMenu onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}

export default Topbar;
