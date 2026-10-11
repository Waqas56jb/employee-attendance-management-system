import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { DataTable } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { StatusBadge } from '../common/StatusBadge';
import { invoiceLabel } from '../../services/invoiceService';
import { hoursToHundredths } from '../../utils/calculations';
import { formatDate, formatPeriod } from '../../utils/dateUtils';
import { formatHoursValue } from '../../utils/formatters';

/** Invoices with at least one line for this project, with this project's share of hours and amount. */
export function ProjectInvoiceHistory({ projectId, invoices }) {
  const rows = useMemo(
    () =>
      invoices
        .map((inv) => {
          const lines = inv.lineItems.filter((l) => l.projectId === projectId);
          if (lines.length === 0) return null;
          return {
            id: inv.id,
            invoice: inv,
            hours: lines.filter((l) => l.type === 'hours').reduce((s, l) => s + hoursToHundredths(l.quantityHours), 0) / 100,
            amount: lines.reduce((s, l) => s + (Number(l.amount) || 0), 0),
          };
        })
        .filter(Boolean),
    [invoices, projectId],
  );

  const columns = [
    {
      key: 'number',
      header: 'Invoice',
      primary: true,
      sortValue: (r) => invoiceLabel(r.invoice),
      render: (r) => (
        <Link to={`/invoices/${r.id}`} className="font-medium text-ink hover:text-brand-700 hover:underline">
          {invoiceLabel(r.invoice)}
        </Link>
      ),
    },
    { key: 'date', header: 'Issue date', sortValue: (r) => r.invoice.issueDate, render: (r) => formatDate(r.invoice.issueDate) },
    { key: 'period', header: 'Period', mobile: false, render: (r) => <span className="whitespace-nowrap text-ink-secondary">{formatPeriod(r.invoice.billingPeriodStart, r.invoice.billingPeriodEnd)}</span> },
    { key: 'hours', header: 'Hours (this project)', align: 'right', sortValue: (r) => r.hours, render: (r) => formatHoursValue(r.hours) },
    { key: 'amount', header: 'Amount (this project)', align: 'right', sortValue: (r) => r.amount, render: (r) => <MoneyDisplay amount={r.amount} currency={r.invoice.currency} /> },
    { key: 'status', header: 'Status', sortValue: (r) => r.invoice.status, render: (r) => <StatusBadge kind="invoice" status={r.invoice.status} /> },
  ];

  return (
    <Card>
      <CardHeader icon={Receipt} title="Invoice history" description="Amounts are net line totals for this project (before discount and tax)." />
      <DataTable
        columns={columns}
        rows={rows}
        pageSize={6}
        dense
        initialSort={{ key: 'date', dir: 'desc' }}
        emptyState={<EmptyState compact title="Not invoiced yet" description="Invoices that include hours from this project will be listed here." />}
      />
    </Card>
  );
}
