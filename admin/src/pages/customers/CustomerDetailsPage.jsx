import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Archive, Pencil, PlayCircle, PauseCircle, RotateCcw } from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';
import { useProjects } from '../../hooks/useProjects';
import { useAttendance } from '../../hooks/useAttendance';
import { useInvoices } from '../../hooks/useInvoices';
import { useEmployees } from '../../hooks/useEmployees';
import { useBilling } from '../../hooks/useBilling';
import { useBusiness } from '../../hooks/useBusiness';
import { useQueryState } from '../../hooks/useQueryState';
import { PageHeader } from '../../components/common/PageHeader';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { Callout } from '../../components/common/Callout';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { DescriptionList } from '../../components/common/DescriptionList';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Tabs } from '../../components/common/Tabs';
import { CustomerOverview } from '../../components/customers/CustomerOverview';
import { CustomerProjectList } from '../../components/customers/CustomerProjectList';
import { CustomerHoursBreakdown } from '../../components/customers/CustomerHoursBreakdown';
import { CustomerBillingSettings } from '../../components/customers/CustomerBillingSettings';
import { CustomerInvoiceList } from '../../components/customers/CustomerInvoiceList';
import { taxRateLabel } from '../../components/customers/customerUtils';
import { useCustomerActions } from '../../components/customers/useCustomerActions';
import { isClosedRecord, sumBillable, sumRecorded } from '../../services/reportService';
import { getCurrentRate, isInvoiceOutstanding, ISSUED_INVOICE_STATUSES } from '../../utils/calculations';
import { formatDateTime } from '../../utils/dateUtils';

const TAB_VALUES = ['overview', 'projects', 'hours', 'rates', 'invoices', 'info'];

