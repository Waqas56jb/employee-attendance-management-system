import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge, getStatusMeta } from '../common/StatusBadge';
import { formatMoney } from '../../utils/currency';
import { formatNumber, pluralize } from '../../utils/formatters';
import { CHROME, INVOICE_STATUS_COLORS, INVOICE_STATUS_ORDER } from './chartTheme';
import { ChartTooltip } from './ChartTooltip';

/** Invoice count per payment status for invoices issued in the period. */
export function InvoiceStatusChart({ data, currency, periodLabel }) {
  const rows = [...data].sort((a, b) => INVOICE_STATUS_ORDER.indexOf(a.status) - INVOICE_STATUS_ORDER.indexOf(b.status));
  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader icon={PieIcon} title="Invoice payment status" description={`Invoices dated ${periodLabel}`} />
      <CardBody className="flex-1">
        {total === 0 ? (
          <EmptyState compact icon={PieIcon} title="No invoices in this period" description="Pick a wider date range to see invoice statuses." />
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col 2xl:flex-row">
            <div className="relative h-44 w-44 shrink-0" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rows}
                    dataKey="count"
                    nameKey="status"
                    innerRadius="64%"
                    outerRadius="100%"
                    stroke={CHROME.surface}
                    strokeWidth={2}
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={false}
                  >
                    {rows.map((r) => (
                      <Cell key={r.status} fill={INVOICE_STATUS_COLORS[r.status] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <ChartTooltip
                        rows={(payload) => {
                          const r = payload[0].payload;
                          return [
                            { key: 'count', name: getStatusMeta('invoice', r.status).label, value: pluralize(r.count, 'invoice'), color: INVOICE_STATUS_COLORS[r.status] },
                            { key: 'total', name: 'total value', value: formatMoney(r.total, currency) },
                          ];
                        }}
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="tabular text-2xl font-semibold text-ink">{formatNumber(total)}</span>
                <span className="text-2xs text-ink-muted">invoices</span>
              </div>
            </div>
            <ul className="w-full min-w-0 flex-1 space-y-1" aria-label="Invoices by status">
              {rows.map((r) => (
                <li key={r.status}>
                  <Link
                    to={`/invoices?status=${r.status}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-subtle"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: INVOICE_STATUS_COLORS[r.status] }} aria-hidden />
                    <StatusBadge kind="invoice" status={r.status} />
                    <span className="tabular ml-auto font-semibold text-ink">{formatNumber(r.count)}</span>
                    <span className="tabular hidden w-24 text-right text-xs text-ink-muted sm:inline">{formatMoney(r.total, currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
