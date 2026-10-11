import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendance } from '../../hooks/useAttendance';
import { useAuth } from '../../hooks/useAuth';
import { AppBarProvider } from '../../context/AppBarContext';
import { ShiftDialogProvider } from '../../context/ShiftDialogContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AppSidebar } from './AppSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileHeader } from './MobileHeader';
import { Topbar } from './Topbar';

/** Authenticated employee workspace: sidebar + top bar on desktop, header + tab bar on mobile. */
export function AppLayout() {
  const { logout } = useAuth();
  const { activeShift } = useAttendance();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const online = useOnlineStatus();

  // Move focus to the main region on navigation so keyboard and screen-reader users land on the new page.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  const requestLogout = () => setConfirmLogout(true);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('You have been logged out.');
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  };

  return (
    <AppBarProvider>
      <ShiftDialogProvider>
        <div className="min-h-screen bg-canvas">
          <a
            href="#main-content"
            className="sr-only z-50 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to main content
          </a>
          <AppSidebar onLogout={requestLogout} />
          <div className="flex min-h-screen flex-col md:pl-24 lg:pl-64">
            <Topbar onLogout={requestLogout} />
            <MobileHeader onLogout={requestLogout} />
            {!online && (
              <div role="status" className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-xs font-medium text-warning-ink">
                <WifiOff size={14} aria-hidden="true" />
                You are offline. Demo data is stored on this device, so you can keep working.
              </div>
            )}
            <main id="main-content" ref={mainRef} tabIndex={-1} className="safe-x flex-1 outline-none">
              {/* Keyed by path so each screen fades in like an app transition. */}
              <div key={location.pathname} className="animate-fade-in">
                <Outlet />
              </div>
            </main>
          </div>
          <MobileBottomNav onLogout={requestLogout} />

          <ConfirmDialog
            open={confirmLogout}
            title="Log out?"
            description={
              activeShift
                ? 'Your shift is still running. Logging out does not end it — the timer keeps counting until you check out.'
                : 'You will need to sign in again to record attendance.'
            }
            confirmLabel="Log out"
            tone={activeShift ? 'danger' : 'primary'}
            icon={LogOut}
            loading={loggingOut}
            onConfirm={handleLogout}
            onCancel={() => setConfirmLogout(false)}
          />
        </div>
      </ShiftDialogProvider>
    </AppBarProvider>
  );
}

export default AppLayout;
