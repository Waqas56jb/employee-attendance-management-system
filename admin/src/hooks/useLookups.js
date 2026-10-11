import { useEmployees } from './useEmployees';
import { useCustomers } from './useCustomers';
import { useProjects } from './useProjects';
import { useInvoices } from './useInvoices';

/** id → record maps for rendering names in tables. */
export function useLookups() {
  const { employeesById } = useEmployees();
  const { customersById } = useCustomers();
  const { projectsById } = useProjects();
  const { invoicesById } = useInvoices();
  return { employeesById, customersById, projectsById, invoicesById };
}
