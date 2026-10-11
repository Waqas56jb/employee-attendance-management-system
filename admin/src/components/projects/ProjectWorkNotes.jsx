import { Link } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { formatDateTime } from '../../utils/dateUtils';

/** Most recent check-in / check-out notes written by employees on this project. */
export function ProjectWorkNotes({ records, employeesById, limit = 8 }) {
  const notes = records
    .filter((r) => r.status !== 'cancelled')
    .flatMap((r) => [
      r.checkInNote ? { id: `${r.id}-in`, recordId: r.id, at: r.checkInAt, kind: 'Check-in', text: r.checkInNote, employeeId: r.employeeId } : null,
      r.checkOutNote && r.checkOutAt ? { id: `${r.id}-out`, recordId: r.id, at: r.checkOutAt, kind: 'Check-out', text: r.checkOutNote, employeeId: r.employeeId } : null,
    ])
    .filter(Boolean)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);

  return (
    <Card>
      <CardHeader icon={MessageSquareText} title="Work notes" description="Latest notes from check-in and check-out" />
      {notes.length === 0 ? (
        <EmptyState compact title="No notes yet" description="Notes employees add when checking in or out appear here." />
      ) : (
        <ul className="divide-y divide-line">
          {notes.map((n) => (
            <li key={n.id} className="px-5 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs text-ink-muted">
                <span>
                  <span className="font-medium text-ink-secondary">{employeesById[n.employeeId]?.fullName ?? 'Employee'}</span> · {n.kind}
                </span>
                <Link to={`/attendance/${n.recordId}`} className="hover:text-brand-700 hover:underline">
                  {formatDateTime(n.at)}
                </Link>
              </div>
              <p className="mt-1 text-sm text-ink">{n.text}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
