import { Link } from 'react-router-dom';
import { BadgeCheck, Clock, FileText, FolderKanban, Wallet } from 'lucide-react';
import { useBusiness } from '../../hooks/useBusiness';
import { Card, CardBody, CardHeader } from '../common/Card';
import { Badge } from '../common/Badge';
import { DescriptionList } from '../common/DescriptionList';
import { EmptyState } from '../common/EmptyState';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { displayAttendanceStatus, elapsedMinutes, isShiftOpen } from '../../utils/calculations';
import { formatMoney } from '../../utils/currency';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { formatDuration, joinAddress } from '../../utils/formatters';
import { CustomerInvoiceList } from './CustomerInvoiceList';
import { taxRateLabel } from './customerUtils';

/**
 * Overview tab. Everything passed in is already limited to this customer.
 * metrics: { activeProjects, recorded, billable, invoiced, outstanding, outstandingCount, currentRate }
 */
export function CustomerOverview({ customer, metrics, projects, records, invoices, employeesById, projectsById, onTab }) {
  const { workingHours, invoiceSettings } = useBusiness();
  const now = new Date();
  const recent = [...records].sort((a, b) => b.checkInAt.localeCompare(a.checkInAt)).slice(0, 6);
  const recentInvoices = [...invoices].sort((a, b) => (b.issueDate ?? '').localeCompare(a.issueDate ?? '')).slice(0, 5);
  const active = projects.filter((p) => p.status === 'active');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Active projects" value={metrics.activeProjects} icon={FolderKanban} hint={`${projects.length} in total`} />
        <StatCard label="Total working hours" value={formatDuration(metrics.recorded)} icon={Clock} tone="info" hint="Recorded, all time" />
        <StatCard label="Billable hours" value={formatDuration(metrics.billable)} icon={BadgeCheck} tone="success" hint="Approved, all time" />
        <StatCard label="Total invoiced" value={formatMoney(metrics.invoiced, customer.currency)} icon={FileText} hint="Issued invoices (excl. drafts & void)" />
        <StatCard
          label="Outstanding balance"
          value={formatMoney(metrics.outstanding, customer.currency)}
          icon={Wallet}
          tone={metrics.outstanding > 0 ? 'warning' : 'neutral'}
          hint={`${metrics.outstandingCount} open invoice${metrics.outstandingCount === 1 ? '' : 's'}`}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Customer summary" />
          <CardBody>
            <DescriptionList
              items={[
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
                {
                  label: 'Current hourly rate',
                  value: metrics.currentRate ? (
                    <span>
                      <MoneyDisplay amount={metrics.currentRate.amount} currency={metrics.currentRate.currency} />
                      <span className="text-ink-muted">/h</span>
                    </span>
                  ) : (
                    <Badge tone="warning">No active rate</Badge>
                  ),
                },
                { label: 'Billing address', value: joinAddress(customer.billingAddress), span: true },
                { label: 'Payment terms', value: `${customer.paymentTerms} days` },
                { label: 'Tax', value: taxRateLabel(customer, invoiceSettings.defaultTaxRate) },
              ]}
            />
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Active projects"
            action={
              <button type="button" onClick={() => onTab('projects')} className="text-xs font-medium text-brand-700 hover:underline">
                All projects
              </button>
            }
          />
          {active.length === 0 ? (
            <EmptyState compact icon={FolderKanban} title="No active projects" />
          ) : (
            <ul className="divide-y divide-line">
              {active.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link to={`/projects/${p.id}`} className="block truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline">
                      {p.name}
                    </Link>
                    <p className="truncate text-xs text-ink-muted">
                      {p.assignedEmployeeIds.length} employee{p.assignedEmployeeIds.length === 1 ? '' : 's'} · since {formatDate(p.startDate)}
                    </p>
                  </div>
                  <StatusBadge kind="project" status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent attendance"
            icon={Clock}
            action={
              <button type="button" onClick={() => onTab('hours')} className="text-xs font-medium text-brand-700 hover:underline">
                Hours by period
              </button>
            }
          />
          {recent.length === 0 ? (
            <EmptyState compact icon={Clock} title="No attendance yet" />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((r) => {
                const status = displayAttendanceStatus(r, { now, openShiftAlertHours: workingHours.openShiftAlertHours, reviewShiftsOverHours: workingHours.reviewShiftsOverHours });
                return (
                  <li key={r.id}>
                    <Link to={`/attendance/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-subtle">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{employeesById[r.employeeId]?.fullName ?? 'Unknown employee'}</p>
                        <p className="truncate text-xs text-ink-muted">
                          {formatDate(r.checkInAt, 'EEE dd MMM')} · {formatTime(r.checkInAt)}–{r.checkOutAt ? formatTime(r.checkOutAt) : 'open'} ·{' '}
                          {projectsById[r.projectId]?.name ?? 'Project'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="tabular hidden text-xs text-ink-secondary sm:inline">
                          {formatDuration(isShiftOpen(r) ? elapsedMinutes(r.checkInAt, now) : r.recordedDurationMinutes ?? 0)}
                        </span>
                        <StatusBadge kind="attendance" status={status} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <CustomerInvoiceList customer={customer} invoices={recentInvoices} title="Recent invoices" description="Latest invoices for this customer" pageSize={5} compact />
      </div>
    </div>
  );
}
