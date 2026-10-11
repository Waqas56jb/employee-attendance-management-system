import { RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import { DateRangePicker } from '../common/DateRangePicker';

/** Period selector (scopes KPIs and charts) and the status refresh action. */
export function DashboardFilters({ range, onRangeChange, onRefresh, refreshing }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateRangePicker value={range} onChange={onRangeChange} allowAll={false} compact label="Dashboard period" />
      <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRefresh} loading={refreshing} title="Recalculate overdue invoices and open-shift alerts">
        Refresh
      </Button>
    </div>
  );
}
