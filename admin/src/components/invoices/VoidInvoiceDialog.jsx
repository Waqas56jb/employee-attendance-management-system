import { ConfirmDialog } from '../common/ConfirmDialog';
import { useInvoices } from '../../hooks/useInvoices';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { invoiceLabel } from '../../services/invoiceService';
import { formatMoney } from '../../utils/currency';

/** Voids a finalized invoice with an audit reason. The number and history are kept. */
export function VoidInvoiceDialog({ open, onClose, invoice, onVoided }) {
  const { voidInvoice } = useInvoices();
  const [run] = useAsyncAction();
  if (!invoice) return null;

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={`Void ${invoiceLabel(invoice)}?`}
      confirmLabel="Void invoice"
      requireReason
      reasonLabel="Reason for voiding"
      reasonPlaceholder="E.g. Issued with the wrong tax rate — replaced by a corrected invoice."
      onConfirm={async (reason) => {
        const result = await run(() => voidInvoice(invoice.id, reason), { success: `${invoiceLabel(invoice)} voided`, rethrow: true });
        onVoided?.(result);
      }}
      message={
        <div className="space-y-2">
          <p>
            The invoice ({formatMoney(invoice.total, invoice.currency)}) will no longer count as revenue or be collectable. Its number and history stay on
            record — finalized invoices are never deleted.
          </p>
          <p>
            Its attendance records stay linked to this invoice. To bill them again you must explicitly release them afterwards.
          </p>
        </div>
      }
    />
  );
}
