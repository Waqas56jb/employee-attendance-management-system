import { Link } from 'react-router-dom';
import { useAttendance } from '../../hooks/useAttendance';
import { useNow } from '../../hooks/useNow';
import { cn } from '../../utils/cn';
import { elapsedMs } from '../../utils/dateUtils';
import { formatElapsed } from '../../utils/formatters';

/** Compact live shift status shown in the top bar / mobile header. */
export function ShiftIndicator({ compact = false }) {
  const { activeShift } = useAttendance();
  const now = useNow(1000, Boolean(activeShift));

  if (!activeShift) {
    if (compact) return null;
    return (
      <Link
        to="/check-in-out"
        className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink-secondary transition-colors hover:bg-subtle hover:text-ink"
      >
        <span className="h-2 w-2 rounded-full bg-ink-muted/60" aria-hidden="true" />
        Not checked in
      </Link>
    );
  }

  return (
    <Link
      to="/check-in-out"
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-success-soft font-medium text-success-ink ring-1 ring-inset ring-success/25 transition-colors hover:bg-success-soft/70',
        compact ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-xs',
      )}
      aria-label={`Shift in progress, ${formatElapsed(elapsedMs(activeShift.checkInAt, now))} elapsed. Open check-out.`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      {!compact && <span>Working</span>}
      <span className="tabular font-mono text-[12px] font-semibold">{formatElapsed(elapsedMs(activeShift.checkInAt, now))}</span>
    </Link>
  );
}

export default ShiftIndicator;
