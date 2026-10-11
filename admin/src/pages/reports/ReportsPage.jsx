import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader } from '../../components/common/Card';
import { FilterBar } from '../../components/common/FilterBar';
import { DataTable } from '../../components/common/DataTable';
import { EmptyState } from '../../components/common/EmptyState';
import { Callout } from '../../components/common/Callout';
import { ReportFilters } from '../../components/reports/ReportFilters';
import { ReportSummary } from '../../components/reports/ReportSummary';
import { ReportExport } from '../../components/reports/ReportExport';
import { ReportTypeNav } from '../../components/reports/ReportTypeNav';
import { REPORT_DEFINITIONS, toSelectorFilters } from '../../components/reports/reportDefinitions';
import { useDb } from '../../hooks/useStore';
import { useLookups } from '../../hooks/useLookups';
import { useQueryState } from '../../hooks/useQueryState';
import { REPORT_TYPES } from '../../services/reportService';
import { formatPeriod } from '../../utils/dateUtils';

const DEFAULTS = { type: REPORT_TYPES[0].value, from: '', to: '', employee: '', customer: '', project: '', status: '' };

export default function ReportsPage() {
  const db = useDb();
  const navigate = useNavigate();
  const { employeesById, customersById, projectsById } = useLookups();
  const [values, setValue] = useQueryState(DEFAULTS);

  const type = REPORT_DEFINITIONS[values.type] ? values.type : DEFAULTS.type;
  const meta = REPORT_TYPES.find((t) => t.value === type);
  const definition = REPORT_DEFINITIONS[type];

  const ctx = useMemo(
    () => ({ employeesById, customersById, projectsById, currency: db.business.currency, workingHours: db.workingHours, now: new Date() }),
    [employeesById, customersById, projectsById, db.business.currency, db.workingHours],
  );

  const selectorFilters = toSelectorFilters(definition, values);
  const filterKey = JSON.stringify(selectorFilters);
  const rows = useMemo(() => definition.getRows(db, JSON.parse(filterKey)), [definition, db, filterKey]);
  const totals = useMemo(() => definition.totals(rows, ctx), [definition, rows, ctx]);
  const columns = useMemo(() => definition.columns(ctx), [definition, ctx]);
  const csvColumns = useMemo(() => definition.csv(ctx), [definition, ctx]);

  const relevantKeys = definition.filters.flatMap((f) => (f === 'range' ? ['from', 'to'] : [f]));
  const isFiltered = relevantKeys.some((k) => values[k]);
  const resetFilters = () => setValue(Object.fromEntries(relevantKeys.map((k) => [k, ''])));

  const footer = (
    <tr className="bg-subtle/60">
      {columns.map((c) => (
        <td key={c.key} className={clsx('border-t border-line px-4 py-2.5 text-sm', c.align === 'right' && 'tabular text-right')}>
          {c.footer ? c.footer(totals) : null}
        </td>
      ))}
    </tr>
  );

  return (
    <>
      <PageHeader
        title="Reports"
        description="Working hours, billable hours and invoicing figures for any period. Every table can be exported to CSV including its totals."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Reports' }]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <ReportTypeNav types={REPORT_TYPES} value={type} onChange={(next) => setValue('type', next)} />
        </aside>

        <div className="min-w-0 space-y-4">
          <ReportSummary items={definition.summary(totals, ctx)} />

          <Card>
            <CardHeader icon={BarChart3} title={meta.label} description={`${meta.description} · ${formatPeriod(selectorFilters.from, selectorFilters.to)}`} />
            <FilterBar
              count={rows.length}
              noun={definition.noun}
              isFiltered={isFiltered}
              onReset={resetFilters}
              actions={<ReportExport rows={rows} columns={csvColumns} totals={totals} type={type} from={selectorFilters.from} to={selectorFilters.to} />}
            >
              <ReportFilters
                filters={definition.filters}
                values={values}
                onChange={(patch) => setValue(patch)}
                employees={db.employees}
                customers={db.customers}
                projects={db.projects}
              />
            </FilterBar>
            <DataTable
              key={type}
              columns={columns}
              rows={rows}
              getRowId={definition.rowId ?? ((r) => r.id)}
              pageSize={15}
              resetKey={filterKey}
              footer={rows.length ? footer : null}
              onRowClick={definition.rowLink ? (r) => navigate(definition.rowLink(r)) : undefined}
              caption={meta.label}
              emptyState={
                <EmptyState
                  icon={BarChart3}
                  title="No data for these filters"
                  description="Try a wider date range or clear the filters."
                />
              }
            />
          </Card>

          {definition.money && (
            <Callout tone="info" title="How amounts are defined">
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>
                  <strong>Invoiced</strong> — totals (incl. tax) of finalized, non-void invoices, by invoice date. Drafts and void invoices are never counted.
                </li>
                <li>
                  <strong>Collected</strong> — payments actually recorded against invoices. Only this is cash received.
                </li>
                <li>
                  <strong>Outstanding</strong> — balance still due on finalized invoices. Unpaid invoices are not revenue collected.
                </li>
                <li>Money totals are shown in {db.business.currency}; rows in other currencies are listed but not added to the totals.</li>
              </ul>
            </Callout>
          )}
        </div>
      </div>
    </>
  );
}
