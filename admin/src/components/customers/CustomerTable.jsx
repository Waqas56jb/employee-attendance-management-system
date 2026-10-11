import { Link } from 'react-router-dom';
import { AlertTriangle, Building2 } from 'lucide-react';
import { Badge } from '../common/Badge';
import { DataTable } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { StatusBadge } from '../common/StatusBadge';
import { formatDuration } from '../../utils/formatters';
import { CustomerRowActions } from './CustomerRowActions';

/** rows: customers enriched by buildCustomerRows(). */
export function CustomerTable({ rows, onAction, onRowClick, emptyAction, isFiltered }) {
  const columns = [
    {
      key: 'name',
      header: 'Customer',
      primary: true,
      sortValue: (c) => c.companyName,
      render: (c) => (
        <span className="block min-w-0">
          <Link to={`/customers/${c.id}`} className="block max-w-[16rem] truncate font-medium text-ink hover:text-brand-700 hover:underline">
            {c.companyName}
          </Link>
          <span className="tabular block text-xs text-ink-muted">{c.customerNumber}</span>
        </span>
      ),
    },
    { key: 'contact', header: 'Contact person', sortValue: (c) => c.contactPerson, render: (c) => <span className="whitespace-nowrap">{c.contactPerson}</span> },
    {
      key: 'email',
      header: 'Email',
      sortValue: (c) => c.email,
      render: (c) => (
        <a href={`mailto:${c.email}`} className="block max-w-[14rem] truncate text-ink-secondary hover:text-brand-700">
          {c.email}
        </a>
      ),
    },
    { key: 'phone', header: 'Phone', render: (c) => <span className="whitespace-nowrap text-ink-secondary">{c.phone}</span> },
    { key: 'activeProjects', header: 'Active projects', align: 'right', sortValue: (c) => c.activeProjects },
    { key: 'hours', header: 'Recorded hours', align: 'right', sortValue: (c) => c.recordedMinutes, render: (c) => formatDuration(c.recordedMinutes) },
    {
      key: 'rate',
      header: 'Hourly rate',
      align: 'right',
      sortValue: (c) => c.currentRate?.amount ?? null,
      render: (c) =>
        c.currentRate ? (
          <span className="whitespace-nowrap">
            <MoneyDisplay amount={c.currentRate.amount} currency={c.currentRate.currency} />
            <span className="text-ink-muted">/h</span>
          </span>
        ) : (
          <Badge tone="warning" icon={AlertTriangle}>
            No active rate
          </Badge>
        ),
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      sortValue: (c) => c.outstanding,
      render: (c) => <MoneyDisplay amount={c.outstanding} currency={c.currency} muted={!c.outstanding} />,
    },
    { key: 'status', header: 'Status', sortValue: (c) => c.status, render: (c) => <StatusBadge kind="customer" status={c.status} /> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', render: (c) => <CustomerRowActions customer={c} onAction={onAction} /> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      initialSort={{ key: 'name', dir: 'asc' }}
      onRowClick={onRowClick}
      caption="Customers"
      emptyState={
        <EmptyState
          icon={Building2}
          title={isFiltered ? 'No customers match these filters' : 'No customers yet'}
          description={isFiltered ? 'Try a different search term or reset the filters.' : 'Add a customer to create projects and invoices.'}
          action={emptyAction}
        />
      }
    />
  );
}
