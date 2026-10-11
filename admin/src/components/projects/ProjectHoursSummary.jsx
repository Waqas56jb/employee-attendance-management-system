import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Timer } from 'lucide-react';
import clsx from 'clsx';
import { Card, CardBody, CardHeader } from '../common/Card';
import { isApprovedBillable, isClosedRecord, sumBillable, sumRecorded } from '../../services/reportService';
import { getBillableMinutes } from '../../utils/calculations';
import { formatHours, formatHoursValue, formatNumber } from '../../utils/formatters';

function Metric({ label, value, hint }) {
  return (
    <div className="min-w-0 rounded-lg border border-line px-3 py-2.5">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="tabular mt-0.5 text-lg font-semibold text-ink">{value}</p>
      {hint && <p className="truncate text-2xs text-ink-muted">{hint}</p>}
    </div>
  );
}

/** Recorded vs billable hours, target progress and hours per employee for one project. */
export function ProjectHoursSummary({ project, records, employeesById, workingHours }) {
  const recorded = sumRecorded(records);
  const billable = sumBillable(records, workingHours);
  const pending = records.filter((r) => isClosedRecord(r) && !isApprovedBillable(r, workingHours) && !r.billingExclusion).length;
  const target = project.targetHours ? Number(project.targetHours) : null;
  const recordedHours = recorded / 60;
  const percent = target ? Math.round((recordedHours / target) * 100) : null;

  const byEmployee = useMemo(() => {
    const map = {};
    records.filter(isClosedRecord).forEach((r) => {
      const row = (map[r.employeeId] = map[r.employeeId] ?? { id: r.employeeId, recorded: 0, billable: 0, shifts: 0 });
      row.recorded += r.recordedDurationMinutes;
      row.shifts += 1;
      if (isApprovedBillable(r, workingHours)) row.billable += getBillableMinutes(r);
    });
    return Object.values(map).sort((a, b) => b.recorded - a.recorded);
  }, [records, workingHours]);
  const max = byEmployee[0]?.recorded || 1;

  return (
    <Card>
      <CardHeader icon={Timer} title="Hours" description="Recorded = closed shifts. Billable = approved, not excluded and not awaiting review." />
      <CardBody className="space-y-5">
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
          <Metric label="Recorded hours" value={formatHours(recorded)} hint={`${formatNumber(records.filter(isClosedRecord).length)} closed shifts`} />
          <Metric label="Billable hours" value={formatHours(billable)} hint={pending ? `${pending} record(s) awaiting review` : 'All closed shifts reviewed'} />
          <Metric label="Target" value={target ? formatHoursValue(target) : '—'} hint={target ? `${formatHoursValue(Math.max(target - recordedHours, 0))} remaining` : 'No target set'} />
        </div>

        {target && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-ink-secondary">Progress to target (recorded hours)</span>
              <span className={clsx('tabular font-semibold', percent > 100 ? 'text-danger-ink' : 'text-ink')}>{percent}%</span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-subtle"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(percent, 100)}
              aria-label="Progress to target hours"
            >
              <div className={clsx('h-full rounded-full', percent > 100 ? 'bg-danger' : percent > 85 ? 'bg-warning' : 'bg-brand-600')} style={{ width: `${Math.min(percent, 100)}%` }} />
            </div>
            {percent > 100 && <p className="mt-1 text-xs text-danger-ink">Target exceeded by {formatHoursValue(recordedHours - target)}.</p>}
          </div>
        )}

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Hours by employee</h3>
          {byEmployee.length === 0 ? (
            <p className="text-sm text-ink-muted">No closed shifts yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {byEmployee.map((row) => (
                <li key={row.id}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <Link to={`/employees/${row.id}`} className="truncate text-ink hover:text-brand-700 hover:underline">
                      {employeesById[row.id]?.fullName ?? 'Unknown employee'}
                    </Link>
                    <span className="tabular shrink-0 text-xs text-ink-secondary">
                      {formatHours(row.recorded)} h recorded · {formatHours(row.billable)} h billable
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden>
                    <div className="relative h-full rounded-full bg-brand-200" style={{ width: `${(row.recorded / max) * 100}%` }}>
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${row.recorded ? Math.min((row.billable / row.recorded) * 100, 100) : 0}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {byEmployee.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-3 text-2xs text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-3 rounded-sm bg-brand-600" aria-hidden /> Billable
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-3 rounded-sm bg-brand-200" aria-hidden /> Recorded, not billable
              </span>
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
