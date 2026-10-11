import { useId, useState } from 'react';
import { toast } from 'sonner';
import { useCustomers } from '../../hooks/useCustomers';
import { useBilling } from '../../hooks/useBilling';
import { useInvoices } from '../../hooks/useInvoices';
import { customerToForm } from '../../services/customerService';
import { getCurrentRate } from '../../utils/calculations';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CustomerForm } from './CustomerForm';

/** Edit a customer in a modal by reusing the create form. Mount only while open. */
export function CustomerEditModal({ customer, onClose }) {
  const { updateCustomer } = useCustomers();
  const { hourlyRates } = useBilling();
  const { invoices } = useInvoices();
  const formId = useId();
  const [saving, setSaving] = useState(false);
  const [currentRate] = useState(() => getCurrentRate(hourlyRates, customer.id, customer.currency));
  const [defaults] = useState(() => customerToForm(customer, currentRate));
  const currencyLocked = invoices.some((inv) => inv.customerId === customer.id);

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      // Status changes use the dedicated actions (archive rules, audit reason).
      await updateCustomer(customer.id, { ...values, status: customer.status });
      toast.success('Customer updated', { description: 'Issued invoices keep the customer details they were created with.' });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!saving}
      size="lg"
      title={`Edit ${customer.companyName}`}
      description="Changes apply to new invoices. Finalized invoices keep their own snapshot of these details."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <CustomerForm
        mode="edit"
        variant="modal"
        formId={formId}
        defaultValues={defaults}
        onSubmit={onSubmit}
        customer={customer}
        currentRate={currentRate}
        currencyLocked={currencyLocked}
      />
    </Modal>
  );
}
