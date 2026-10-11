import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/LoadingSpinner';
import { PageHeader } from '../components/common/PageHeader';
import { CustomerDetails } from '../components/customers/CustomerDetails';
import { PageContainer } from '../components/layout/PageContainer';
import { useAsync } from '../hooks/useAsync';
import { useAttendance } from '../hooks/useAttendance';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getMyCustomerById } from '../services/customerService';
import { ERROR_CODES } from '../services/errors';

export function CustomerDetailsPage() {
  const { customerId } = useParams();
  const { data: customer, error, status, reload } = useAsync(() => getMyCustomerById(customerId), [customerId]);
  const { records } = useAttendance();
  useDocumentTitle(customer?.companyName ?? 'Customer');

  const customerRecords = useMemo(() => records.filter((r) => r.customerId === customerId), [records, customerId]);

  if (status === 'loading') {
    return (
      <PageContainer>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-64" />
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (status === 'error') {
    const notFound = error?.code === ERROR_CODES.NOT_FOUND;
    return (
      <PageContainer>
        <PageHeader title={notFound ? 'Customer not found' : 'Customer unavailable'} backTo="/customers" backLabel="My Customers" />
        <div className="card">
          <EmptyState
            icon={Building2}
            title={notFound ? 'This customer is not available to you' : 'Something went wrong'}
            description={
              notFound
                ? 'The customer does not exist or is not linked to any of your assigned projects.'
                : 'The customer could not be loaded. Please try again.'
            }
            action={notFound ? <Button to="/customers">View my customers</Button> : <Button onClick={reload}>Try again</Button>}
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={customer.companyName}
        description={customer.address}
        backTo="/customers"
        backLabel="My Customers"
        eyebrow={customer.industry && <Badge tone="brand">{customer.industry}</Badge>}
        actions={
          <Button variant="secondary" to={`/attendance?customer=${customer.id}&period=all`}>
            View attendance
          </Button>
        }
      />
      <CustomerDetails customer={customer} records={customerRecords} />
    </PageContainer>
  );
}

export default CustomerDetailsPage;
