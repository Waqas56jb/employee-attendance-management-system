import { formatMoney } from '../../utils/currency';
import { formatDateTime, formatDate } from '../../utils/dateUtils';
import { formatDuration, titleCase } from '../../utils/formatters';

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "checkInAt" → "Check in at" */
export function fieldLabel(key) {
  return titleCase(key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')).replace(/ Ids$/, 's').replace(/ Id$/, '');
}

/** Human-readable rendering of an audited value. */
export function formatAuditValue(key, value, { lookups = {}, currency = 'EUR' } = {}) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'None';
    return value.map((v) => formatAuditValue(key.replace(/Ids$/, 'Id'), v, { lookups, currency })).join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  if (/employeeId$/i.test(key)) return lookups.employeesById?.[value]?.fullName ?? value;
  if (/customerId$/i.test(key)) return lookups.customersById?.[value]?.companyName ?? value;
  if (/projectId$/i.test(key)) return lookups.projectsById?.[value]?.name ?? value;
  if (typeof value === 'number') {
    if (/minutes$/i.test(key)) return formatDuration(value);
    if (/(^amount$|Amount$|^rate$|Rate$|^total$|balanceDue|amountPaid)/.test(key) && !/taxRate/i.test(key)) return formatMoney(value, currency);
    return String(value);
  }
  const text = String(value);
  if (ISO_DATETIME.test(text)) return formatDateTime(text);
  if (ISO_DATE.test(text)) return formatDate(text);
  if (/status$/i.test(key)) return titleCase(text);
  return text;
}

/** Side-by-side previous → new values for an audit entry. */
export function ValueDiff({ previous, next, lookups, currency }) {
  const keys = [...new Set([...Object.keys(previous ?? {}), ...Object.keys(next ?? {})])];
  if (keys.length === 0) return null;
  return (
    <div className="min-w-0 max-w-full">
      <table className="w-full table-fixed break-words text-left text-xs">
        <thead>
          <tr className="text-2xs uppercase tracking-wide text-ink-muted">
            <th scope="col" className="py-1 pr-3 font-semibold">Field</th>
            <th scope="col" className="py-1 pr-3 font-semibold">Previous</th>
            <th scope="col" className="py-1 font-semibold">New</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key} className="border-t border-line align-top">
              <th scope="row" className="py-1.5 pr-3 font-medium text-ink-secondary">{fieldLabel(key)}</th>
              <td className="py-1.5 pr-3 text-ink-muted">
                <span className="line-through decoration-ink-muted/50">{formatAuditValue(key, previous?.[key], { lookups, currency })}</span>
              </td>
              <td className="py-1.5 font-medium text-ink">{formatAuditValue(key, next?.[key], { lookups, currency })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
