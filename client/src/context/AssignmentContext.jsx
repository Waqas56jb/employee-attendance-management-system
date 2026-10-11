import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getMyCustomers } from '../services/customerService';
import { getMyProjects } from '../services/projectService';

export const AssignmentContext = createContext(null);

/** The employee's assigned projects and the customers linked to them. */
export function AssignmentProvider({ children }) {
  const { employee, handleAuthError } = useAuth();
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState('idle');

  const employeeId = employee?.id;

  const load = useCallback(async () => {
    if (!employeeId) return;
    setStatus('loading');
    try {
      const [p, c] = await Promise.all([getMyProjects(), getMyCustomers()]);
      setProjects(p);
      setCustomers(c);
      setStatus('ready');
    } catch (error) {
      if (!handleAuthError(error)) setStatus('error');
    }
  }, [employeeId, handleAuthError]);

  useEffect(() => {
    if (employeeId) load();
    else {
      setProjects([]);
      setCustomers([]);
      setStatus('idle');
    }
  }, [employeeId, load]);

  const value = useMemo(() => {
    const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]));
    const customersById = Object.fromEntries(customers.map((c) => [c.id, c]));
    const activeProjects = projects.filter((p) => p.status === 'active');
    return {
      projects,
      customers,
      projectsById,
      customersById,
      activeProjects,
      status,
      isLoading: status === 'loading' || status === 'idle',
      reload: load,
    };
  }, [projects, customers, status, load]);

  return <AssignmentContext.Provider value={value}>{children}</AssignmentContext.Provider>;
}