export default function CustomerDetailsPage() {
  const { customerId } = useParams();
  const { customersById } = useCustomers();
  const { projects, projectsById } = useProjects();
  const { attendance } = useAttendance();
  const { invoices } = useInvoices();
  const { employeesById } = useEmployees();
  const { hourlyRates } = useBilling();
  const { workingHours, invoiceSettings } = useBusiness();
  const [query, setQuery] = useQueryState({ tab: 'overview' });
  const { trigger, elements } = useCustomerActions();

  const customer = customersById[customerId];
  const tab = TAB_VALUES.includes(query.tab) ? query.tab : 'overview';

  // Everything below is strictly limited to this customer.
  const data = useMemo(() => {
    const ownProjects = projects.filter((p) => p.customerId === customerId);
    const records = attendance.filter((a) => a.customerId === customerId);
    const ownInvoices = invoices.filter((inv) => inv.customerId === customerId);
    const minutesByProject = {};
    records.filter(isClosedRecord).forEach((r) => {
      minutesByProject[r.projectId] = (minutesByProject[r.projectId] ?? 0) + r.recordedDurationMinutes;
    });
    const outstanding = ownInvoices.filter(isInvoiceOutstanding);
    return {
      projects: ownProjects,
      records,
      invoices: ownInvoices,
      minutesByProject,
      metrics: {
        activeProjects: ownProjects.filter((p) => p.status === 'active').length,
        recorded: sumRecorded(records),
        billable: sumBillable(records, workingHours),
        invoiced: ownInvoices.filter((inv) => ISSUED_INVOICE_STATUSES.includes(inv.status)).reduce((s, inv) => s + inv.total, 0),
        outstanding: outstanding.reduce((s, inv) => s + inv.balanceDue, 0),
        outstandingCount: outstanding.length,
      },
    };
  }, [projects, attendance, invoices, customerId, workingHours]);

  if (!customer) {
    return <ErrorState title="Customer not found" message="This customer does not exist or the link is out of date." backTo="/customers" backLabel="Back to customers" />;
  }

  const currentRate = getCurrentRate(hourlyRates, customer.id, customer.currency);
  const metrics = { ...data.metrics, currentRate };
  const setTab = (value) => setQuery('tab', value === 'overview' ? '' : value);
  const edit = () => trigger('edit', customer);

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'projects', label: 'Projects', count: data.projects.length },
    { value: 'hours', label: 'Attendance & hours' },
    { value: 'rates', label: 'Hourly rates' },
    { value: 'invoices', label: 'Invoices', count: data.invoices.length },
    { value: 'info', label: 'Customer information' },
  ];

  const actions = (
    <>
      <Button variant="secondary" icon={Pencil} onClick={edit}>
        Edit
      </Button>
      {customer.status === 'active' && (
        <Button variant="secondary" icon={PauseCircle} onClick={() => trigger('deactivate', customer)}>
          Set inactive
        </Button>
      )}
      {customer.status === 'inactive' && (
        <Button variant="secondary" icon={PlayCircle} onClick={() => trigger('activate', customer)}>
          Set active
        </Button>
      )}
      {customer.status === 'archived' ? (
        <Button variant="secondary" icon={RotateCcw} onClick={() => trigger('restore', customer)}>
          Restore
        </Button>
      ) : (
        <Button variant="danger-ghost" icon={Archive} onClick={() => trigger('archive', customer)}>
          Archive
        </Button>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        documentTitle={customer.companyName}
        title={
          <span className="flex min-w-0 items-center gap-3">
            <Avatar name={customer.companyName} size="md" square />
            <span className="min-w-0 truncate">{customer.companyName}</span>
          </span>
        }
        breadcrumbs={[{ label: 'Customers', to: '/customers' }, { label: customer.companyName }]}
        meta={
          <>
            <StatusBadge kind="customer" status={customer.status} />
            <span className="text-sm text-ink-muted">
              {customer.customerNumber} · {customer.billingAddress?.city}, {customer.billingAddress?.country} · {customer.currency}
            </span>
          </>
        }
        actions={actions}
      />

      {customer.status !== 'active' && (
        <Callout tone={customer.status === 'archived' ? 'warning' : 'info'} className="mb-6" title={customer.status === 'archived' ? 'Archived customer' : 'Inactive customer'}>
          Projects, attendance, rates and invoices remain available for reporting and billing of recorded work.
        </Callout>
      )}

      <Tabs tabs={tabs} value={tab} onChange={setTab} label="Customer sections" className="mb-6" />

      <div role="tabpanel" aria-label={tabs.find((t) => t.value === tab)?.label}>
        {tab === 'overview' && (
          <CustomerOverview
            customer={customer}
            metrics={metrics}
            projects={data.projects}
            records={data.records}
            invoices={data.invoices}
            employeesById={employeesById}
            projectsById={projectsById}
            onTab={setTab}
          />
        )}
        {tab === 'projects' && <CustomerProjectList customer={customer} projects={data.projects} employeesById={employeesById} minutesByProject={data.minutesByProject} />}
        {tab === 'hours' && <CustomerHoursBreakdown records={data.records} projectsById={projectsById} />}
        {tab === 'rates' && <CustomerBillingSettings customer={customer} onEdit={edit} />}
        {tab === 'invoices' && <CustomerInvoiceList customer={customer} invoices={data.invoices} />}
        {tab === 'info' && (
          <Card>
            <CardHeader
              title="Customer information"
              action={
                <Button variant="secondary" size="sm" icon={Pencil} onClick={edit}>
                  Edit
                </Button>
              }
            />
            <CardBody>
              <DescriptionList
                items={[
                  { label: 'Company name', value: customer.companyName },
                  { label: 'Customer reference ID', value: customer.customerNumber },
                  { label: 'Contact person', value: customer.contactPerson },
                  {
                    label: 'Email',
                    value: (
                      <a href={`mailto:${customer.email}`} className="text-brand-700 hover:underline">
                        {customer.email}
                      </a>
                    ),
                  },
                  { label: 'Phone', value: customer.phone },
                  { label: 'Status', value: <StatusBadge kind="customer" status={customer.status} /> },
                  { label: 'Billing street', value: customer.billingAddress?.street },
                  { label: 'Postal code & city', value: [customer.billingAddress?.postalCode, customer.billingAddress?.city].filter(Boolean).join(' ') },
                  { label: 'Country', value: customer.billingAddress?.country },
                  { label: 'Service address', value: customer.serviceAddress },
                  { label: 'Tax / VAT ID', value: customer.taxId },
                  { label: 'Tax rate', value: taxRateLabel(customer, invoiceSettings.defaultTaxRate) },
                  { label: 'Payment terms', value: `${customer.paymentTerms} days` },
                  { label: 'Default currency', value: customer.currency },
                  { label: 'Created', value: formatDateTime(customer.createdAt) },
                  { label: 'Last updated', value: formatDateTime(customer.updatedAt) },
                  { label: 'Notes', value: customer.notes, span: true },
                ]}
              />
            </CardBody>
          </Card>
        )}
      </div>

      {elements}
    </>
  );
}
