import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

function pageList(page, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push(`gap-${p}`);
    result.push(p);
  });
  return result;
}

export function Pagination({ page, pageCount, total, pageSize, onChange }) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row">
      <p className="text-xs text-ink-muted" aria-live="polite">
        Showing <span className="font-medium text-ink">{formatNumber(start)}</span>–<span className="font-medium text-ink">{formatNumber(end)}</span> of{' '}
        <span className="font-medium text-ink">{formatNumber(total)}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-subtle disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        {pageList(page, pageCount).map((p) =>
          typeof p === 'string' ? (
            <span key={p} className="px-1 text-ink-muted" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={
                p === page
                  ? 'h-8 min-w-8 rounded-lg bg-brand-600 px-2 text-xs font-semibold text-white'
                  : 'h-8 min-w-8 rounded-lg px-2 text-xs font-medium text-ink-secondary hover:bg-subtle'
              }
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-subtle disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
