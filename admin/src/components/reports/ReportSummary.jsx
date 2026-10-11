import clsx from 'clsx';

const TONES = {
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
};

/** Totals of the filtered rows (the same totals as the table footer and CSV). */
export function ReportSummary({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Report totals">
      {items.map((item) => (
        <div key={item.label} className={clsx('card min-w-0 border-l-4 px-4 py-3', TONES[item.tone] ?? 'border-l-brand-500')}>
          <dt className="truncate text-xs font-medium text-ink-muted">{item.label}</dt>
          <dd className="tabular mt-1 truncate text-lg font-semibold tracking-tight text-ink sm:text-xl" title={typeof item.value === 'string' ? item.value : undefined}>
            {item.value}
          </dd>
          {item.hint && <dd className="mt-0.5 truncate text-2xs text-ink-muted">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
