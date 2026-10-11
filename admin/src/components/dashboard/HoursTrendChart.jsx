import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { formatHoursValue } from '../../utils/formatters';
import { axisProps, CHROME, gridProps, hoursTick, SERIES } from './chartTheme';
import { ChartLegend, ChartTooltip } from './ChartTooltip';
import { ChartDataTable } from './ChartDataTable';

/** Recorded vs approved billable hours per day (or per week for long ranges). */
export function HoursTrendChart({ data, periodLabel, weekly }) {
  const recorded = data.reduce((s, d) => s + d.recorded, 0);
  const billable = data.reduce((s, d) => s + d.billable, 0);
  const hasData = recorded > 0;

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={TrendingUp}
        title="Working hours over time"
        description={`${weekly ? 'Weekly' : 'Daily'} recorded vs approved billable hours · ${periodLabel}`}
      />
      <CardBody className="flex-1">
        {!hasData ? (
          <EmptyState compact icon={TrendingUp} title="No hours recorded in this period" description="Completed shifts will appear here once employees check out." />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <dl className="flex gap-6">
                <div>
                  <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">Recorded</dt>
                  <dd className="tabular text-lg font-semibold text-ink">{formatHoursValue(recorded / 60)}</dd>
                </div>
                <div>
                  <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">Billable (approved)</dt>
                  <dd className="tabular text-lg font-semibold text-ink">{formatHoursValue(billable / 60)}</dd>
                </div>
              </dl>
              <ChartLegend
                items={[
                  { label: 'Recorded hours', color: SERIES.primary },
                  { label: 'Billable hours', color: SERIES.secondary, shape: 'line' },
                ]}
              />
            </div>
            <div className="h-64" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} minTickGap={18} interval="preserveStartEnd" />
                  <YAxis {...axisProps} axisLine={false} width={44} tickFormatter={hoursTick} allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: CHROME.axis, strokeWidth: 1 }}
                    content={<ChartTooltip formatValue={(v) => formatHoursValue(v)} title={(_, label) => (weekly ? `Week of ${label}` : label)} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="recordedHours"
                    name="Recorded"
                    stroke={SERIES.primary}
                    strokeWidth={2}
                    fill={SERIES.primary}
                    fillOpacity={0.1}
                    activeDot={{ r: 4, stroke: CHROME.surface, strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="billableHours"
                    name="Billable"
                    stroke={SERIES.secondary}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: CHROME.surface, strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <ChartDataTable
              caption="Recorded and billable hours over time"
              columns={[
                { key: 'label', header: weekly ? 'Week of' : 'Day', value: (r) => r.label },
                { key: 'recorded', header: 'Recorded hours', value: (r) => formatHoursValue(r.recordedHours) },
                { key: 'billable', header: 'Billable hours', value: (r) => formatHoursValue(r.billableHours) },
              ]}
              rows={data}
            />
          </>
        )}
      </CardBody>
    </Card>
  );
}
