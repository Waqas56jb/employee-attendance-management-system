import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useFormatters } from '../../hooks/useFormatters';
import { useNow } from '../../hooks/useNow';
import { getRecordMinutes } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';

/**
 * Compact list of attendance sessions (used on project and customer pages).
 * `subtitle(record)` renders the second line, e.g. the project name.
 */
export function SessionList({ records, subtitle, initial = 6, emptyDescription }) {
  const fmt = useFormatters();
  const hasActive = records.some((r) => r.status === 'active');
  const now = useNow(30_000, hasActive);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? records : records.slice(0, initial);

  if (!records.length) {
    return (
      <EmptyState
        compact
        icon={CalendarDays}
        title="No sessions recorded"
        description={emptyDescription ?? 'Attendance you record here will appear in this list.'}
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-line">
        {visible.map((r) => {
          const note = r.checkOutNote || r.checkInNote;
          return (
            <li key={r.id} className="flex items-start gap-4 py-3.5 first:pt-0">
              <div className="w-24 shrink-0">
                <p className="text-sm font-medium text-ink">{fmt.date(r.checkInAt)}</p>
                <p className="tabular text-xs text-ink-muted">
                  {fmt.time(r.checkInAt)} – {r.status === 'active' ? 'now' : fmt.time(r.checkOutAt)}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                {subtitle && <p className="truncate text-sm font-medium text-ink">{subtitle(r)}</p>}
                {note ? <p className="line-clamp-2 text-xs text-ink-muted">{note}</p> : !subtitle && <p className="text-xs text-ink-muted">No notes</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="tabular text-sm font-semibold text-ink">{formatDuration(getRecordMinutes(r, now))}</span>
                <StatusBadge status={r.status} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        {records.length > initial ? (
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
            {expanded ? 'Show fewer' : `Show all ${records.length} sessions`}
          </Button>
        ) : (
          <span className="text-xs text-ink-muted">{records.length} session{records.length === 1 ? '' : 's'}</span>
        )}
        <Link to="/attendance" className="text-sm font-medium text-brand-700 hover:underline">
          Open attendance history
        </Link>
      </div>
    </>
  );
}

export default SessionList;
