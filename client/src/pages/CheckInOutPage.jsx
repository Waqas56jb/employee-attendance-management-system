import { useMemo } from 'react';
import { CalendarDays, Info, ListChecks } from 'lucide-react';
import { ActiveShiftCard } from '../components/attendance/ActiveShiftCard';
import { HoursSummary } from '../components/attendance/HoursSummary';
import { ShiftTimeline } from '../components/attendance/ShiftTimeline';
import { Card, CardHeader } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/LoadingSpinner';
import { PageHeader } from '../components/common/PageHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { useAttendance } from '../hooks/useAttendance';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFormatters } from '../hooks/useFormatters';
import { useNow } from '../hooks/useNow';
import { config } from '../services/config';
import { getPeriodRange, getRecordMinutes, isInRange } from '../utils/dateUtils';
import { formatDuration, formatLongDate } from '../utils/formatters';

const STEPS = [
  'Press Check In when you start working at the customer site.',
  'Choose the customer, then the project you are working on.',
  'Optionally share your location and add a short note, then confirm.',
  'Press Check Out when you finish. Your hours are calculated automatically.',
];

export function CheckInOutPage() {
  useDocumentTitle('Check In / Check Out');
  const { records, activeShift, isLoading } = useAttendance();
  const fmt = useFormatters();
  const now = useNow(1000);

  const todays = useMemo(() => {
    const range = getPeriodRange('today', now);
    return records.filter((r) => isInRange(r.checkInAt, range));
    // Recompute only when the date changes, not every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, now.toDateString()]);

  const todayTotal = todays.reduce((sum, r) => sum + getRecordMinutes(r, now), 0);

  return (
    <PageContainer>
      <PageHeader
        title="Check In / Check Out"
        description="Record the start and end of every shift. Your working time is calculated from these timestamps."
        actions={
          <div className="text-left sm:text-right">
            <p className="tabular font-mono text-2xl font-semibold text-ink" aria-label={`Current time ${fmt.time(now)}`}>
              {fmt.time(now, true)}
            </p>
            <p className="text-sm text-ink-muted">{formatLongDate(now)}</p>
          </div>
        }
      />

      <ActiveShiftCard size="large" />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Today's sessions"
            description={todays.length ? `${formatDuration(todayTotal)} recorded today${activeShift ? ' (live)' : ''}` : undefined}
            icon={CalendarDays}
          />
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : todays.length ? (
            <ShiftTimeline records={todays} now={now} />
          ) : (
            <EmptyState
              compact
              icon={CalendarDays}
              title="No sessions today"
              description="Sessions you record today will appear here as a timeline."
            />
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Your hours" description="Completed shifts; live time shown separately" />
            <HoursSummary />
          </Card>
          <Card>
            <CardHeader title="How it works" icon={ListChecks} />
            <ol className="space-y-3">
              {STEPS.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm text-ink-secondary">
                  <span className="tabular flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-subtle text-2xs font-semibold text-ink-secondary">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-4 flex gap-2 border-t border-line pt-4 text-xs text-ink-muted">
              <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
              {config.requireLocation
                ? 'Your organization requires a browser location for every check-in and check-out.'
                : 'Location sharing is optional. Only one shift can be active at a time.'}
            </p>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

export default CheckInOutPage;
