import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck2, CalendarSearch, Gauge, Timer } from 'lucide-react';
import { AttendanceFilters, DEFAULT_ATTENDANCE_FILTERS } from '../components/attendance/AttendanceFilters';
import { AttendanceHistoryTable } from '../components/attendance/AttendanceHistoryTable';
import { Alert } from '../components/common/Alert';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/LoadingSpinner';
import { PageHeader } from '../components/common/PageHeader';
import { Pagination } from '../components/common/Pagination';
import { StatCard } from '../components/common/StatCard';
import { AttendanceChart } from '../components/dashboard/AttendanceChart';
import { PageContainer } from '../components/layout/PageContainer';
import { useAssignments } from '../hooks/useAssignments';
import { useAttendance } from '../hooks/useAttendance';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFormatters } from '../hooks/useFormatters';
import { useNow } from '../hooks/useNow';
import { usePreferences } from '../hooks/usePreferences';
import {
  PERIOD_PRESETS,
  averageMinutesPerWorkingDay,
  countWorkingDays,
  getPeriodRange,
  getRecordMinutes,
  isFinished,
  isInRange,
  sumCompletedMinutes,
} from '../utils/dateUtils';
import { formatDuration } from '../utils/formatters';

const PAGE_SIZE = 10;

// URL query keys <-> filter fields, so filters survive refreshes and can be linked to.
const PARAMS = { period: 'period', from: 'from', to: 'to', customerId: 'customer', projectId: 'project', status: 'status', search: 'q' };

