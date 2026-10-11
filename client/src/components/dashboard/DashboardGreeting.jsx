import { useAuth } from '../../hooks/useAuth';
import { useAttendance } from '../../hooks/useAttendance';
import { useNow } from '../../hooks/useNow';
import { getGreeting } from '../../utils/dateUtils';
import { firstName, formatLongDate } from '../../utils/formatters';

export function DashboardGreeting() {
  const { employee } = useAuth();
  const { activeShift } = useAttendance();
  const now = useNow(60_000);
  const name = employee?.displayName || firstName(employee?.fullName);

  const message = activeShift
    ? 'Your shift is in progress. Remember to check out when you finish.'
    : now.getHours() < 12
      ? 'Here is an overview of your day. Check in when you arrive on site.'
      : 'Here is an overview of your working time and assignments.';

  return (
    <header className="mb-6 sm:mb-8">
      <p className="text-sm font-medium text-brand-700">
        <time dateTime={now.toISOString()}>{formatLongDate(now)}</time>
      </p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        {getGreeting(now)}, {name}
      </h1>
      <p className="mt-1 text-sm text-ink-muted sm:text-[15px]">{message}</p>
    </header>
  );
}

export default DashboardGreeting;
