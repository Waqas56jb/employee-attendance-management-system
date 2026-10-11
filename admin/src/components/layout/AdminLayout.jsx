import { Suspense, useCallback, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { MobileNavigation } from './MobileNavigation';
import { PageContainer } from './PageContainer';

export function AdminLayout() {
  const [collapsed, setCollapsed] = useLocalStorage('shiftwise.admin.sidebarCollapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const onLogout = useCallback(async () => {
    setMobileOpen(false);
    await logout();
    toast.success('You have been logged out.');
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main" className="sr-only z-50 rounded-lg bg-brand-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} onLogout={onLogout} />
      <MobileNavigation open={mobileOpen} onClose={closeMobile} onLogout={onLogout} />
      <div className={clsx('flex min-h-screen min-w-0 flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <AdminTopbar onOpenNav={() => setMobileOpen(true)} onLogout={onLogout} />
        <main id="main" className="min-w-0 flex-1">
          <PageContainer>
            <ErrorBoundary resetKey={location.pathname}>
              <Suspense fallback={<LoadingSpinner fullPage label="Loading page…" />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </PageContainer>
        </main>
      </div>
    </div>
  );
}
