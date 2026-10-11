import { useContext } from 'react';
import { BillingContext } from '../context/BillingContext';

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) throw new Error('useBilling must be used inside BillingProvider.');
  return context;
}
