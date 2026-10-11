import { AlarmClock, AlertTriangle, CalendarRange, CheckCircle2, CircleDot, Timer } from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { displayAttendanceStatus, elapsedMinutes, isMissingCheckout, isShiftOpen } from '../../utils/calculations';
import { formatPeriod, getPresetRange, isInDateRange, toDateKey } from '../../utils/dateUtils';
import { formatDuration, pluralize } from '../../utils/formatters';

function hoursIn(records, from, to, now) {
  return records
    .filter((r) => r.status !== 'cancelled' && isInDateRange(r.checkInAt, from, to))
    .reduce((sum, r) => sum + (isShiftOpen(r) ? elapsedMinutes(r.checkInAt, now) : r.recordedDurationMinutes ?? 0), 0);
}

const link = (params) => `/attendance?${new URLSearchParams(params).toString()}`;

/**
 * KPI tiles for the attendance page. Each tile links to the matching filtered
 * list. Hours include the live elapsed time of open shifts.
 */
export function AttendanceSummaryCards({ records, range, rules }) {
  const { now } = rules;
  const today = toDateKey(now);
  const week = getPresetRange('this_week', now);
  const hasRange = Boolean(range.from || range.to);
  const completedRange = hasRange ? range : { from: today, to: today };

  const todayMinutes = hoursIn(records, today, today, now);
  const weekMinutes = hoursIn(records, week.from, week.to, now);
  const open = records.filter(isShiftOpen);
  const missing = open.filter((r) => isMissingCheckout(r, rules));
  const working = open.length - missing.length;
  const completed = records.filter(
    (r) => r.checkOutAt && r.status !== 'cancelled' && isInDateRange(r.checkInAt, completedRange.from, completedRange.to),
  ).length;
  const review = records.filter((r) => r.checkOutAt && displayAttendanceStatus(r, rules) === 'needs_review').length;

  return (
    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      <StatCard label="Hours today" value={formatDuration(todayMinutes)} icon={Timer} hint="Closed shifts + live open shifts" to={link({ from: today, to: today })} />
      <StatCard
        label="Hours this week"
        value={formatDuration(weekMinutes)}
        icon={CalendarRange}
        hint={formatPeriod(week.from, week.to)}
        to={link({ from: week.from, to: week.to })}
      />
      <StatCard
        label="Active shifts"
        value={working}
        icon={CircleDot}
        tone="info"
        hint={working === 1 ? 'Employee checked in now' : 'Employees checked in now'}
        to={link({ shift: 'active', status: 'active' })}
      />
      <StatCard
        label={hasRange ? 'Completed shifts (filtered period)' : 'Completed shifts today'}
        value={completed}
        icon={CheckCircle2}
        tone="success"
        hint={formatPeriod(completedRange.from, completedRange.to)}
        to={link({ shift: 'completed', from: completedRange.from, to: completedRange.to })}
      />
      <StatCard
        label="Missing check-outs"
        value={missing.length}
        icon={AlarmClock}
        tone={missing.length ? 'danger' : 'neutral'}
        hint={`Open > ${rules.openShiftAlertHours} h or from a previous day`}
        to={link({ status: 'missing_checkout' })}
      />
      <StatCard
        label="Requires review"
        value={review}
        icon={AlertTriangle}
        tone={review ? 'warning' : 'neutral'}
        hint={review ? `${pluralize(review, 'record')} excluded from billing` : `Flagged or > ${rules.reviewShiftsOverHours} h`}
        to={link({ status: 'needs_review' })}
      />
    </div>
  );
}
