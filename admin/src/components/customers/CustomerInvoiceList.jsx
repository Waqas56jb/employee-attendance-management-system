import { Link, useNavigate } from 'react-router-dom';
import { FilePlus2, FileText } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { DataTable } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { StatusBadge } from '../common/StatusBadge';
import { invoiceLabel } from '../../services/invoiceService';
import { formatDate, formatPeriod } from '../../utils/dateUtils';

/** Invoices of ONE customer. `invoices` must already be limited to this customer. */
export function CustomerInvoiceList({ customer, invoices, title = 'Invoices', pageSize = 10, compact = false }) {
  const navigate = useNavigate();
  const createButton = (
    <Button size="sm" icon={FilePlus2} to={`/invoices/new?customer=${customer.id}`}>
      Create invoice
    </Button>
  );

  const columns = [
    {
      key: 'number',
      header: 'Invoice',
      primary: true,
      sortValue: (i) => invoiceLabel(i),
      render: (i) => (
        <Link to={`/invoices/${i.id}`} className="tabular whitespace-nowrap font-medium text-ink hover:text-brand-700 hover:underline">
          {invoiceLabel(i)}
        </Link>
      ),
    },
    { key: 'issue', header: 'Issued', sortValue: (i) => i.issueDate, render: (i) => <span className="whitespace-nowrap">{i.finalizedAt ? formatDate(i.issueDate) : <span className="text-ink-muted">Draft</span>}</span> },
    { key: 'due', header: 'Due', sortValue: (i) => i.dueDate, render: (i) => <span className="whitespace-nowrap">{formatDate(i.dueDate)}</span>, mobile: !compact },
    {
      key: 'period',
      header: 'Billing period',
      sortValue: (i) => i.billingPeriodStart,
      render: (i) => <span className="whitespace-nowrap text-ink-secondary">{formatPeriod(i.billingPeriodStart, i.billingPeriodEnd)}</span>,
    },
    { key: 'total', header: 'Total', align: 'right', sortValue: (i) => i.total, render: (i) => <MoneyDisplay amount={i.total} currency={i.currency} /> },
    { key: 'paid', header: 'Paid', align: 'right', sortValue: (i) => i.amountPaid, render: (i) => <MoneyDisplay amount={i.amountPaid} currency={i.currency} muted={!i.amountPaid} /> },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      sortValue: (i) => (i.status === 'void' || i.status === 'draft' ? 0 : i.balanceDue),
      render: (i) =>
        i.status === 'void' || i.status === 'draft' ? <span className="text-ink-muted">—</span> : <MoneyDisplay amount={i.balanceDue} currency={i.currency} />,
    },
    { key: 'status', header: 'Status', sortValue: (i) => i.status, render: (i) => <StatusBadge kind="invoice" status={i.status} /> },
  ];

  const visibleColumns = compact ? columns.filter((c) => !['due', 'paid'].includes(c.key)) : columns;

  return (
    <Card>
      <CardHeader title={title} icon={FileText} description={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'} for ${customer.companyName}`} action={createButton} />
      <DataTable
        columns={visibleColumns}
        rows={invoices}
        initialSort={{ key: 'issue', dir: 'desc' }}
        pageSize={pageSize}
        dense={compact}
        onRowClick={(i) => navigate(`/invoices/${i.id}`)}
        caption={`Invoices of ${customer.companyName}`}
        emptyState={<EmptyState compact icon={FileText} title="No invoices yet" description="Create an invoice from approved billable hours." action={createButton} />}
      />
    </Card>
  );
}
