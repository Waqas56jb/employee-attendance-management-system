import clsx from 'clsx';
import { Banknote, CalendarRange, Clock, FileClock, FileText, FolderKanban, History, Users } from 'lucide-react';
import { SelectField } from '../common/SelectField';

const ICONS = {
  employee_hours: Users,
  customer_billable: Clock,
  project_hours: FolderKanban,
  attendance_history: History,
  invoice_summary: FileText,
  outstanding_invoices: FileClock,
  revenue_by_customer: Banknote,
  monthly_billing: CalendarRange,
};

const GROUPS = [
  { label: 'Hours', types: ['employee_hours', 'customer_billable', 'project_hours', 'attendance_history'] },
  { label: 'Money', types: ['invoice_summary', 'outstanding_invoices', 'revenue_by_customer', 'monthly_billing'] },
];

/** Report picker: a grouped list on large screens, a select on small ones. */
export function ReportTypeNav({ types, value, onChange }) {
  const byValue = Object.fromEntries(types.map((t) => [t.value, t]));
  return (
    <>
      <div className="lg:hidden">
        <SelectField aria-label="Report type" value={value} onChange={(e) => onChange(e.target.value)} options={types.map((t) => ({ value: t.value, label: t.label }))} />
      </div>
      <nav aria-label="Report types" className="card hidden p-2 lg:block">
        {GROUPS.map((group) => (
          <div key={group.label} className="mb-2 last:mb-0">
            <p className="px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wider text-ink-muted">{group.label}</p>
            <ul className="space-y-0.5">
              {group.types.map((key) => {
                const type = byValue[key];
                if (!type) return null;
                const Icon = ICONS[key] ?? FileText;
                const active = key === value;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => onChange(key)}
                      aria-current={active ? 'page' : undefined}
                      className={clsx(
                        'flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        active ? 'bg-brand-50 text-brand-700' : 'text-ink-secondary hover:bg-subtle hover:text-ink',
                      )}
                    >
                      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
                      <span className={clsx('min-w-0', active && 'font-medium')}>{type.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
