import { CalendarRange, CheckCircle2, Clock, FolderKanban } from 'lucide-react';
import { ActiveShiftCard } from '../components/attendance/ActiveShiftCard';
import { StatCard } from '../components/common/StatCard';
import { DashboardGreeting } from '../components/dashboard/DashboardGreeting';
import { LatestNotifications } from '../components/dashboard/LatestNotifications';
import { QuickActions } from '../components/dashboard/QuickActions';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { RecentCustomers } from '../components/dashboard/RecentCustomers';
import { UpcomingAssignments } from '../components/dashboard/UpcomingAssignments';
import { WeeklyHoursChart } from '../components/dashboard/WeeklyHoursChart';
import { PageContainer } from '../components/layout/PageContainer';
import { useAssignments } from '../hooks/useAssignments';
import { useAttendance, useAttendanceSummary } from '../hooks/useAttendance';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDuration } from '../utils/formatters';

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { isLoading } = useAttendance();
  const { projects, activeProjects, isLoading: assignmentsLoading } = useAssignments();
  const summary = useAttendanceSummary();

  const inProgressHint = (period, fallback) =>
    period.active > 0 ? `Includes ${formatDuration(period.active)} from your active shift` : fallback;

  return (
    <PageContainer>
      <DashboardGreeting />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          icon={Clock}
          label="Today"
          value={formatDuration(summary.today.total)}
          hint={inProgressHint(summary.today, summary.today.total ? 'Completed shifts today' : 'No time recorded yet today')}
          loading={isLoading}
        />
        <StatCard
          icon={CalendarRange}
          label="This week"
          value={formatDuration(summary.week.total)}
          hint={inProgressHint(summary.week, `${summary.completedShiftsThisWeek} shift${summary.completedShiftsThisWeek === 1 ? '' : 's'} completed this week`)}
          tone="info"
          loading={isLoading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed shifts"
          value={summary.completedShifts}
          hint={`Avg. ${formatDuration(summary.averageDailyMinutes)} per working day`}
          tone="success"
          loading={isLoading}
        />
        <StatCard
          icon={FolderKanban}
          label="Assigned projects"
          value={projects.length}
          hint={`${activeProjects.length} active right now`}
          tone="neutral"
          loading={assignmentsLoading}
        />
      </section>

      <ActiveShiftCard className="mt-6" />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <WeeklyHoursChart />
          <RecentActivity />
        </div>
        <div className="space-y-6">
          <QuickActions />
          <UpcomingAssignments />
          <LatestNotifications />
          <RecentCustomers />
        </div>
      </div>
    </PageContainer>
  );
}

export default DashboardPage;
