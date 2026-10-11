import { Archive, Eye, Pencil, RotateCcw } from 'lucide-react';
import { Button } from '../common/Button';

export function CustomerRowActions({ customer, onAction }) {
  const name = customer.companyName;
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button variant="ghost" size="icon-sm" icon={Eye} to={`/customers/${customer.id}`} aria-label={`View ${name}`} title="View" />
      <Button variant="ghost" size="icon-sm" icon={Pencil} onClick={() => onAction('edit', customer)} aria-label={`Edit ${name}`} title="Edit" />
      {customer.status === 'archived' ? (
        <Button variant="ghost" size="icon-sm" icon={RotateCcw} onClick={() => onAction('restore', customer)} aria-label={`Restore ${name}`} title="Restore" />
      ) : (
        <Button variant="danger-ghost" size="icon-sm" icon={Archive} onClick={() => onAction('archive', customer)} aria-label={`Archive ${name}`} title="Archive" />
      )}
    </div>
  );
}
