import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './Button';
import { downloadCsv, exportFilename } from '../../services/exportService';

/**
 * Exports exactly the rows passed in (i.e. the current filtered set).
 * columns: [{ header, value: (row) => any, total?: (totals) => any }]
 */
export function ExportButton({ rows, columns, filename, totals, label = 'Export CSV', size = 'sm', variant = 'secondary' }) {
  const onExport = () => {
    if (!rows.length) return;
    try {
      downloadCsv(exportFilename(filename), columns, rows, totals);
      toast.success(`Exported ${rows.length} row${rows.length === 1 ? '' : 's'} to CSV`);
    } catch {
      toast.error('The export could not be created.');
    }
  };
  return (
    <Button variant={variant} size={size} icon={Download} onClick={onExport} disabled={!rows.length} title={rows.length ? undefined : 'Nothing to export'}>
      {label}
    </Button>
  );
}
