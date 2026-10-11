import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2 } from 'lucide-react';
import { useAssignments } from '../../hooks/useAssignments';
import { useAttendance } from '../../hooks/useAttendance';
import { formatDayLabel } from '../../utils/formatters';
import { Card, CardHeader } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { Skeleton } from '../common/LoadingSpinner';

/** Customers the employee worked for most recently, based on attendance. */
export function RecentCustomers({ limit = 4 }) {
  const { customers, isLoading } = useAssignments();
  const { records } = useAttendance();

  const list = useMemo(() => {
    const lastVisit = {};
    records.forEach((r) => {
      if (!lastVisit[r.customerId] || r.checkInAt > lastVisit[r.customerId]) lastVisit[r.customerId] = r.checkInAt;
    });
    return customers
      .map((c) => ({ ...c, lastVisit: lastVisit[c.id] ?? null }))
      .sort((a, b) => (b.lastVisit ?? '').localeCompare(a.lastVisit ?? ''))
      .slice(0, limit);
  }, [customers, records, limit]);

  return (
    <Card padded={false}>
      <div className="p-5 pb-0 sm:p-6 sm:pb-0">
        <CardHeader
          title="Recent customers"
          description="Where you have worked lately"
          action={
            <Link to="/customers" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
              All <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
      </div>
      {isLoading ? (
        <div className="space-y-3 p-5 pt-0 sm:p-6 sm:pt-0">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !list.length ? (
        <EmptyState compact icon={Building2} title="No customers yet" />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {list.map((c) => (
            <li key={c.id}>
              <Link to={`/customers/${c.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-canvas sm:px-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-subtle text-ink-secondary">
                  <Building2 size={16} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{c.companyName}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {c.projectIds.length} project{c.projectIds.length === 1 ? '' : 's'} assigned
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink-muted">{c.lastVisit ? formatDayLabel(c.lastVisit) : 'Not visited'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default RecentCustomers;
