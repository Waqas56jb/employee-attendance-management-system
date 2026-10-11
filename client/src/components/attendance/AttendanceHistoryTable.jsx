import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Clock, StickyNote } from 'lucide-react';
import { useAssignments } from '../../hooks/useAssignments';
import { useFormatters } from '../../hooks/useFormatters';
import { cn } from '../../utils/cn';
import { getRecordMinutes } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

function SortHeader({ label, sortKey, sort, onSort, className }) {
  const active = sort.key === sortKey;
  const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('px-4 py-3 text-left', className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 rounded text-xs font-semibold uppercase tracking-wide transition-colors hover:text-ink',
          active ? 'text-ink' : 'text-ink-muted',
        )}
      >
        {label}
        <Icon size={13} aria-hidden="true" />
      </button>
    </th>
  );
}

function Notes({ record }) {
  const notes = [record.checkInNote && `In: ${record.checkInNote}`, record.checkOutNote && `Out: ${record.checkOutNote}`].filter(Boolean);
  if (!notes.length) return <span className="text-ink-muted">—</span>;
  return (
    <span className="line-clamp-2 text-ink-secondary" title={notes.join('\n')}>
      {notes.join(' · ')}
    </span>
  );
}

/**
 * Attendance records: a sortable table on medium+ screens and stacked cards
 * on phones. Records are read-only for employees.
 */
export function AttendanceHistoryTable({ records, sort, onSort, now }) {
  const { projectsById, customersById } = useAssignments();
  const fmt = useFormatters();

  const nameOf = (record) => ({
    project: projectsById[record.projectId]?.name ?? 'Unknown project',
    customer: customersById[record.customerId]?.companyName ?? 'Unknown customer',
  });

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-sm">
          <caption className="sr-only">Attendance records</caption>
          <thead className="border-b border-line bg-canvas/70">
            <tr>
              <SortHeader label="Date" sortKey="date" sort={sort} onSort={onSort} />
              <SortHeader label="Customer" sortKey="customer" sort={sort} onSort={onSort} />
              <SortHeader label="Project" sortKey="project" sort={sort} onSort={onSort} />
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Check-in
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Check-out
              </th>
              <SortHeader label="Duration" sortKey="duration" sort={sort} onSort={onSort} className="text-right" />
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Status
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {records.map((record) => {
              const names = nameOf(record);
              const active = record.status === 'active';
              return (
                <tr key={record.id} className={cn('align-top transition-colors hover:bg-canvas/60', active && 'bg-success-soft/40')}>
                  <td className="whitespace-nowrap px-4 py-3.5 font-medium text-ink">{fmt.date(record.checkInAt)}</td>
                  <td className="max-w-[180px] px-4 py-3.5">
                    <Link to={`/customers/${record.customerId}`} className="line-clamp-1 text-ink-secondary hover:text-brand-700 hover:underline">
                      {names.customer}
                    </Link>
                  </td>
                  <td className="max-w-[200px] px-4 py-3.5">
                    <Link to={`/projects/${record.projectId}`} className="line-clamp-1 font-medium text-ink hover:text-brand-700 hover:underline">
                      {names.project}
                    </Link>
                  </td>
                  <td className="tabular whitespace-nowrap px-4 py-3.5 text-ink-secondary">{fmt.time(record.checkInAt)}</td>
                  <td className="tabular whitespace-nowrap px-4 py-3.5 text-ink-secondary">
                    {active ? <span className="text-ink-muted">—</span> : fmt.time(record.checkOutAt)}
                  </td>
                  <td className="tabular whitespace-nowrap px-4 py-3.5 text-right font-semibold text-ink">
                    {formatDuration(getRecordMinutes(record, now))}
                    {active && <span className="block text-2xs font-normal text-ink-muted">so far</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="max-w-[240px] px-4 py-3.5 text-xs">
                    <Notes record={record} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-line md:hidden">
        {records.map((record) => {
          const names = nameOf(record);
          const active = record.status === 'active';
          const note = record.checkOutNote || record.checkInNote;
          return (
            <li key={record.id} className={cn('px-4 py-4', active && 'bg-success-soft/40')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-muted">{fmt.date(record.checkInAt)}</p>
                  <Link to={`/projects/${record.projectId}`} className="mt-0.5 block truncate text-sm font-semibold text-ink hover:text-brand-700">
                    {names.project}
                  </Link>
                  <Link to={`/customers/${record.customerId}`} className="block truncate text-sm text-ink-secondary hover:text-brand-700">
                    {names.customer}
                  </Link>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-base font-semibold text-ink">{formatDuration(getRecordMinutes(record, now))}</p>
                  <StatusBadge status={record.status} className="mt-1" />
                </div>
              </div>
              <p className="tabular mt-2.5 flex items-center gap-1.5 text-xs text-ink-secondary">
                <Clock size={13} className="text-ink-muted" aria-hidden="true" />
                {fmt.time(record.checkInAt)} – {active ? 'in progress' : fmt.time(record.checkOutAt)}
              </p>
              {note && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-muted">
                  <StickyNote size={13} className="mt-px shrink-0" aria-hidden="true" />
                  <span className="line-clamp-2">{note}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default AttendanceHistoryTable;
