import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ScrollText } from 'lucide-react';
import { Card } from '../common/Card';
import { DataTable } from '../common/DataTable';
import { DateRangePicker } from '../common/DateRangePicker';
import { EmptyState } from '../common/EmptyState';
import { ExportButton } from '../common/ExportButton';
import { FilterBar } from '../common/FilterBar';
import { SearchInput } from '../common/SearchInput';
import { SelectField } from '../common/SelectField';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { entityPath } from '../../services/notificationService';
import { formatDate, formatDateTime, isInDateRange } from '../../utils/dateUtils';
import { pluralize } from '../../utils/formatters';
import { ValueDiff } from './ValueDiff';

const ENTITY_LABELS = {
  employee: 'Employee',
  customer: 'Customer',
  project: 'Project',
  attendance: 'Attendance',
  invoice: 'Invoice',
  settings: 'Settings',
};

const entityLabel = (type) => ENTITY_LABELS[type] ?? (type ? type[0].toUpperCase() + type.slice(1) : '—');
const changedCount = (entry) => new Set([...Object.keys(entry.previousValues ?? {}), ...Object.keys(entry.newValues ?? {})]).size;

/** Audit trail of administrator actions with readable value diffs. */
export function ActivityLogTable({ activity, filters, setFilter, lookups, currency }) {
  const entityOptions = useMemo(() => {
    const types = new Set([...Object.keys(ENTITY_LABELS), ...activity.map((a) => a.entityType).filter(Boolean)]);
    return [...types].map((t) => ({ value: t, label: entityLabel(t) }));
  }, [activity]);

  const rows = useMemo(() => {
    const q = filters.aq.trim().toLowerCase();
    return activity.filter(
      (a) =>
        (!filters.entity || a.entityType === filters.entity) &&
        isInDateRange(a.createdAt, filters.from, filters.to) &&
        (!q || `${a.summary} ${a.actorName} ${a.action} ${a.reason ?? ''}`.toLowerCase().includes(q)),
    );
  }, [activity, filters.aq, filters.entity, filters.from, filters.to]);

  const isFiltered = Boolean(filters.aq || filters.entity || filters.from || filters.to);

  const columns = [
    {
      key: 'createdAt',
      header: 'Time',
      sortValue: (a) => a.createdAt,
      render: (a) => (
        <span className="whitespace-nowrap">
          <span className="tabular block text-sm text-ink">{formatDateTime(a.createdAt)}</span>
          <span className="block text-2xs text-ink-muted">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
        </span>
      ),
    },
    {
      key: 'summary',
      header: 'Action',
      primary: true,
      sortValue: (a) => a.summary,
      render: (a) => (
        <span className="block min-w-[14rem] max-w-md">
          <span className="block text-sm font-medium text-ink">{a.summary}</span>
          <span className="block font-mono text-2xs text-ink-muted">{a.action}</span>
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Administrator',
      sortValue: (a) => a.actorName,
      render: (a) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Avatar name={a.actorName} size="xs" />
          {a.actorName}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Record',
      sortValue: (a) => a.entityType,
      render: (a) => {
        const path = entityPath(a.entityType, a.entityId);
        return path ? (
          <Link to={path} className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-brand-700 hover:underline">
            {entityLabel(a.entityType)}
            <span className="sr-only"> record</span>
          </Link>
        ) : (
          <Badge tone="neutral">{entityLabel(a.entityType)}</Badge>
        );
      },
    },
    {
      key: 'details',
      header: 'Reason & changes',
      render: (a) => {
        const count = changedCount(a);
        if (!a.reason && !count) return <span className="text-ink-muted">—</span>;
        return (
          <div className="max-w-md space-y-1 md:min-w-[12rem]">
            {a.reason && <p className="text-sm text-ink-secondary">“{a.reason}”</p>}
            {count > 0 && (
              <details className="group rounded-md border border-line bg-subtle/40">
                <summary className="cursor-pointer select-none px-2 py-1 text-xs font-medium text-brand-700 hover:underline">
                  {pluralize(count, 'field')} changed
                </summary>
                <div className="border-t border-line bg-surface px-2 py-1.5">
                  <ValueDiff previous={a.previousValues} next={a.newValues} lookups={lookups} currency={currency} />
                </div>
              </details>
            )}
          </div>
        );
      },
    },
  ];

  const csvColumns = [
    { header: 'Time', value: (a) => formatDate(a.createdAt, 'yyyy-MM-dd HH:mm') },
    { header: 'Administrator', value: (a) => a.actorName },
    { header: 'Action', value: (a) => a.action },
    { header: 'Summary', value: (a) => a.summary },
    { header: 'Record type', value: (a) => entityLabel(a.entityType) },
    { header: 'Record ID', value: (a) => a.entityId },
    { header: 'Reason', value: (a) => a.reason ?? '' },
    { header: 'Previous values', value: (a) => (a.previousValues ? JSON.stringify(a.previousValues) : '') },
    { header: 'New values', value: (a) => (a.newValues ? JSON.stringify(a.newValues) : '') },
  ];

  return (
    <Card>
      <FilterBar
        count={rows.length}
        noun="entry"
        isFiltered={isFiltered}
        onReset={() => setFilter({ aq: '', entity: '', from: '', to: '' })}
        actions={<ExportButton rows={rows} columns={csvColumns} filename="activity-log" />}
      >
        <SearchInput value={filters.aq} onChange={(v) => setFilter('aq', v)} placeholder="Search actions, reasons…" label="Search activity log" className="w-full sm:w-64" />
        <SelectField aria-label="Record type" size="sm" className="w-full sm:w-40" value={filters.entity} onChange={(e) => setFilter('entity', e.target.value)} placeholder="All records" options={entityOptions} />
        <DateRangePicker value={{ from: filters.from, to: filters.to }} onChange={(r) => setFilter({ from: r.from, to: r.to })} compact label="Activity period" />
      </FilterBar>
      <DataTable
        columns={columns}
        rows={rows}
        initialSort={{ key: 'createdAt', dir: 'desc' }}
        pageSize={15}
        caption="Activity log"
        emptyState={
          <EmptyState
            icon={ScrollText}
            title={isFiltered ? 'No entries match these filters' : 'No activity recorded yet'}
            description={isFiltered ? 'Try a wider period or clear the search.' : 'Changes made by administrators will be logged here.'}
          />
        }
      />
    </Card>
  );
}
