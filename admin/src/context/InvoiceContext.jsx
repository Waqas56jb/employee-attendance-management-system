import { createContext, useMemo } from 'react';
import { useDb } from '../hooks/useStore';
import * as invoiceService from '../services/invoiceService';

export const InvoiceContext = createContext(null);

export function InvoiceProvider({ children }) {
  const db = useDb();
  const { invoices, payments } = db;

  const value = useMemo(() => {
    const paymentsByInvoice = {};
    payments.forEach((p) => {
      (paymentsByInvoice[p.invoiceId] = paymentsByInvoice[p.invoiceId] ?? []).push(p);
    });
    Object.values(paymentsByInvoice).forEach((list) => list.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate)));
    return {
      invoices,
      invoicesById: Object.fromEntries(invoices.map((i) => [i.id, i])),
      payments,
      paymentsByInvoice,
      prepareInvoiceLines: (selection) => invoiceService.prepareInvoiceLines(db, selection),
      newInvoiceDefaults: (customerId) => invoiceService.newInvoiceDefaults(db, customerId),
      saveDraft: invoiceService.saveDraft,
      recalculateDraft: invoiceService.recalculateDraft,
      deleteDraft: invoiceService.deleteDraft,
      finalizeInvoice: invoiceService.finalizeInvoice,
      markInvoiceSent: invoiceService.markInvoiceSent,
      recordPayment: invoiceService.recordPayment,
      voidInvoice: invoiceService.voidInvoice,
      releaseVoidedRecords: invoiceService.releaseVoidedRecords,
    };
  }, [db, invoices, payments]);

  return <InvoiceContext.Provider value={value}>{children}</InvoiceContext.Provider>;
}
