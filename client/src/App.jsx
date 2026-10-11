import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/common/ToastProvider';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './components/layout/ProtectedRoute';
import { AssignmentProvider } from './context/AssignmentContext';
import { AttendanceProvider } from './context/AttendanceContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { AttendanceHistoryPage } from './pages/AttendanceHistoryPage';
import { CheckInOutPage } from './pages/CheckInOutPage';
import { CustomerDetailsPage } from './pages/CustomerDetailsPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyCustomersPage } from './pages/MyCustomersPage';
import { MyProjectsPage } from './pages/MyProjectsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/check-in-out" element={<CheckInOutPage />} />
          <Route path="/attendance" element={<AttendanceHistoryPage />} />
          <Route path="/projects" element={<MyProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
          <Route path="/customers" element={<MyCustomersPage />} />
          <Route path="/customers/:customerId" element={<CustomerDetailsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/*
            Administrator addresses are not part of this app. Any attempt is
            sent through a role check that employees never pass. The real
            admin panel is a separate application with server-side authorization.
          */}
          <Route path="/admin/*" element={<ProtectedRoute roles={['admin']}><Navigate to="/dashboard" replace /></ProtectedRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <NotificationProvider>
          <AssignmentProvider>
            <AttendanceProvider>
              <AppRoutes />
              <ToastProvider />
            </AttendanceProvider>
          </AssignmentProvider>
        </NotificationProvider>
      </AuthProvider>
    </PreferencesProvider>
  );
}
