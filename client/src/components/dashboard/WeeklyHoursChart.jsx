import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Table2 } from 'lucide-react';
import { useAttendance } from '../../hooks/useAttendance';
import { useNow } from '../../hooks/useNow';
import { usePreferences } from '../../hooks/usePreferences';
import { useThemeColors } from '../../hooks/useThemeColors';
import { buildWeekSeries } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';
import { Card, CardHeader } from '../common/Card';
import { Skeleton } from '../common/LoadingSpinner';
import { SegmentedControl } from '../common/SegmentedControl';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const day = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-raised">
      <p className="font-semibold text-ink">{day.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
      <p className="tabular mt-1 text-ink-secondary">Completed: {formatDuration(day.completedMinutes)}</p>
      {day.activeMinutes > 0 && <p className="tabular text-ink-secondary">In progress: {formatDuration(day.activeMinutes)}</p>}
    </div>
  );
}

/** This week's hours per day. Completed time and live in-progress time are stacked. */
export function WeeklyHoursChart() {
  const { records, activeShift, isLoading } = useAttendance();
  const { preferences } = usePreferences();
  const colors = useThemeColors();
  const now = useNow(60_000, Boolean(activeShift));
  const [view, setView] = useState('chart');

  const series = useMemo(
    () =>
      buildWeekSeries(records, activeShift, now, preferences.weekStartsOn).map((d) => ({
        ...d,
        completed: +(d.completedMinutes / 60).toFixed(2),
        active: +(d.activeMinutes / 60).toFixed(2),
      })),
    [records, activeShift, now, preferences.weekStartsOn],
  );

  const totalMinutes = series.reduce((sum, d) => sum + d.completedMinutes + d.activeMinutes, 0);
  const hasActive = series.some((d) => d.activeMinutes > 0);

  return (
    <Card>
      <CardHeader
        title="Hours this week"
        description={`${formatDuration(totalMinutes)} recorded${hasActive ? ' (including the active shift)' : ''}`}
        action={
          <SegmentedControl
            label="Display as"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'chart', label: 'Chart', icon: BarChart3 },
              { value: 'table', label: 'Table', icon: Table2 },
            ]}
          />
        }
      />
      {isLoading ? (
        <Skeleton className="h-60 w-full" />
      ) : view === 'chart' ? (
        <>
          <div className="h-60 w-full" role="img" aria-label={`Bar chart of hours worked per day this week, total ${formatDuration(totalMinutes)}.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke={colors.line} strokeDasharray="0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: colors['ink-muted'], fontSize: 12 }} dy={6} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: colors['ink-muted'], fontSize: 12 }}
                  tickFormatter={(v) => `${v}h`}
                  domain={[0, (max) => Math.max(8, Math.ceil(max))]}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: colors.line, opacity: 0.45 }} />
                <Bar dataKey="completed" stackId="hours" fill={colors['brand-600']} radius={hasActive ? [0, 0, 0, 0] : [4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="active" stackId="hours" fill={colors.success} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-secondary" aria-hidden="true">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors['brand-600'] }} /> Completed
            </span>
            {hasActive && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors.success }} /> In progress
              </span>
            )}
          </div>
        </>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">Hours worked per day this week</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted">
              <th scope="col" className="py-2 font-semibold">Day</th>
              <th scope="col" className="py-2 text-right font-semibold">Completed</th>
              <th scope="col" className="py-2 text-right font-semibold">In progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {series.map((d) => (
              <tr key={d.key} className={d.isToday ? 'font-medium text-ink' : 'text-ink-secondary'}>
                <th scope="row" className="py-2 text-left font-normal">
                  {d.date.toLocaleDateString(undefined, { weekday: 'long' })}
                  {d.isToday && <span className="ml-1.5 text-xs text-brand-700">Today</span>}
                </th>
                <td className="tabular py-2 text-right">{formatDuration(d.completedMinutes)}</td>
                <td className="tabular py-2 text-right">{d.activeMinutes ? formatDuration(d.activeMinutes) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export default WeeklyHoursChart;
