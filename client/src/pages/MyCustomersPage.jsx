import { useMemo, useState } from 'react';
import { Building2, SearchX } from 'lucide-react';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/LoadingSpinner';
import { PageHeader } from '../components/common/PageHeader';
import { SearchInput } from '../components/common/SearchInput';
import { Select } from '../components/common/Select';
import { CustomerCard } from '../components/customers/CustomerCard';
import { PageContainer } from '../components/layout/PageContainer';
import { useAssignments } from '../hooks/useAssignments';
import { useAttendanceSummary } from '../hooks/useAttendance';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const SORTS = {
  name: { label: 'Name (A–Z)', fn: (a, b) => a.companyName.localeCompare(b.companyName) },
  hours: { label: 'Most hours', fn: (a, b, m) => (m[b.id] || 0) - (m[a.id] || 0) },
  projects: { label: 'Most projects', fn: (a, b) => b.projectIds.length - a.projectIds.length },
};

export function MyCustomersPage() {
  useDocumentTitle('My Customers');
  const { customers, projectsById, isLoading, status, reload } = useAssignments();
  const { minutesByCustomer } = useAttendanceSummary();
  const [search, setSearch] = useState('');
  const [activity, setActivity] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter((c) => !q || [c.companyName, c.contactPerson, c.address, c.industry].join(' ').toLowerCase().includes(q))
      .filter((c) => {
        if (!activity) return true;
        const hasActive = c.projectIds.some((id) => projectsById[id]?.status === 'active');
        return activity === 'active' ? hasActive : !hasActive;
      })
      .sort((a, b) => SORTS[sortBy].fn(a, b, minutesByCustomer));
  }, [customers, projectsById, search, activity, sortBy, minutesByCustomer]);

  const clear = () => {
    setSearch('');
    setActivity('');
  };

  return (
    <PageContainer>
      <PageHeader
        title="My Customers"
        description="Customers linked to your assigned projects, with site addresses and contact details."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <SearchInput id="customer-search" className="flex-1" value={search} onChange={setSearch} placeholder="Search by company, contact or address" label="Search customers" />
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="sm:w-48">
            <label htmlFor="customer-activity" className="sr-only">
              Project activity
            </label>
            <Select id="customer-activity" value={activity} onChange={(e) => setActivity(e.target.value)}>
              <option value="">All customers</option>
              <option value="active">With active projects</option>
              <option value="inactive">No active projects</option>
            </Select>
          </div>
          <div className="sm:w-44">
            <label htmlFor="customer-sort" className="sr-only">
              Sort by
            </label>
            <Select id="customer-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {Object.entries(SORTS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {status === 'error' ? (
        <div className="card">
          <EmptyState icon={Building2} title="Customers could not be loaded" action={<Button onClick={reload}>Try again</Button>} />
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : !customers.length ? (
        <div className="card">
          <EmptyState icon={Building2} title="No customers yet" description="Customers appear here once you are assigned to one of their projects." />
        </div>
      ) : !visible.length ? (
        <div className="card">
          <EmptyState
            icon={SearchX}
            title="No customers match your search"
            action={
              <Button variant="secondary" onClick={clear}>
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} recordedMinutes={minutesByCustomer[customer.id] || 0} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export default MyCustomersPage;
