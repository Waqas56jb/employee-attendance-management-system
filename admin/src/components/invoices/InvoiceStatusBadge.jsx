import clsx from 'clsx';
import { StatusBadge } from '../common/StatusBadge';
import { INVOICE_STATUS, isPastDue } from '../../utils/calculations';
import { formatDate } from '../../utils/dateUtils';
import { displayStatus } from './invoiceUtils';

/**
 * Invoice status (re-evaluated against today). A partially paid invoice past
 * its due date gets a small "past due" hint so it is not overlooked.
 */
export function InvoiceStatusBadge({ invoice, showHint = true, className }) {
  const status = displayStatus(invoice);
  const pastDue = showHint && status === INVOICE_STATUS.PARTIALLY_PAID && isPastDue({ ...invoice, status });
  return (
    <span className={clsx('inline-flex flex-col items-start gap-0.5', className)}>
      <StatusBadge kind="invoice" status={status} />
      {pastDue && <span className="text-2xs font-medium text-danger-ink">Past due since {formatDate(invoice.dueDate)}</span>}
    </span>
  );
}
