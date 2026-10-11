import { Link } from 'react-router-dom';
import { LogoMark } from '../common/AppLogo';
import { config } from '../../services/config';
import { AccountMenu } from './AccountMenu';
import { NotificationBell } from './NotificationBell';
import { ShiftIndicator } from './ShiftIndicator';

/** Compact header for phones and tablets (below lg). */
export function MobileHeader({ onLogout }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-md lg:hidden">
      <div className="flex h-14 items-center justify-between gap-2 px-4 sm:px-6">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-2" aria-label={`${config.appName} dashboard`}>
          <LogoMark size={28} />
          <span className="truncate text-[15px] font-semibold tracking-tight text-ink">{config.appName}</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <ShiftIndicator compact />
          <NotificationBell />
          <AccountMenu onLogout={onLogout} compact />
        </div>
      </div>
    </header>
  );
}

export default MobileHeader;
