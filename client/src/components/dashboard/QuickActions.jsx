import { Link } from 'react-router-dom';
import { Building2, CalendarDays, Play, Square, User } from 'lucide-react';
import { useAttendance } from '../../hooks/useAttendance';
import { useShiftDialogs } from '../../hooks/useShiftDialogs';
import { Card, CardHeader } from '../common/Card';

const tileClass =
  'flex flex-col items-start gap-2 rounded-xl border border-line p-3.5 text-left text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-canvas';

export function QuickActions() {
  const { activeShift } = useAttendance();
  const { openCheckIn, openCheckOut } = useShiftDialogs();

  return (
    <Card>
      <CardHeader title="Quick actions" />
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={activeShift ? openCheckOut : () => openCheckIn()} className={tileClass}>
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${activeShift ? 'bg-danger-soft text-danger-ink' : 'bg-success-soft text-success-ink'}`}>
            {activeShift ? <Square size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          </span>
          {activeShift ? 'Check out' : 'Check in'}
        </button>
        <Link to="/attendance" className={tileClass}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <CalendarDays size={16} aria-hidden="true" />
          </span>
          My attendance
        </Link>
        <Link to="/customers" className={tileClass}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-soft text-info-ink">
            <Building2 size={16} aria-hidden="true" />
          </span>
          Customer contacts
        </Link>
        <Link to="/profile" className={tileClass}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-subtle text-ink-secondary">
            <User size={16} aria-hidden="true" />
          </span>
          My profile
        </Link>
      </div>
    </Card>
  );
}

export default QuickActions;
