import { Archive, Eye, Pencil, RotateCcw, UserCheck, UserMinus } from 'lucide-react';
import { Button } from '../common/Button';

/** Compact per-row actions: view, edit, activate/deactivate (or restore), archive. */
export function EmployeeRowActions({ employee, onAction }) {
  const name = employee.fullName;
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button variant="ghost" size="icon-sm" icon={Eye} to={`/employees/${employee.id}`} aria-label={`View ${name}`} title="View" />
      <Button variant="ghost" size="icon-sm" icon={Pencil} onClick={() => onAction('edit', employee)} aria-label={`Edit ${name}`} title="Edit" />
      {employee.status === 'active' && (
        <Button variant="ghost" size="icon-sm" icon={UserMinus} onClick={() => onAction('deactivate', employee)} aria-label={`Deactivate ${name}`} title="Deactivate" />
      )}
      {employee.status === 'inactive' && (
        <Button variant="ghost" size="icon-sm" icon={UserCheck} onClick={() => onAction('activate', employee)} aria-label={`Activate ${name}`} title="Activate" />
      )}
      {employee.status === 'archived' ? (
        <Button variant="ghost" size="icon-sm" icon={RotateCcw} onClick={() => onAction('restore', employee)} aria-label={`Restore ${name}`} title="Restore from archive" />
      ) : (
        <Button variant="danger-ghost" size="icon-sm" icon={Archive} onClick={() => onAction('archive', employee)} aria-label={`Archive ${name}`} title="Archive" />
      )}
    </div>
  );
}
