import { AlertTriangle, BadgeEuro, Briefcase, Clock, UserCheck, Users } from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { formatMoney } from '../../utils/currency';
import { formatNumber, pluralize } from '../../utils/formatters';
import { wholeMoney } from './chartTheme';

function Money({ minor, currency }) {
  return <span title={formatMoney(minor, currency)}>{wholeMoney(minor, currency)}</span>;
}

/** KPI row. Every tile links to the matching filtered list. */
export function DashboardStats({ metrics, range }) {
  const period = `from=${range.from}&to=${range.to}`;
  const { currency } = metrics;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label="Total employees"
        value={formatNumber(metrics.totalEmployees)}
        icon={Users}
        hint={`${formatNumber(metrics.totalEmployees - metrics.activeEmployees)} inactive`}
        to="/employees"
      />
      <StatCard label="Active employees" value={formatNumber(metrics.activeEmployees)} icon={UserCheck} tone="success" hint="Available for shifts" to="/employees?status=active" />
      <StatCard label="Active projects" value={formatNumber(metrics.activeProjects)} icon={Briefcase} tone="info" hint="Currently running" to="/projects?status=active" />
      <StatCard
        label="Hours worked"
        value={`${formatNumber(metrics.recordedMinutes / 60, 1)} h`}
        icon={Clock}
        tone="neutral"
        hint={`${formatNumber(metrics.billableMinutes / 60, 1)} h approved billable`}
        to={`/attendance?${period}`}
      />
      <StatCard
        label="Billable value"
        value={<Money minor={metrics.billableValue} currency={currency} />}
        icon={BadgeEuro}
        hint="Approved hours × rate · not collected cash"
        to={`/billing/hours?${period}`}
      />
      <StatCard
        label="Outstanding invoices"
        value={<Money minor={metrics.outstanding} currency={currency} />}
        icon={AlertTriangle}
        tone={metrics.overdueCount ? 'danger' : 'warning'}
        hint={
          metrics.overdueCount
            ? `${pluralize(metrics.outstandingCount, 'invoice')} · ${metrics.overdueCount} overdue`
            : `${pluralize(metrics.outstandingCount, 'invoice')} · none overdue`
        }
        to="/invoices?status=outstanding"
      />
    </div>
  );
}
