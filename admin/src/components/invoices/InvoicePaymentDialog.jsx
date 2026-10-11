import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Callout } from '../common/Callout';
import { FormField, FormGrid, Input, Textarea } from '../common/FormField';
import { SelectField } from '../common/SelectField';
import { useInvoices } from '../../hooks/useInvoices';
import { PAYMENT_METHODS, invoiceLabel } from '../../services/invoiceService';
import { formatMoney, toMajor, toMinor } from '../../utils/currency';
import { formatDate, todayKey } from '../../utils/dateUtils';
import { paymentSchema } from '../../utils/validation';

/**
 * Records a payment received outside the app (accounting record only —
 * nothing is charged or transferred).
 */
export function InvoicePaymentDialog({ open, onClose, invoice, onRecorded }) {
  const { recordPayment } = useInvoices();
  const formId = useId();
  const today = todayKey();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(paymentSchema) });

  useEffect(() => {
    if (open && invoice) {
      reset({
        paymentDate: today < invoice.issueDate ? invoice.issueDate : today,
        amount: toMajor(invoice.balanceDue, invoice.currency).toFixed(2),
        method: 'bank_transfer',
        reference: '',
        notes: '',
      });
    }
  }, [open, invoice, reset, today]);

  if (!invoice) return null;

  const onSubmit = async (values) => {
    // Client-side checks mirror the service rules for immediate feedback.
    if (values.paymentDate > today) {
      setError('paymentDate', { message: 'Payment date cannot be in the future.' });
      return;
    }
    if (values.paymentDate < invoice.issueDate) {
      setError('paymentDate', { message: `Payment date cannot be before the invoice date (${formatDate(invoice.issueDate)}).` });
      return;
    }
    if (toMinor(values.amount, invoice.currency) > invoice.balanceDue) {
      setError('amount', { message: `Amount exceeds the outstanding balance of ${formatMoney(invoice.balanceDue, invoice.currency)}.` });
      return;
    }
    try {
      const result = await recordPayment(invoice.id, values);
      toast.success(
        result.invoice.balanceDue <= 0
          ? `${invoiceLabel(invoice)} is now paid in full.`
          : `Payment recorded. ${formatMoney(result.invoice.balanceDue, invoice.currency)} still outstanding.`,
      );
      onRecorded?.(result);
      onClose();
    } catch (error) {
      if (error?.field) setError(error.field, { message: error.message });
      else toast.error(error?.message ?? 'The payment could not be recorded.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!isSubmitting}
      title={`Record payment — ${invoiceLabel(invoice)}`}
      description={`Outstanding balance: ${formatMoney(invoice.balanceDue, invoice.currency)} of ${formatMoney(invoice.total, invoice.currency)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting}>
            Record payment
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Callout tone="demo">
          This is an accounting record of money you already received. No payment is processed, charged or transferred by this app.
        </Callout>
        <FormGrid>
          <FormField label="Payment date" required error={errors.paymentDate?.message}>
            <Input type="date" min={invoice.issueDate} max={today} {...register('paymentDate')} />
          </FormField>
          <FormField label="Amount" required error={errors.amount?.message} hint="Defaults to the full outstanding balance.">
            <Input inputMode="decimal" suffix={invoice.currency} {...register('amount')} />
          </FormField>
          <FormField label="Payment method" required error={errors.method?.message}>
            <SelectField options={PAYMENT_METHODS} {...register('method')} />
          </FormField>
          <FormField label="Reference" optional error={errors.reference?.message} hint="Bank transaction ID, receipt number…">
            <Input maxLength={80} {...register('reference')} />
          </FormField>
        </FormGrid>
        <FormField label="Notes" optional error={errors.notes?.message}>
          <Textarea rows={2} maxLength={500} {...register('notes')} />
        </FormField>
      </form>
    </Modal>
  );
}
