import { useContext } from 'react';
import { CustomerContext } from '../context/CustomerContext';

export function useCustomers() {
  const context = useContext(CustomerContext);
  if (!context) throw new Error('useCustomers must be used inside CustomerProvider.');
  return context;
}
