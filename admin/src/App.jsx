import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { GuestRoute, ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Pages are code-split so the login screen loads fast.
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const EmployeesPage = lazy(() => import('./pages/employees/EmployeesPage'));
const CreateEmployeePage = lazy(() => import('./pages/employees/CreateEmployeePage'));
const EmployeeDetailsPage = lazy(() => import('./pages/employees/EmployeeDetailsPage'));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage'));
const CreateCustomerPage = lazy(() => import('./pages/customers/CreateCustomerPage'));
const CustomerDetailsPage = lazy(() => import('./pages/customers/CustomerDetailsPage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const CreateProjectPage = lazy(() => import('./pages/projects/CreateProjectPage'));
const ProjectDetailsPage = lazy(() => import('./pages/projects/ProjectDetailsPage'));
const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage'));
const AttendanceDetailsPage = lazy(() => import('./pages/attendance/AttendanceDetailsPage'));
const BillingPage = lazy(() => import('./pages/billing/BillingPage'));
const HourlyRatesPage = lazy(() => import('./pages/billing/HourlyRatesPage'));
const BillableHoursPage = lazy(() => import('./pages/billing/BillableHoursPage'));
const InvoicesPage = lazy(() => import('./pages/invoices/InvoicesPage'));
const CreateInvoicePage = lazy(() => import('./pages/invoices/CreateInvoicePage'));
const InvoiceDetailsPage = lazy(() => import('./pages/invoices/InvoiceDetailsPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const BusinessSettingsPage = lazy(() => import('./pages/settings/BusinessSettingsPage'));
const InvoiceSettingsPage = lazy(() => import('./pages/settings/InvoiceSettingsPage'));
const WorkingHoursSettingsPage = lazy(() => import('./pages/settings/WorkingHoursSettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/employees/new" element={<CreateEmployeePage />} />
            <Route path="/employees/:employeeId" element={<EmployeeDetailsPage />} />

            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/new" element={<CreateCustomerPage />} />
            <Route path="/customers/:customerId" element={<CustomerDetailsPage />} />

            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/new" element={<CreateProjectPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />

            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/attendance/:attendanceId" element={<AttendanceDetailsPage />} />

            <Route path="/billing" element={<BillingPage />} />
            <Route path="/billing/rates" element={<HourlyRatesPage />} />
            <Route path="/billing/hours" element={<BillableHoursPage />} />

            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/new" element={<CreateInvoicePage />} />
            <Route path="/invoices/:invoiceId" element={<InvoiceDetailsPage />} />

            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />

            <Route path="/settings" element={<Navigate to="/settings/business" replace />} />
            <Route path="/settings/business" element={<BusinessSettingsPage />} />
            <Route path="/settings/invoices" element={<InvoiceSettingsPage />} />
            <Route path="/settings/working-hours" element={<WorkingHoursSettingsPage />} />

            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