export function AttendanceHistoryPage() {
  useDocumentTitle('My Attendance');
  const { records, activeShift, isLoading, status, reload } = useAttendance();
  const { projects, customers, projectsById, customersById } = useAssignments();
  const { preferences } = usePreferences();
  const fmt = useFormatters();
  const now = useNow(30_000, Boolean(activeShift));
  const [params, setParams] = useSearchParams();

  const filters = useMemo(
    () => Object.fromEntries(Object.entries(PARAMS).map(([field, key]) => [field, params.get(key) ?? DEFAULT_ATTENDANCE_FILTERS[field]])),
    [params],
  );
  const sort = { key: params.get('sort') ?? 'date', dir: params.get('dir') ?? 'desc' };
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);

  const updateParams = (changes, { resetPage = true } = {}) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '' || value == null) next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const onFilterChange = (changes) => {
    const mapped = Object.fromEntries(
      Object.entries(changes).map(([field, value]) => [PARAMS[field], value === DEFAULT_ATTENDANCE_FILTERS[field] ? '' : value]),
    );
    if (changes.period && changes.period !== 'custom') Object.assign(mapped, { from: '', to: '' });
    updateParams(mapped);
  };

  const clearFilters = () => setParams(new URLSearchParams(), { replace: true });

  const onSort = (key) => {
    const dir = sort.key === key && sort.dir === 'desc' ? 'asc' : 'desc';
    updateParams({ sort: key === 'date' && dir === 'desc' ? '' : key, dir: key === 'date' && dir === 'desc' ? '' : dir });
  };

  const range = useMemo(
    () => getPeriodRange(filters.period, now, preferences.weekStartsOn, { from: filters.from, to: filters.to }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.period, filters.from, filters.to, preferences.weekStartsOn, now.toDateString()],
  );

  const rangeInvalid = filters.period === 'custom' && filters.from && filters.to && filters.from > filters.to;

  const filtered = useMemo(() => {
    if (rangeInvalid) return [];
    const q = filters.search.trim().toLowerCase();
    return records.filter((r) => {
      if (!isInRange(r.checkInAt, range)) return false;
      if (filters.customerId && r.customerId !== filters.customerId) return false;
      if (filters.projectId && r.projectId !== filters.projectId) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (q) {
        const haystack = [projectsById[r.projectId]?.name, customersById[r.customerId]?.companyName, r.checkInNote, r.checkOutNote]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, range, rangeInvalid, filters, projectsById, customersById]);

  const sorted = useMemo(() => {
    const factor = sort.dir === 'asc' ? 1 : -1;
    const value = {
      date: (r) => r.checkInAt,
      customer: (r) => customersById[r.customerId]?.companyName ?? '',
      project: (r) => projectsById[r.projectId]?.name ?? '',
      duration: (r) => getRecordMinutes(r, now),
    }[sort.key] ?? ((r) => r.checkInAt);
    return [...filtered].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return cmp * factor || b.checkInAt.localeCompare(a.checkInAt);
    });
  }, [filtered, sort.key, sort.dir, customersById, projectsById, now]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const finished = filtered.filter(isFinished);
  const totalMinutes = sumCompletedMinutes(finished);
  const avgMinutes = averageMinutesPerWorkingDay(finished);
  const periodLabel =
    filters.period === 'custom'
      ? range
        ? `${fmt.date(range.start)} – ${fmt.date(range.end)}`
        : 'All dates'
      : PERIOD_PRESETS.find((p) => p.value === filters.period)?.label ?? 'Selected period';
  const activeInView = activeShift && filtered.some((r) => r.id === activeShift.id);

  return (
    <PageContainer>
      <PageHeader
        title="My Attendance"
        description="Your recorded shifts and working hours. Records are read-only — contact your supervisor if something needs correcting."
      />

      <section aria-label="Period summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={Timer} label="Total hours" value={formatDuration(totalMinutes)} hint={periodLabel} loading={isLoading} />
        <StatCard
          icon={CalendarCheck2}
          label="Completed shifts"
          value={finished.length}
          hint={`${countWorkingDays(finished)} working day${countWorkingDays(finished) === 1 ? '' : 's'}`}
          tone="success"
          loading={isLoading}
        />
        <StatCard
          icon={Gauge}
          label="Avg. per working day"
          value={formatDuration(avgMinutes)}
          hint="Completed shifts only"
          tone="info"
          loading={isLoading}
          className="col-span-2 lg:col-span-1"
        />
      </section>

      {activeShift && (
        <Alert tone="info" className="mt-6" title="Shift in progress">
          Your shift on {projectsById[activeShift.projectId]?.name ?? 'a project'} started at {fmt.time(activeShift.checkInAt)} and is
          shown separately: it is not included in the totals above until you check out.
          {!activeInView && ' It is hidden by the current filters.'}
        </Alert>
      )}

      <Card padded={false} className="mt-6 overflow-hidden">
        <div className="border-b border-line p-4 sm:p-5">
          <AttendanceFilters filters={filters} onChange={onFilterChange} onClear={clearFilters} customers={customers} projects={projects} />
        </div>

        {status === 'error' ? (
          <EmptyState
            icon={CalendarSearch}
            title="Attendance could not be loaded"
            description="Something went wrong while loading your records."
            action={<Button onClick={() => reload()}>Try again</Button>}
          />
        ) : isLoading ? (
          <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading attendance records">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : !sorted.length ? (
          <EmptyState
            icon={CalendarSearch}
            title={records.length ? 'No records match your filters' : 'No attendance recorded yet'}
            description={
              records.length
                ? 'Try a different period or clear the filters to see more records.'
                : 'Your shifts will appear here after you check in and out.'
            }
            action={
              records.length ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button to="/check-in-out">Go to Check In</Button>
              )
            }
          />
        ) : (
          <>
            <AttendanceHistoryTable records={pageRows} sort={sort} onSort={onSort} now={now} />
            <div className="border-t border-line px-4 py-3 sm:px-5">
              <Pagination
                page={currentPage}
                pageSize={PAGE_SIZE}
                total={sorted.length}
                label="records"
                onChange={(p) => updateParams({ page: p > 1 ? p : '' }, { resetPage: false })}
              />
            </div>
          </>
        )}
      </Card>

      {!isLoading && finished.length > 0 && (
        <div className="mt-6">
          <AttendanceChart records={finished} description={`Completed hours · ${periodLabel}`} limit={8} />
        </div>
      )}
    </PageContainer>
  );
}

export default AttendanceHistoryPage;
