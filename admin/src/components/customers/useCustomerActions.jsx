import { useCallback, useState } from 'react';
import { useCustomers } from '../../hooks/useCustomers';
import { useProjects } from '../../hooks/useProjects';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Callout } from '../common/Callout';
import { CustomerEditModal } from './CustomerEditModal';

/**
 * Shared customer actions for the list and the details page.
 *   trigger('edit' | 'activate' | 'deactivate' | 'archive' | 'restore', customer)
 * Render `elements` once in the page.
 */
export function useCustomerActions() {
  const { customersById, setCustomerStatus } = useCustomers();
  const { projects } = useProjects();
  const [run] = useAsyncAction();
  const [active, setActive] = useState(null);

  const close = useCallback(() => setActive(null), []);

  const trigger = useCallback(
    (type, customer) => {
      if (type === 'activate') {
        run(() => setCustomerStatus(customer.id, 'active', 'Reactivated'), { success: `${customer.companyName} is active` });
        return;
      }
      if (type === 'restore') {
        run(() => setCustomerStatus(customer.id, 'inactive', 'Restored from archive'), {
          success: `${customer.companyName} was restored as inactive`,
        });
        return;
      }
      setActive({ type, id: customer.id });
    },
    [run, setCustomerStatus],
  );

  const customer = active ? customersById[active.id] : null;
  const blocking = customer ? projects.filter((p) => p.customerId === customer.id && ['active', 'planned'].includes(p.status)) : [];

  let elements = null;
  if (customer && active.type === 'edit') elements = <CustomerEditModal customer={customer} onClose={close} />;
  if (customer && active.type === 'deactivate') {
    elements = (
      <ConfirmDialog
        open
        onClose={close}
        tone="warning"
        title={`Set ${customer.companyName} to inactive?`}
        confirmLabel="Set inactive"
        message="Inactive customers stay visible with all projects, attendance, rates and invoices. You can still invoice recorded work and reactivate them later."
        requireReason
        reasonLabel="Reason (for the activity log)"
        onConfirm={(reason) =>
          run(() => setCustomerStatus(customer.id, 'inactive', reason), { success: `${customer.companyName} is inactive`, rethrow: true })
        }
      />
    );
  }
  if (customer && active.type === 'archive') {
    elements = (
      <ConfirmDialog
        open
        onClose={close}
        title={`Archive ${customer.companyName}?`}
        confirmLabel="Archive customer"
        message="Archived customers are hidden from the default list. Projects, attendance, rates and invoices are kept for reporting and audits."
        requireReason
        reasonLabel="Archive reason"
        onConfirm={(reason) =>
          run(() => setCustomerStatus(customer.id, 'archived', reason), { success: `${customer.companyName} was archived`, rethrow: true })
        }
      >
        {blocking.length > 0 && (
          <Callout tone="warning" title="Active or planned projects">
            {blocking.map((p) => p.name).join(', ')} must be completed or archived first — archiving will be refused until then.
          </Callout>
        )}
      </ConfirmDialog>
    );
  }

  return { trigger, elements };
}
