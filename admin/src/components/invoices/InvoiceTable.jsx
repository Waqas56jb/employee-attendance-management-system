import { Link, useNavigate } from 'react-router-dom';
import { Ban, Banknote, Download, Eye, FileSearch } from 'lucide-react';
import { DataTable } from '../common/DataTable';
import { Button } from '../common/Button';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { invoiceLabel } from '../../services/invoiceService';
import { formatDate, formatPeriod } from '../../utils/dateUtils';
import { canRecordPayment, canVoid, displayStatus, invoiceCustomerName, VOID_BLOCKED_REASON } from './invoiceUtils';

/**
 * Invoice list. Rows are already filtered; sorting and pagination happen in DataTable.
 * Action callbacks receive the invoice.
 */
export function InvoiceTable({ invoices, customersById, onPreview, onDownload, onRecordPayment, onVoid, emptyState, downloadingId }) {
  const navigate = useNavigate();

  const columns = [
    {
      key: 'number',
      header: 'Invoice',
      primary: true,
      sortValue: (inv) => invoiceLabel(inv),
      render: (inv) => (
        <Link to={`/invoices/${inv.id}`} className="font-medium text-brand-700 hover:underline">
          {invoiceLabel(inv)}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sortValue: (inv) => invoiceCustomerName(inv, customersById),
      render: (inv) => <span className="block max-w-[14rem] truncate text-ink">{invoiceCustomerName(inv, customersById)}</span>,
    },
    { key: 'issueDate', header: 'Issue date', sortValue: (inv) => inv.issueDate, render: (inv) => <span className="whitespace-nowrap">{formatDate(inv.issueDate)}</span> },
    { key: 'dueDate', header: 'Due date', sortValue: (inv) => inv.dueDate, render: (inv) => <span className="whitespace-nowrap">{formatDate(inv.dueDate)}</span> },
    {
      key: 'period',
      header: 'Billing period',
      mobile: false,
      sortValue: (inv) => inv.billingPeriodStart,
      render: (inv) => <span className="whitespace-nowrap text-ink-secondary">{formatPeriod(inv.billingPeriodStart, inv.billingPeriodEnd)}</span>,
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      align: 'right',
      mobile: false,
      sortValue: (inv) => inv.subtotal,
      render: (inv) => <MoneyDisplay amount={inv.subtotal} currency={inv.currency} />,
    },
    {
      key: 'tax',
      header: 'Tax',
      align: 'right',
      mobile: false,
      sortValue: (inv) => inv.taxAmount,
      render: (inv) => <MoneyDisplay amount={inv.taxAmount} currency={inv.currency} muted={!inv.taxAmount} />,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortValue: (inv) => inv.total,
      render: (inv) => <MoneyDisplay amount={inv.total} currency={inv.currency} className="font-medium text-ink" />,
    },
    {
      key: 'paid',
      header: 'Amount paid',
      align: 'right',
      sortValue: (inv) => inv.amountPaid,
      render: (inv) => <MoneyDisplay amount={inv.amountPaid} currency={inv.currency} muted={!inv.amountPaid} />,
    },
    {
      key: 'balance',
      header: 'Outstanding',
      align: 'right',
      sortValue: (inv) => (inv.voidedAt || !inv.finalizedAt ? 0 : inv.balanceDue),
      render: (inv) =>
        inv.voidedAt || !inv.finalizedAt ? (
          <span className="text-ink-muted">—</span>
        ) : (
          <MoneyDisplay amount={inv.balanceDue} currency={inv.currency} className={inv.balanceDue > 0 ? 'font-medium text-ink' : ''} muted={inv.balanceDue <= 0} />
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (inv) => displayStatus(inv),
      render: (inv) => <InvoiceStatusBadge invoice={inv} />,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (inv) => {
        const label = invoiceLabel(inv);
        const voidable = canVoid(inv);
        const voidBlocked = voidable && inv.amountPaid > 0;
        return (
          <div className="flex items-center justify-end gap-0.5">
            <Button variant="ghost" size="icon-sm" icon={Eye} aria-label={`View ${label}`} title="View details" onClick={() => navigate(`/invoices/${inv.id}`)} />
            <Button variant="ghost" size="icon-sm" icon={FileSearch} aria-label={`Preview ${label}`} title="Preview" onClick={() => onPreview(inv)} />
            <Button
              variant="ghost"
              size="icon-sm"
              icon={Download}
              aria-label={`Download PDF of ${label}`}
              title="Download PDF"
              loading={downloadingId === inv.id}
              onClick={() => onDownload(inv)}
            />
            {canRecordPayment(inv) && (
              <Button variant="ghost" size="icon-sm" icon={Banknote} aria-label={`Record payment for ${label}`} title="Record payment" onClick={() => onRecordPayment(inv)} />
            )}
            {voidable && (
              <Button
                variant="danger-ghost"
                size="icon-sm"
                icon={Ban}
                aria-label={voidBlocked ? `${label} cannot be voided: payments recorded` : `Void ${label}`}
                title={voidBlocked ? VOID_BLOCKED_REASON : 'Void invoice'}
                disabled={voidBlocked}
                onClick={() => onVoid(inv)}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={invoices}
      initialSort={{ key: 'issueDate', dir: 'desc' }}
      pageSize={12}
      onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
      emptyState={emptyState}
      caption="Invoices"
      dense
    />
  );
}
