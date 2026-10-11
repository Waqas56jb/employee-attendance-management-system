/**
 * Recharts tooltip body: value first (strong), series name secondary, keyed
 * with a short stroke of the series colour.
 * rows: optional (payload, label) => [{ key, name, value, color }]
 */
export function ChartTooltip({ active, payload, label, formatValue = (v) => v, title, rows }) {
  if (!active || !payload?.length) return null;
  const items = rows
    ? rows(payload, label)
    : payload.map((p) => ({ key: p.dataKey, name: p.name, value: formatValue(p.value, p), color: p.color ?? p.payload?.fill }));
  const heading = title ? title(payload, label) : label;
  return (
    <div className="min-w-[10rem] rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-raised">
      {heading && <p className="mb-1.5 font-medium text-ink-secondary">{heading}</p>}
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            {item.color && <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />}
            <span className="tabular font-semibold text-ink">{item.value}</span>
            <span className="truncate text-ink-muted">{item.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Legend row rendered as HTML (mirrors the mark: rect for bars/areas, line for lines). */
export function ChartLegend({ items }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-secondary">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={item.shape === 'line' ? 'h-0.5 w-3.5 rounded-full' : 'h-2.5 w-2.5 rounded-sm'}
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
