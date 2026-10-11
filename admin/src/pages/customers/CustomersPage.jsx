import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';
import { useProjects } from '../../hooks/useProjects';
import { useAttendance } from '../../hooks/useAttendance';
import { useInvoices } from '../../hooks/useInvoices';
import { useBilling } from '../../hooks/useBilling';
import { useQueryState } from '../../hooks/useQueryState';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FilterBar } from '../../components/common/FilterBar';
import { ExportButton } from '../../components/common/ExportButton';
import { getStatusMeta } from '../../components/common/StatusBadge';
import { CustomerFilters } from '../../components/customers/CustomerFilters';
import { CustomerTable } from '../../components/customers/CustomerTable';
import { buildCustomerRows, matchesCustomerStatus } from '../../components/customers/customerUtils';
import { useCustomerActions } from '../../components/customers/useCustomerActions';
import { formatMoneyPlain } from '../../utils/currency';
import { formatHours, joinAddress } from '../../utils/formatters';

const FILTER_DEFAULTS = { q: '', status: '', project: '' };

export default function CustomersPage() {
  const navigate = useNavigate();
  const { customers, customersById } = useCustomers();
  const { projects, projectsById } = useProjects();
  const { attendance } = useAttendance();
  const { invoices } = useInvoices();
  const { hourlyRates } = useBilling();
  const [filters, setFilter, resetFilters, isFiltered] = useQueryState(FILTER_DEFAULTS);
  const { trigger, elements } = useCustomerActions();

  const enriched = useMemo(
    () => buildCustomerRows({ customers, projects, attendance, invoices, hourlyRates }),
    [customers, projects, attendance, invoices, hourlyRates],
  );

  const rows = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const projectCustomer = filters.project ? projectsById[filters.project]?.customerId ?? '__none__' : '';
    return enriched.filter(
      (c) =>
        matchesCustomerStatus(c.status, filters.status) &&
        (!projectCustomer || c.id === projectCustomer) &&
        (!q || [c.companyName, c.customerNumber, c.contactPerson, c.email, c.phone].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [enriched, filters, projectsById]);

  const projectOptions = useMemo(
    () =>
      [...projects]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ value: p.id, label: `${p.name} · ${customersById[p.customerId]?.companyName ?? ''}` })),
    [projects, customersById],
  );

  const exportColumns = [
    { header: 'Customer reference', value: (c) => c.customerNumber },
    { header: 'Company name', value: (c) => c.companyName },
    { header: 'Contact person', value: (c) => c.contactPerson },
    { header: 'Email', value: (c) => c.email },
    { header: 'Phone', value: (c) => c.phone },
    { header: 'Billing address', value: (c) => joinAddress(c.billingAddress) },
    { header: 'Tax ID', value: (c) => c.taxId },
    { header: 'Currency', value: (c) => c.currency },
    { header: 'Active projects', value: (c) => c.activeProjects },
    { header: 'Recorded hours', value: (c) => formatHours(c.recordedMinutes) },
    { header: 'Current hourly rate', value: (c) => (c.currentRate ? formatMoneyPlain(c.currentRate.amount, c.currentRate.currency) : 'No active rate') },
    { header: 'Outstanding balance', value: (c) => formatMoneyPlain(c.outstanding, c.currency) },
    { header: 'Status', value: (c) => getStatusMeta('customer', c.status).label },
  ];

  const addButton = (
    <Button icon={Plus} to="/customers/new">
      Add customer
    </Button>
  );

  const missingRates = enriched.filter((c) => c.status === 'active' && !c.currentRate).length;

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${customers.filter((c) => c.status === 'active').length} active customers${missingRates ? ` · ${missingRates} without an active hourly rate` : ''}. Amounts are shown in each customer's currency.`}
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Customers' }]}
        actions={addButton}
      />
      <Card>
        <FilterBar
          count={rows.length}
          noun="customer"
          isFiltered={isFiltered}
          onReset={resetFilters}
          actions={<ExportButton rows={rows} columns={exportColumns} filename="customers" />}
        >
          <CustomerFilters filters={filters} onChange={setFilter} projectOptions={projectOptions} />
        </FilterBar>
        <CustomerTable
          rows={rows}
          onAction={trigger}
          onRowClick={(c) => navigate(`/customers/${c.id}`)}
          isFiltered={isFiltered}
          emptyAction={
            isFiltered ? (
              <Button variant="secondary" onClick={resetFilters}>
                Reset filters
              </Button>
            ) : (
              addButton
            )
          }
        />
      </Card>
      {elements}
    </>
  );
}
