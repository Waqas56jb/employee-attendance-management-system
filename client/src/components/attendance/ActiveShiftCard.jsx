import { Link } from 'react-router-dom';
import { AlertTriangle, Building2, FolderKanban, MapPin, Play, Square, StickyNote } from 'lucide-react';
import { useAssignments } from '../../hooks/useAssignments';
import { useAttendance } from '../../hooks/useAttendance';
import { useFormatters } from '../../hooks/useFormatters';
import { useNow } from '../../hooks/useNow';
import { useShiftDialogs } from '../../hooks/useShiftDialogs';
import { cn } from '../../utils/cn';
import { elapsedMs } from '../../utils/dateUtils';
import { formatDayLabel, formatElapsed } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Skeleton } from '../common/LoadingSpinner';

const LONG_SHIFT_HOURS = 12;

function Detail({ icon: Icon, label, children }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface text-ink-muted ring-1 ring-line">
        <Icon size={14} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-2xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <div className="truncate text-sm font-medium text-ink">{children}</div>
      </div>
    </div>
  );
}

/**
 * Current working status. With an active shift: live elapsed time computed
 * from the stored check-in timestamp (correct after refresh) and a check-out
 * button. Without: a clear call to action to check in.
 */
export function ActiveShiftCard({ className, size = 'default' }) {
  const { activeShift, isLoading } = useAttendance();
  const { projectsById, customersById, activeProjects, isLoading: assignmentsLoading } = useAssignments();
  const { openCheckIn, openCheckOut } = useShiftDialogs();
  const fmt = useFormatters();
  const now = useNow(1000, Boolean(activeShift));
  const large = size === 'large';

  if (isLoading || assignmentsLoading) {
    return (
      <div className={cn('card p-6', className)} aria-busy="true">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-4 h-10 w-48" />
        <Skeleton className="mt-6 h-11 w-full sm:w-40" />
      </div>
    );
  }

  if (!activeShift) {
    return (
      <section className={cn('card relative overflow-hidden', className)} aria-labelledby="shift-status-title">
        <div className={cn('flex flex-col gap-5 p-5 sm:p-6', large ? 'lg:flex-row lg:items-center lg:justify-between lg:p-8' : 'sm:flex-row sm:items-center sm:justify-between')}>
          <div className="min-w-0">
            <Badge tone="neutral" dot>
              Not working
            </Badge>
            <h2 id="shift-status-title" className={cn('mt-3 font-semibold tracking-tight text-ink', large ? 'text-2xl' : 'text-lg')}>
              You are not checked in
            </h2>
            <p className="mt-1 max-w-md text-sm text-ink-muted">
              {activeProjects.length
                ? 'Press Check In, choose the customer and project you are working on, and confirm to start recording your time.'
                : 'You have no active projects to check in to right now. Contact your supervisor if this is unexpected.'}
            </p>
          </div>
          <Button
            size="lg"
            leftIcon={Play}
            onClick={() => openCheckIn()}
            disabled={!activeProjects.length}
            className="w-full sm:w-auto sm:min-w-[160px]"
          >
            Check In
          </Button>
        </div>
      </section>
    );
  }

  const project = projectsById[activeShift.projectId];
  const customer = customersById[activeShift.customerId];
  const elapsed = elapsedMs(activeShift.checkInAt, now);
  const isLong = elapsed >= LONG_SHIFT_HOURS * 3_600_000;

  return (
    <section
      className={cn('card relative overflow-hidden border-success/30', className)}
      aria-labelledby="shift-status-title"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-success" aria-hidden="true" />
      <div className={cn('p-5 sm:p-6', large && 'lg:p-8')}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Badge tone="success" dot pulse>
              Working
            </Badge>
            <h2 id="shift-status-title" className="sr-only">
              Shift in progress
            </h2>
            <p
              className={cn('tabular mt-3 font-mono font-semibold tracking-tight text-ink', large ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl')}
              aria-label={`Elapsed time ${formatElapsed(elapsed)}`}
            >
              {formatElapsed(elapsed)}
            </p>
            <p className="mt-1.5 text-sm text-ink-muted">
              Checked in {formatDayLabel(activeShift.checkInAt).toLowerCase()} at{' '}
              <span className="font-medium text-ink-secondary">{fmt.time(activeShift.checkInAt)}</span>
            </p>
          </div>
          <Button size="lg" variant="danger" leftIcon={Square} onClick={openCheckOut} className="w-full sm:w-auto sm:min-w-[160px]">
            Check Out
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl bg-canvas p-4 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-3">
          <Detail icon={Building2} label="Customer">
            {customer ? (
              <Link to={`/customers/${customer.id}`} className="hover:text-brand-700 hover:underline">
                {customer.companyName}
              </Link>
            ) : (
              'Unknown customer'
            )}
          </Detail>
          <Detail icon={FolderKanban} label="Project">
            {project ? (
              <Link to={`/projects/${project.id}`} className="hover:text-brand-700 hover:underline">
                {project.name}
              </Link>
            ) : (
              'Unknown project'
            )}
          </Detail>
          <Detail icon={MapPin} label="Site">
            <span title={project?.location}>{project?.location ?? '—'}</span>
          </Detail>
        </div>

        {activeShift.checkInNote && (
          <p className="mt-4 flex items-start gap-2 text-sm text-ink-secondary">
            <StickyNote size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
            {activeShift.checkInNote}
          </p>
        )}

        {isLong && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-ink" role="status">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            This shift has been running for more than {LONG_SHIFT_HOURS} hours. If you forgot to check out, check out now and tell
            your supervisor so the record can be corrected.
          </p>
        )}
      </div>
    </section>
  );
}

export default ActiveShiftCard;
