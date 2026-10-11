import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { Button } from '../common/Button';
import { formatHoursValue, truncate } from '../../utils/formatters';
import { axisProps, BAR_SIZE, CHROME, hoursTick, SERIES } from './chartTheme';
import { ChartTooltip } from './ChartTooltip';
import { ChartDataTable } from './ChartDataTable';

const MAX_BARS = 6;

/** Approved billable hours per customer for the selected period (horizontal bars). */
export function BillableByCustomerChart({ data, range, periodLabel }) {
  const navigate = useNavigate();

  const rows = useMemo(() => {
    if (data.length <= MAX_BARS) return data;
    const head = data.slice(0, MAX_BARS - 1);
    const rest = data.slice(MAX_BARS - 1);
    return [
      ...head,
      {
        id: null,
        name: `Other (${rest.length})`,
        billableHours: Math.round(rest.reduce((s, r) => s + r.billableHours, 0) * 10) / 10,
        recordedHours: Math.round(rest.reduce((s, r) => s + r.recordedHours, 0) * 10) / 10,
      },
    ];
  }, [data]);

  const query = `from=${range.from}&to=${range.to}`;
  const openCustomer = (entry) => {
    const id = entry?.payload?.id ?? entry?.id;
    if (id) navigate(`/billing/hours?customer=${id}&${query}`);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={Building2}
        title="Billable hours by customer"
        description={`Approved hours · ${periodLabel}`}
        action={
          <Button variant="ghost" size="xs" to={`/billing/hours?${query}`}>
            Details
          </Button>
        }
      />
      <CardBody className="flex-1">
        {rows.length === 0 ? (
          <EmptyState compact icon={Building2} title="No customer hours yet" description="Hours appear here once shifts in this period are completed." />
        ) : (
          <>
            <div style={{ height: rows.length * 40 + 32 }} aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 52, bottom: 0, left: 0 }} barCategoryGap={8}>
                  <CartesianGrid stroke={CHROME.grid} horizontal={false} />
                  <XAxis type="number" {...axisProps} tickFormatter={hoursTick} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    {...axisProps}
                    axisLine={false}
                    width={118}
                    tickFormatter={(v) => truncate(String(v), 18)}
                  />
                  <Tooltip
                    cursor={{ fill: CHROME.cursor }}
                    content={
                      <ChartTooltip
                        rows={(payload) => [
                          { key: 'billable', name: 'Billable (approved)', value: formatHoursValue(payload[0].payload.billableHours), color: SERIES.primary },
                          { key: 'recorded', name: 'Recorded', value: formatHoursValue(payload[0].payload.recordedHours) },
                        ]}
                      />
                    }
                  />
                  <Bar
                    dataKey="billableHours"
                    name="Billable hours"
                    fill={SERIES.primary}
                    barSize={BAR_SIZE}
                    radius={[0, 4, 4, 0]}
                    onClick={openCustomer}
                    className="cursor-pointer"
                    isAnimationActive={false}
                  >
                    <LabelList dataKey="billableHours" position="right" formatter={(v) => `${v} h`} fill={CHROME.ink} fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-2xs text-ink-muted">Select a bar to open that customer&apos;s billable hours.</p>
            <ChartDataTable
              caption="Billable hours by customer"
              columns={[
                { key: 'name', header: 'Customer', value: (r) => r.name },
                { key: 'billable', header: 'Billable hours', value: (r) => formatHoursValue(r.billableHours) },
                { key: 'recorded', header: 'Recorded hours', value: (r) => formatHoursValue(r.recordedHours) },
              ]}
              rows={rows}
              getRowId={(r) => r.id ?? r.name}
            />
          </>
        )}
      </CardBody>
    </Card>
  );
}
