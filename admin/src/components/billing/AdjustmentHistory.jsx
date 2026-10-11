import { History } from 'lucide-react';
import { formatDateTime } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';

/** Audit list of billing adjustments on one attendance record (newest first). */
export function AdjustmentHistory({ record }) {
  const entries = [...(record.billingAdjustments ?? [])].reverse();
  const exclusion = record.billingExclusion;

  if (entries.length === 0 && !exclusion) {
    return <p className="text-xs text-ink-muted">No billing adjustments yet — billable time equals the recorded time.</p>;
  }

  return (
    <ol className="space-y-2">
      {exclusion && (
        <li className="rounded-lg border border-line bg-subtle px-3 py-2 text-sm">
          <p className="font-medium text-ink">Excluded from billing</p>
          <p className="text-ink-secondary">{exclusion.reason}</p>
          <p className="mt-0.5 text-2xs text-ink-muted">
            {exclusion.at ? formatDateTime(exclusion.at) : ''} · {exclusion.by ?? 'Administrator'}
          </p>
        </li>
      )}
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-2.5 rounded-lg border border-line px-3 py-2 text-sm">
          <History size={14} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
          <div className="min-w-0">
            {entry.field === 'billingExclusion' ? (
              <p className="font-medium text-ink">
                Included again <span className="font-normal text-ink-muted">(was excluded: {entry.previous})</span>
              </p>
            ) : (
              <p className="tabular font-medium text-ink">
                {formatDuration(entry.previous)} → {formatDuration(entry.next)}
              </p>
            )}
            <p className="break-words text-ink-secondary">{entry.reason}</p>
            <p className="mt-0.5 text-2xs text-ink-muted">
              {formatDateTime(entry.at)} · {entry.by}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
