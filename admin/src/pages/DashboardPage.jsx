import { useMemo } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { DashboardStats } from '../components/dashboard/DashboardStats';
import { AttendanceOverviewChart } from '../components/dashboard/AttendanceOverviewChart';
import { RecentAttendance } from '../components/dashboard/RecentAttendance';
import { HoursTrendChart } from '../components/dashboard/HoursTrendChart';
import { BillableByCustomerChart } from '../components/dashboard/BillableByCustomerChart';
import { BillingOverviewChart } from '../components/dashboard/BillingOverviewChart';
import { InvoiceStatusChart } from '../components/dashboard/InvoiceStatusChart';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { RecentInvoices } from '../components/dashboard/RecentInvoices';
import { UpcomingProjects } from '../components/dashboard/UpcomingProjects';
import { QuickActions } from '../components/dashboard/QuickActions';
import { useAuth } from '../hooks/useAuth';
import { useBusiness } from '../hooks/useBusiness';
import { useDb } from '../hooks/useStore';
import { useLookups } from '../hooks/useLookups';
import { useNotifications } from '../hooks/useNotifications';
import { useNow } from '../hooks/useNow';
import { useQueryState } from '../hooks/useQueryState';
import { useAsyncAction } from '../hooks/useAsyncAction';
import {
  getAttendanceToday,
  getBillableByCustomer,
  getDashboardMetrics,
  getHoursTrend,
  getInvoiceStatusDistribution,
  getMonthlyInvoiced,
} from '../services/reportService';
import { requiresReview } from '../utils/calculations';
import { formatDate, formatPeriod, getPresetRange, greetingForHour, toDate } from '../utils/dateUtils';
import { pluralize } from '../utils/formatters';

export default function DashboardPage() {
  const db = useDb();
  const { user } = useAuth();
  const { refreshTimeRules } = useBusiness();
  const { activity } = useNotifications();
  const { employeesById, customersById, projectsById } = useLookups();
  const now = useNow(30000);
  const [run, refreshing] = useAsyncAction();

  const defaults = useMemo(() => getPresetRange('this_month'), []);
  const [filters, setFilter] = useQueryState(defaults);
  const range = useMemo(() => ({ from: filters.from, to: filters.to }), [filters.from, filters.to]);
  const periodLabel = formatPeriod(range.from, range.to);

  const metrics = useMemo(() => getDashboardMetrics(db, range), [db, range]);
  const trend = useMemo(() => getHoursTrend(db, range), [db, range]);
  const byCustomer = useMemo(() => getBillableByCustomer(db, range), [db, range]);
  const statusDistribution = useMemo(() => getInvoiceStatusDistribution(db, range), [db, range]);
  const monthly = useMemo(() => getMonthlyInvoiced(db, 6), [db]);
  const today = useMemo(() => getAttendanceToday(db, now), [db, now]);
  const reviewCount = useMemo(
    () => db.attendance.filter((a) => a.checkOutAt && a.status !== 'cancelled' && requiresReview(a, db.workingHours)).length,
    [db.attendance, db.workingHours],
  );

  const start = toDate(range.from);
  const end = toDate(range.to);
  const weekly = start && end ? differenceInCalendarDays(end, start) + 1 > 45 : false;

  const firstName = (user?.name ?? '').split(' ')[0];
  const overview = [
    today.working.length ? `${pluralize(today.working.length, 'employee')} ${today.working.length === 1 ? 'is' : 'are'} on shift right now` : 'Nobody is on shift right now',
    metrics.outstandingCount
      ? `${pluralize(metrics.outstandingCount, 'invoice')} ${metrics.outstandingCount === 1 ? 'is' : 'are'} awaiting payment${metrics.overdueCount ? ` (${metrics.overdueCount} overdue)` : ''}`
      : 'no invoices are awaiting payment',
  ].join(', and ');

  const onRangeChange = (next) => setFilter({ from: next.from, to: next.to });
  const onRefresh = () =>
    run(
      async () => {
        await refreshTimeRules();
      },
      { success: 'Statuses refreshed — overdue invoices and open-shift alerts recalculated.' },
    );

  return (
    <>
      <PageHeader
        title={`${greetingForHour(now)}${firstName ? `, ${firstName}` : ''}`}
        documentTitle="Dashboard"
        description={`${overview}.`}
        meta={
          <Badge tone="neutral" icon={CalendarDays}>
            {formatDate(now, 'EEEE, dd MMMM yyyy')}
          </Badge>
        }
        actions={<DashboardFilters range={range} onRangeChange={onRangeChange} onRefresh={onRefresh} refreshing={refreshing} />}
      />

      <div className="space-y-4 lg:space-y-6">
        <section aria-label="Key figures">
          <DashboardStats metrics={metrics} range={range} />
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="min-w-0 lg:col-span-2">
            <AttendanceOverviewChart today={today} now={now} employeesById={employeesById} projectsById={projectsById} customersById={customersById} />
          </div>
          <div className="min-w-0">
            <RecentAttendance attendance={db.attendance} employeesById={employeesById} projectsById={projectsById} now={now} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="min-w-0 lg:col-span-2">
            <HoursTrendChart data={trend} periodLabel={periodLabel} weekly={weekly} />
          </div>
          <div className="min-w-0">
            <BillableByCustomerChart data={byCustomer} range={range} periodLabel={periodLabel} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="min-w-0 lg:col-span-2">
            <BillingOverviewChart data={monthly} currency={metrics.currency} />
          </div>
          <div className="min-w-0">
            <InvoiceStatusChart data={statusDistribution} currency={metrics.currency} periodLabel={periodLabel} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="min-w-0 lg:col-span-2">
            <RecentInvoices invoices={db.invoices} customersById={customersById} />
          </div>
          <div className="min-w-0">
            <ActivityFeed activity={activity} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="min-w-0 lg:col-span-2">
            <UpcomingProjects projects={db.projects} attendance={db.attendance} customersById={customersById} />
          </div>
          <div className="min-w-0">
            <QuickActions reviewCount={reviewCount} />
          </div>
        </div>
      </div>
    </>
  );
}
