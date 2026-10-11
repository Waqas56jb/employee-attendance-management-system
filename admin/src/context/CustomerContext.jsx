import { createContext, useMemo } from 'react';
import { useDb } from '../hooks/useStore';
import * as customerService from '../services/customerService';

export const CustomerContext = createContext(null);

export function CustomerProvider({ children }) {
  const { customers } = useDb();

  const value = useMemo(
    () => ({
      customers,
      customersById: Object.fromEntries(customers.map((c) => [c.id, c])),
      createCustomer: customerService.createCustomer,
      updateCustomer: customerService.updateCustomer,
      setCustomerStatus: customerService.setCustomerStatus,
      suggestCustomerNumber: () => customerService.suggestCustomerNumber(customers),
    }),
    [customers],
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}
