import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';
import { useBusiness } from '../../hooks/useBusiness';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { CustomerForm } from '../../components/customers/CustomerForm';

export default function CreateCustomerPage() {
  const navigate = useNavigate();
  const { createCustomer, suggestCustomerNumber } = useCustomers();
  const { business, invoiceSettings } = useBusiness();

  const [defaults] = useState(() => ({
    companyName: '',
    customerNumber: suggestCustomerNumber(),
    contactPerson: '',
    email: '',
    phone: '',
    billingStreet: '',
    serviceStreet: '',
    postalCode: '',
    city: '',
    country: '',
    taxId: '',
    paymentTerms: invoiceSettings.defaultPaymentTerms,
    currency: business.currency,
    defaultHourlyRate: '',
    taxRate: '',
    notes: '',
    status: 'active',
  }));

  const onSubmit = async (values) => {
    const customer = await createCustomer(values);
    toast.success('Customer created', { description: 'The default hourly rate is effective from today.' });
    navigate(`/customers/${customer.id}`);
  };

  return (
    <>
      <PageHeader
        title="Add customer"
        description="Create the customer, its billing details and the initial hourly rate."
        breadcrumbs={[{ label: 'Customers', to: '/customers' }, { label: 'Add customer' }]}
      />
      <div className="mx-auto max-w-4xl">
        <CustomerForm
          mode="create"
          variant="page"
          defaultValues={defaults}
          onSubmit={onSubmit}
          footer={({ isSubmitting }) => (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" to="/customers" disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" icon={Plus} loading={isSubmitting}>
                Create customer
              </Button>
            </div>
          )}
        />
      </div>
    </>
  );
}
