import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FullPageLoader } from '../common/LoadingSpinner';

/**
 * Client-side route guard — a UX convenience for the demo only. Real
 * authorization must be enforced by the backend on every request.
 *
 * - Unauthenticated users are sent to /login (and returned afterwards).
 * - If `roles` is given and the user's role is not included, /unauthorized is shown.
 */
export function ProtectedRoute({ roles, children }) {
  const { status, role } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/unauthorized" replace state={{ attempted: location.pathname }} />;
  }

  return children ?? <Outlet />;
}

/** Login / forgot-password pages: signed-in users go straight to the dashboard. */
export function PublicOnlyRoute({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return children ?? <Outlet />;
}

export default ProtectedRoute;
