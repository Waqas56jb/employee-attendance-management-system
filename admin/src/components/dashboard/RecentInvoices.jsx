import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { DataTable } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { StatusBadge } from '../common/StatusBadge';
import { invoiceLabel } from '../../services/invoiceService';
import { formatDate } from '../../utils/dateUtils';

/** Most recent invoices (drafts included, clearly labelled by status). */
export function RecentInvoices({ invoices, customersById, limit = 6 }) {
  const navigate = useNavigate();
  const rows = useMemo(
    () => [...invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.createdAt.localeCompare(a.createdAt)).slice(0, limit),
    [invoices, limit],
  );

  const columns = [
    {
      key: 'number',
      header: 'Invoice',
      primary: true,
      render: (inv) => (
        <Link to={`/invoices/${inv.id}`} className="font-medium text-ink hover:text-brand-700">
          {invoiceLabel(inv)}
        </Link>
      ),
    },
    { key: 'customer', header: 'Customer', render: (inv) => <span className="block max-w-[12rem] truncate">{customersById[inv.customerId]?.companyName ?? '—'}</span> },
    { key: 'issueDate', header: 'Invoice date', render: (inv) => formatDate(inv.issueDate) },
    { key: 'dueDate', header: 'Due date', render: (inv) => formatDate(inv.dueDate) },
    { key: 'total', header: 'Total', align: 'right', render: (inv) => <MoneyDisplay amount={inv.total} currency={inv.currency} /> },
    { key: 'status', header: 'Status', render: (inv) => <StatusBadge kind="invoice" status={inv.status} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (inv) => (
        <Button variant="ghost" size="xs" to={`/invoices/${inv.id}`} aria-label={`View invoice ${invoiceLabel(inv)}`}>
          View
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader
        icon={FileText}
        title="Recent invoices"
        action={
          <Button variant="ghost" size="xs" to="/invoices">
            All invoices
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        paginate={false}
        dense
        onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
        caption="Recent invoices"
        emptyState={
          <EmptyState
            compact
            icon={FileText}
            title="No invoices yet"
            description="Create an invoice from approved billable hours."
            action={<Button size="sm" to="/invoices/new">Create invoice</Button>}
          />
        }
      />
    </Card>
  );
}
