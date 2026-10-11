import { AuthProvider } from './AuthContext';
import { BusinessProvider } from './BusinessContext';
import { EmployeeProvider } from './EmployeeContext';
import { CustomerProvider } from './CustomerContext';
import { ProjectProvider } from './ProjectContext';
import { AttendanceProvider } from './AttendanceContext';
import { BillingProvider } from './BillingContext';
import { InvoiceProvider } from './InvoiceContext';
import { NotificationProvider } from './NotificationContext';

export function AppProviders({ children }) {
  return (
    <AuthProvider>
      <BusinessProvider>
        <EmployeeProvider>
          <CustomerProvider>
            <ProjectProvider>
              <AttendanceProvider>
                <BillingProvider>
                  <InvoiceProvider>
                    <NotificationProvider>{children}</NotificationProvider>
                  </InvoiceProvider>
                </BillingProvider>
              </AttendanceProvider>
            </ProjectProvider>
          </CustomerProvider>
        </EmployeeProvider>
      </BusinessProvider>
    </AuthProvider>
  );
}
