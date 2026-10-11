import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useBusiness } from '../../hooks/useBusiness';
import { Card, CardHeader } from '../common/Card';
import { DataTable } from '../common/DataTable';
import { DateRangePicker } from '../common/DateRangePicker';
import { EmptyState } from '../common/EmptyState';
import { ExportButton } from '../common/ExportButton';
import { FilterBar } from '../common/FilterBar';
import { SelectField } from '../common/SelectField';
import { isApprovedBillable, isClosedRecord, sumBillable, sumRecorded } from '../../services/reportService';
import { formatDate, isInDateRange, toDateKey } from '../../utils/dateUtils';
import { formatDuration, formatHours } from '../../utils/formatters';

/**
 * Hours of ONE customer grouped by project × billing month.
 * `records` must already be limited to this customer.
 */
export function CustomerHoursBreakdown({ records, projectsById }) {
  const { workingHours } = useBusiness();
  const [range, setRange] = useState({ from: '', to: '' });
  const [projectId, setProjectId] = useState('');

  const filtered = useMemo(
    () => records.filter((r) => (!projectId || r.projectId === projectId) && isInDateRange(r.checkInAt, range.from, range.to)),
    [records, projectId, range],
  );

  const rows = useMemo(() => {
    const groups = {};
    filtered.forEach((r) => {
      const month = toDateKey(r.checkInAt).slice(0, 7);
      const key = `${r.projectId}|${month}`;
      (groups[key] = groups[key] ?? { id: key, projectId: r.projectId, month, list: [] }).list.push(r);
    });
    return Object.values(groups).map((g) => ({
      ...g,
      count: g.list.length,
      closed: g.list.filter(isClosedRecord).length,
      approved: g.list.filter((r) => isApprovedBillable(r, workingHours)).length,
      recorded: sumRecorded(g.list),
      billable: sumBillable(g.list, workingHours),
      invoiced: g.list.filter((r) => r.invoiceId).length,
    }));
  }, [filtered, workingHours]);

  const projectOptions = useMemo(
    () =>
      [...new Set(records.map((r) => r.projectId))]
        .map((id) => projectsById[id])
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ value: p.id, label: p.name })),
    [records, projectsById],
  );

  const totals = useMemo(
    () => ({ recorded: sumRecorded(filtered), billable: sumBillable(filtered, workingHours), count: filtered.length }),
    [filtered, workingHours],
  );

  const monthLabel = (m) => formatDate(`${m}-01`, 'MMMM yyyy');
  const projectName = (id) => projectsById[id]?.name ?? 'Unknown project';

  const columns = [
    {
      key: 'project',
      header: 'Project',
      primary: true,
      sortValue: (r) => projectName(r.projectId),
      render: (r) => (
        <Link to={`/projects/${r.projectId}`} className="block max-w-[18rem] truncate font-medium text-ink hover:text-brand-700 hover:underline">
          {projectName(r.projectId)}
        </Link>
      ),
    },
    { key: 'month', header: 'Billing period', sortValue: (r) => r.month, render: (r) => <span className="whitespace-nowrap">{monthLabel(r.month)}</span> },
    { key: 'count', header: 'Records', align: 'right', sortValue: (r) => r.count },
    { key: 'recorded', header: 'Recorded hours', align: 'right', sortValue: (r) => r.recorded, render: (r) => formatDuration(r.recorded) },
    { key: 'billable', header: 'Approved billable', align: 'right', sortValue: (r) => r.billable, render: (r) => formatDuration(r.billable) },
    {
      key: 'review',
      header: 'Not billable yet',
      align: 'right',
      sortValue: (r) => r.closed - r.approved,
      render: (r) => (r.closed - r.approved > 0 ? <span className="text-warning-ink">{r.closed - r.approved} rec.</span> : <span className="text-ink-muted">—</span>),
    },
    { key: 'invoiced', header: 'On invoices', align: 'right', sortValue: (r) => r.invoiced, render: (r) => `${r.invoiced} / ${r.count}` },
  ];

  const exportColumns = [
    { header: 'Project', value: (r) => projectName(r.projectId) },
    { header: 'Month', value: (r) => r.month },
    { header: 'Records', value: (r) => r.count },
    { header: 'Recorded hours', value: (r) => formatHours(r.recorded) },
    { header: 'Approved billable hours', value: (r) => formatHours(r.billable) },
    { header: 'Records on invoices', value: (r) => r.invoiced },
  ];

  const isFiltered = Boolean(projectId || range.from || range.to);

  return (
    <Card>
      <CardHeader
        title="Attendance & hours"
        icon={Clock}
        description={`${totals.count} records · ${formatDuration(totals.recorded)} recorded · ${formatDuration(totals.billable)} approved billable`}
      />
      <FilterBar
        count={rows.length}
        noun="period"
        isFiltered={isFiltered}
        onReset={() => {
          setRange({ from: '', to: '' });
          setProjectId('');
        }}
        actions={<ExportButton rows={rows} columns={exportColumns} filename="customer-hours" />}
      >
        <DateRangePicker value={range} onChange={setRange} compact />
        <SelectField
          aria-label="Filter by project"
          size="sm"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="All projects"
          options={projectOptions}
          className="w-full sm:w-56"
        />
      </FilterBar>
      <DataTable
        columns={columns}
        rows={rows}
        initialSort={{ key: 'month', dir: 'desc' }}
        dense
        caption="Hours by project and month"
        emptyState={<EmptyState compact icon={Clock} title="No attendance in this selection" description="Change the period or project filter." />}
      />
      <p className="border-t border-line px-4 py-3 text-xs text-ink-muted">
        Approved billable hours exclude open, cancelled, excluded and not-yet-reviewed records. Open the{' '}
        <Link to="/attendance" className="font-medium text-brand-700 hover:underline">
          attendance list
        </Link>{' '}
        to review individual records.
      </p>
    </Card>
  );
}
