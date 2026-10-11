import clsx from 'clsx';

/** Label/value pairs for detail pages. items: [{ label, value, span? }] */
export function DescriptionList({ items, columns = 2, className }) {
  return (
    <dl className={clsx('grid grid-cols-1 gap-x-6 gap-y-4', columns === 2 && 'sm:grid-cols-2', columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items
        .filter((item) => item && !item.hidden)
        .map((item) => (
          <div key={item.label} className={clsx('min-w-0', item.span && 'sm:col-span-full')}>
            <dt className="text-xs font-medium text-ink-muted">{item.label}</dt>
            <dd className="mt-1 break-words text-sm text-ink">{item.value === null || item.value === undefined || item.value === '' ? '—' : item.value}</dd>
          </div>
        ))}
    </dl>
  );
}
