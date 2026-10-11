import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { LogoMark } from '../common/AppLogo';
import { config } from '../../services/config';
import { useAppBar } from '../../hooks/useAppBar';
import { cn } from '../../utils/cn';
import { AccountMenu } from './AccountMenu';
import { NotificationBell } from './NotificationBell';

/**
 * Phone app bar (below md). Native-app behaviour:
 *  - detail pages get a back arrow;
 *  - the page title appears in the bar once the large page heading scrolls away;
 *  - pads for the notch / status bar when installed to the home screen.
 */
export function MobileHeader({ onLogout }) {
  const appBar = useAppBar();
  const navigate = useNavigate();
  const { title, backTo, backLabel } = appBar?.page ?? {};
  const showTitle = Boolean(title) && !appBar?.titleVisible;

  return (
    <header className="safe-top safe-x sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-xl md:hidden">
      <div className="flex h-14 items-center justify-between gap-2 px-2">
        <div className="flex min-w-0 flex-1 items-center">
          {backTo ? (
            <button
              type="button"
              onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate(backTo))}
              className="press flex h-10 shrink-0 items-center gap-0.5 rounded-lg pl-1 pr-2 text-brand-700"
              aria-label={`Back to ${backLabel || 'previous page'}`}
            >
              <ChevronLeft size={26} strokeWidth={2.2} aria-hidden="true" />
              {!showTitle && <span className="animate-fade-in truncate text-[15px] font-medium">{backLabel}</span>}
            </button>
          ) : (
            <span className="w-2 shrink-0" aria-hidden="true" />
          )}

          {showTitle ? (
            <p
              key={title}
              className={cn('min-w-0 animate-fade-in truncate text-[17px] font-semibold tracking-tight text-ink', !backTo && 'pl-0')}
              aria-live="off"
            >
              {title}
            </p>
          ) : backTo ? null : (
            <Link to="/dashboard" className="flex min-w-0 animate-fade-in items-center gap-2" aria-label={`${config.appName} dashboard`}>
              <LogoMark size={28} />
              <span className="truncate text-[17px] font-semibold tracking-tight text-ink">{config.appName}</span>
            </Link>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 pr-1">
          <NotificationBell />
          <AccountMenu onLogout={onLogout} compact />
        </div>
      </div>
    </header>
  );
}

export default MobileHeader;
