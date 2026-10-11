import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../common/Card';
import { DescriptionList } from '../common/DescriptionList';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { StatusBadge } from '../common/StatusBadge';
import { useBilling } from '../../hooks/useBilling';
import { getCurrentRate } from '../../utils/calculations';
import { joinAddress } from '../../utils/formatters';

/** Compact summary of the selected customer shown next to the project form. */
export function ProjectCustomerSummary({ customer }) {
  const { hourlyRates } = useBilling();
  if (!customer) {
    return (
      <Card>
        <CardHeader icon={Building2} title="Customer" />
        <CardBody>
          <p className="text-sm text-ink-muted">Select a customer to see contact details and the hourly rate that applies to this project&rsquo;s hours.</p>
        </CardBody>
      </Card>
    );
  }
  const rate = getCurrentRate(hourlyRates, customer.id, customer.currency);
  return (
    <Card>
      <CardHeader
        icon={Building2}
        title={customer.companyName}
        description={customer.customerNumber}
        action={<StatusBadge kind="customer" status={customer.status} />}
      />
      <CardBody>
        <DescriptionList
          columns={1}
          items={[
            { label: 'Contact', value: customer.contactPerson },
            { label: 'Email', value: customer.email },
            { label: 'Phone', value: customer.phone },
            {
              label: 'Current hourly rate',
              value: rate ? (
                <span>
                  <MoneyDisplay amount={rate.amount} currency={rate.currency} className="font-medium" /> / hour
                </span>
              ) : (
                <span className="text-danger-ink">No active rate — hours cannot be billed</span>
              ),
            },
            { label: 'Payment terms', value: `${customer.paymentTerms} days` },
            { label: 'Service address', value: customer.serviceAddress || joinAddress(customer.billingAddress) },
          ]}
        />
        <Link to={`/customers/${customer.id}`} className="mt-4 inline-block text-xs font-medium text-brand-700 hover:underline">
          View customer
        </Link>
      </CardBody>
    </Card>
  );
}
