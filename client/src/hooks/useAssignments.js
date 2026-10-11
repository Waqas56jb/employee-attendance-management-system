import { useContext } from 'react';
import { AssignmentContext } from '../context/AssignmentContext';

export function useAssignments() {
  const context = useContext(AssignmentContext);
  if (!context) throw new Error('useAssignments must be used inside <AssignmentProvider>.');
  return context;
}
