import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../common/Button';
import { downloadCsv } from '../../services/exportService';

/** CSV of exactly the filtered rows, followed by a totals row. */
export function ReportExport({ rows, columns, totals, type, from, to }) {
  const onExport = () => {
    if (!rows.length) return;
    try {
      const period = from || to ? `_${from || 'start'}_to_${to || 'today'}` : '_all-dates';
      downloadCsv(`report_${type}${period}.csv`, columns, rows, totals);
      toast.success(`Exported ${rows.length} row${rows.length === 1 ? '' : 's'} with totals to CSV`);
    } catch {
      toast.error('The export could not be created.');
    }
  };
  return (
    <Button variant="secondary" size="sm" icon={Download} onClick={onExport} disabled={!rows.length} title={rows.length ? undefined : 'Nothing to export'}>
      Export CSV
    </Button>
  );
}
