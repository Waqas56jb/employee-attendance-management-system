import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function Pagination({ page, pageSize, total, onChange, label = 'records' }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) {
    return <p className="text-xs text-ink-muted">{`Showing ${total} ${label}`}</p>;
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav className="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Pagination">
      <p className="tabular text-xs text-ink-muted">
        Showing <span className="font-medium text-ink">{from}</span>–<span className="font-medium text-ink">{to}</span> of{' '}
        <span className="font-medium text-ink">{total}</span> {label}
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" leftIcon={ChevronLeft} onClick={() => onChange(page - 1)} disabled={page <= 1}>
          Previous
        </Button>
        <span className="tabular px-1 text-xs text-ink-muted" aria-live="polite">
          Page {page} of {pageCount}
        </span>
        <Button size="sm" variant="secondary" rightIcon={ChevronRight} onClick={() => onChange(page + 1)} disabled={page >= pageCount}>
          Next
        </Button>
      </div>
    </nav>
  );
}

export default Pagination;
