import { StatusBadge } from '../common/StatusBadge';

export function EmployeeStatusBadge({ status, className }) {
  return <StatusBadge kind="employee" status={status} className={className} />;
}
