import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Receipt } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { Button } from '../common/Button';
import { formatMoney } from '../../utils/currency';
import { axisProps, BAR_SIZE, CHROME, compactMoneyMajor, gridProps, SERIES } from './chartTheme';
import { ChartLegend, ChartTooltip } from './ChartTooltip';
import { ChartDataTable } from './ChartDataTable';

/** Invoiced (finalized invoices by issue month) vs collected (payments by payment month). */
export function BillingOverviewChart({ data, currency }) {
  const invoiced = data.reduce((s, m) => s + m.invoiced, 0);
  const collected = data.reduce((s, m) => s + m.collected, 0);
  const hasData = invoiced > 0 || collected > 0;

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={Receipt}
        title="Monthly invoiced amount"
        description={`Last ${data.length} months · invoiced vs payments collected (${currency})`}
        action={
          <Button variant="ghost" size="xs" to="/reports?type=monthly_billing">
            Report
          </Button>
        }
      />
      <CardBody className="flex-1">
        {!hasData ? (
          <EmptyState compact icon={Receipt} title="No invoices issued yet" description="Finalized invoices and recorded payments will be charted here." />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <dl className="flex gap-6">
                <div>
                  <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">Invoiced</dt>
                  <dd className="tabular text-lg font-semibold text-ink">{formatMoney(invoiced, currency)}</dd>
                </div>
                <div>
                  <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">Collected</dt>
                  <dd className="tabular text-lg font-semibold text-ink">{formatMoney(collected, currency)}</dd>
                </div>
              </dl>
              <ChartLegend
                items={[
                  { label: 'Invoiced (incl. tax)', color: SERIES.primary },
                  { label: 'Collected', color: SERIES.secondary },
                ]}
              />
            </div>
            <div className="h-64" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="28%">
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v) => compactMoneyMajor(v, currency)} />
                  <Tooltip
                    cursor={{ fill: CHROME.cursor }}
                    content={
                      <ChartTooltip
                        rows={(payload) => {
                          const m = payload[0].payload;
                          return [
                            { key: 'invoiced', name: 'Invoiced', value: formatMoney(m.invoiced, currency), color: SERIES.primary },
                            { key: 'collected', name: 'Collected', value: formatMoney(m.collected, currency), color: SERIES.secondary },
                          ];
                        }}
                      />
                    }
                  />
                  <Bar dataKey="invoicedMajor" name="Invoiced" fill={SERIES.primary} barSize={BAR_SIZE} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="collectedMajor" name="Collected" fill={SERIES.secondary} barSize={BAR_SIZE} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-2xs text-ink-muted">
              Invoiced counts finalized, non-void invoices by issue month. Collected counts payments actually recorded, by payment date.
            </p>
            <ChartDataTable
              caption="Monthly invoiced and collected amounts"
              columns={[
                { key: 'label', header: 'Month', value: (r) => r.label },
                { key: 'invoiced', header: 'Invoiced', value: (r) => formatMoney(r.invoiced, currency) },
                { key: 'collected', header: 'Collected', value: (r) => formatMoney(r.collected, currency) },
              ]}
              rows={data}
            />
          </>
        )}
      </CardBody>
    </Card>
  );
}
