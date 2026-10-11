import { DataTable } from '../common/DataTable';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { PAYMENT_METHODS } from '../../services/invoiceService';
import { formatDate, formatDateTime } from '../../utils/dateUtils';

/** Payment history of one invoice (accounting records). */
export function InvoicePaymentsTable({ payments, currency, emptyState }) {
  const columns = [
    { key: 'date', header: 'Payment date', primary: true, sortValue: (p) => p.paymentDate, render: (p) => <span className="whitespace-nowrap font-medium">{formatDate(p.paymentDate)}</span> },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (p) => p.amount, render: (p) => <MoneyDisplay amount={p.amount} currency={currency} className="font-medium text-ink" /> },
    { key: 'method', header: 'Method', render: (p) => PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method },
    { key: 'reference', header: 'Reference', render: (p) => p.reference || <span className="text-ink-muted">—</span> },
    { key: 'notes', header: 'Notes', render: (p) => (p.notes ? <span className="block max-w-[16rem] truncate" title={p.notes}>{p.notes}</span> : <span className="text-ink-muted">—</span>) },
    {
      key: 'recorded',
      header: 'Recorded',
      mobile: false,
      render: (p) => (
        <span className="whitespace-nowrap text-xs text-ink-muted">
          {formatDateTime(p.recordedAt)}
          {p.recordedBy ? ` · ${p.recordedBy}` : ''}
        </span>
      ),
    },
  ];
  return <DataTable columns={columns} rows={payments} initialSort={{ key: 'date', dir: 'asc' }} paginate={false} dense emptyState={emptyState} caption="Payments" />;
}
