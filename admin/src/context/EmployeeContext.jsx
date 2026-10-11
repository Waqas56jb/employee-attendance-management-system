import { createContext, useMemo } from 'react';
import { useDb } from '../hooks/useStore';
import * as employeeService from '../services/employeeService';

export const EmployeeContext = createContext(null);

export function EmployeeProvider({ children }) {
  const { employees } = useDb();

  const value = useMemo(
    () => ({
      employees,
      employeesById: Object.fromEntries(employees.map((e) => [e.id, e])),
      activeEmployees: employees.filter((e) => e.status === 'active'),
      createEmployee: employeeService.createEmployee,
      updateEmployee: employeeService.updateEmployee,
      updateEmployeeAssignments: employeeService.updateEmployeeAssignments,
      setEmployeeStatus: employeeService.setEmployeeStatus,
      deleteEmployee: employeeService.deleteEmployee,
      suggestEmployeeNumber: () => employeeService.suggestEmployeeNumber(employees),
    }),
    [employees],
  );

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
}
