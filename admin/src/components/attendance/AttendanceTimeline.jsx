import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { SelectField } from '../common/SelectField';
import { DateRangePicker } from '../common/DateRangePicker';
import { StatusBadge } from '../common/StatusBadge';
import { displayAttendanceStatus, getBillableMinutes, isShiftOpen } from '../../utils/calculations';
import { formatDate, formatTime, isInDateRange, toDateKey } from '../../utils/dateUtils';
import { formatDuration, pluralize } from '../../utils/formatters';
import { isBillableAdjusted, liveDuration, useAttendanceRules } from './attendanceHelpers';

const DAYS_STEP = 10;

/**
 * Attendance records grouped by work day, with employee and date-range
 * filters. Used on project (and other) detail pages.
 */
export function AttendanceTimeline({ records, employeesById, title = 'Attendance timeline', description, showProject = false, projectsById = {} }) {
  const rules = useAttendanceRules(60000);
  const [employee, setEmployee] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [visibleDays, setVisibleDays] = useState(DAYS_STEP);

  const employeeOptions = useMemo(() => {
    const ids = [...new Set(records.map((r) => r.employeeId))];
    return ids
      .map((id) => ({ value: id, label: employeesById[id]?.fullName ?? 'Unknown employee' }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [records, employeesById]);

  const days = useMemo(() => {
    const filtered = records.filter((r) => (!employee || r.employeeId === employee) && isInDateRange(r.checkInAt, range.from, range.to));
    const map = new Map();
    [...filtered]
      .sort((a, b) => b.checkInAt.localeCompare(a.checkInAt))
      .forEach((r) => {
        const key = toDateKey(r.checkInAt);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(r);
      });
    return [...map.entries()].map(([key, items]) => ({
      key,
      items,
      minutes: items.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + (liveDuration(r, rules.now) ?? 0), 0),
    }));
  }, [records, employee, range, rules.now]);

  const count = days.reduce((s, d) => s + d.items.length, 0);
  const isFiltered = Boolean(employee || range.from || range.to);

  return (
    <Card>
      <CardHeader icon={CalendarDays} title={title} description={description ?? `${pluralize(count, 'record')} on ${pluralize(days.length, 'day')}`} />
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <SelectField
          size="sm"
          aria-label="Filter timeline by employee"
          placeholder="All employees"
          options={employeeOptions}
          value={employee}
          onChange={(e) => {
            setEmployee(e.target.value);
            setVisibleDays(DAYS_STEP);
          }}
          className="w-full sm:w-48"
        />
        <DateRangePicker
          compact
          label="Timeline period"
          value={range}
          onChange={(r) => {
            setRange(r);
            setVisibleDays(DAYS_STEP);
          }}
        />
        {isFiltered && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEmployee('');
              setRange({ from: '', to: '' });
            }}
          >
            Reset
          </Button>
        )}
      </div>
      {days.length === 0 ? (
        <EmptyState compact title="No attendance records" description={isFiltered ? 'No records match the selected filters.' : 'No one has checked in on this project yet.'} />
      ) : (
        <div className="divide-y divide-line">
          {days.slice(0, visibleDays).map((day) => (
            <section key={day.key} aria-label={formatDate(day.key, 'EEEE dd MMMM yyyy')}>
              <div className="flex items-center justify-between gap-2 bg-subtle/60 px-5 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">{formatDate(day.key, 'EEE dd MMM yyyy')}</h3>
                <span className="tabular text-xs text-ink-muted">
                  {pluralize(day.items.length, 'shift')} · {formatDuration(day.minutes)}
                </span>
              </div>
              <ul className="divide-y divide-line">
                {day.items.map((r) => {
                  const name = employeesById[r.employeeId]?.fullName ?? 'Unknown employee';
                  return (
                    <li key={r.id} className="flex flex-col gap-2 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={name} size="xs" />
                        <div className="min-w-0">
                          <Link to={`/attendance/${r.id}`} className="text-sm font-medium text-ink hover:text-brand-700 hover:underline">
                            {name}
                          </Link>
                          <p className="tabular text-xs text-ink-muted">
                            {formatTime(r.checkInAt)} – {r.checkOutAt ? formatTime(r.checkOutAt) : 'open'}
                            {showProject && projectsById[r.projectId] ? ` · ${projectsById[r.projectId].name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:justify-end">
                        <span className="tabular text-sm text-ink">
                          {formatDuration(liveDuration(r, rules.now))}
                          {isShiftOpen(r) && <span className="ml-1 text-xs text-ink-muted">so far</span>}
                          {isBillableAdjusted(r) && <span className="block text-right text-2xs text-ink-muted">Billable {formatDuration(getBillableMinutes(r))}</span>}
                        </span>
                        <StatusBadge kind="attendance" status={displayAttendanceStatus(r, rules)} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {days.length > visibleDays && (
            <div className="flex justify-center px-5 py-3">
              <Button size="sm" variant="secondary" onClick={() => setVisibleDays((n) => n + DAYS_STEP)}>
                Show {Math.min(DAYS_STEP, days.length - visibleDays)} more days
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
