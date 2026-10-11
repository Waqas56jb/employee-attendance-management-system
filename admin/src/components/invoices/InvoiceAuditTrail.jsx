import { History } from 'lucide-react';
import { formatDateTime } from '../../utils/dateUtils';

/** Chronological invoice history (newest first). */
export function InvoiceAuditTrail({ entries = [] }) {
  const sorted = [...entries].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''));
  if (!sorted.length) return <p className="text-sm text-ink-muted">No history recorded.</p>;
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {sorted.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="relative">
          <span className="absolute -left-[1.6rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-ink-muted">
            <History size={11} aria-hidden />
          </span>
          <p className="text-sm text-ink">{entry.action}</p>
          <p className="text-xs text-ink-muted">
            {formatDateTime(entry.at)}
            {entry.by ? ` · ${entry.by}` : ''}
          </p>
        </li>
      ))}
    </ol>
  );
}
