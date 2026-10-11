import { useContext } from 'react';
import { InvoiceContext } from '../context/InvoiceContext';

export function useInvoices() {
  const context = useContext(InvoiceContext);
  if (!context) throw new Error('useInvoices must be used inside InvoiceProvider.');
  return context;
}
