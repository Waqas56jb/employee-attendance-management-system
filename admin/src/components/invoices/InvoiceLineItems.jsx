import { useRef } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Clock, PackagePlus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Checkbox, FormField, Input } from '../common/FormField';
import { isLineAdjusted } from '../../utils/calculations';
import { formatMoney } from '../../utils/currency';
import { formatPeriod } from '../../utils/dateUtils';
import { formatHoursValue, pluralize } from '../../utils/formatters';
import { applyLineEdit, newCustomLine } from './invoiceUtils';

function LineMeta({ line }) {
  if (line.type !== 'hours') return <Badge tone="brand" icon={PackagePlus}>Additional service</Badge>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge tone="info" icon={Clock}>From attendance</Badge>
      <span className="text-xs text-ink-muted">
        {pluralize(line.attendanceRecordIds?.length ?? 0, 'record')} · {formatPeriod(line.workDateFrom, line.workDateTo)}
      </span>
    </span>
  );
}

function AdjustedNote({ line, currency }) {
  return (
    <p className="mt-1 text-xs text-warning-ink">
      Attendance: {formatHoursValue(line.originalQuantityHours)} · {formatMoney(line.originalAmount, currency)} → adjusted: {formatHoursValue(line.quantityHours)} ·{' '}
      {formatMoney(line.amount, currency)}
    </p>
  );
}

/** Read-only table used on finalized invoices and the totals step. */
function ReadOnlyLines({ lines, currency }) {
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col" className="text-right">Hours</th>
            <th scope="col" className="text-right">Rate</th>
            <th scope="col" className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const adjusted = isLineAdjusted(line);
            return (
              <tr key={line.id}>
                <td className="min-w-[16rem] align-top">
                  <p className="font-medium text-ink">{line.description}</p>
                  <div className="mt-1">
                    <LineMeta line={line} />
                  </div>
                  {adjusted && <AdjustedNote line={line} currency={currency} />}
                  {line.amountOverridden && <p className="mt-1 text-xs text-ink-muted">Amount set manually.</p>}
                  {line.adjustmentReason && (
                    <p className="mt-1 text-xs text-ink-secondary">
                      <span className="font-medium">{line.type === 'hours' ? 'Adjustment reason' : 'Reason / reference'}:</span> {line.adjustmentReason}
                    </p>
                  )}
                </td>
                <td className="tabular text-right align-top">{formatHoursValue(line.quantityHours, { suffix: false })}</td>
                <td className="tabular whitespace-nowrap text-right align-top">{line.hourlyRate ? formatMoney(line.hourlyRate, currency) : '—'}</td>
                <td className="tabular whitespace-nowrap text-right align-top font-medium text-ink">{formatMoney(line.amount, currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Invoice lines. Without `onChange` the lines render read-only.
 * In edit mode, attendance lines allow description / quantity / amount
 * override (with a required reason when they differ from attendance) and
 * additional service lines can be added and removed.
 */
export function InvoiceLineItems({ lines, currency = 'EUR', onChange, errors = {}, showErrors = false, onResetHours, emptyMessage = 'No lines.' }) {
  const counter = useRef(0);

  if (!onChange) {
    if (!lines.length) return <p className="px-5 py-6 text-center text-sm text-ink-muted">{emptyMessage}</p>;
    return <ReadOnlyLines lines={lines} currency={currency} />;
  }

  const edit = (id, field, value) => onChange(lines.map((line) => (line.id === id ? applyLineEdit(line, field, value, currency) : line)));
  const remove = (id) => onChange(lines.filter((line) => line.id !== id));
  const addCustom = () => {
    counter.current += 1;
    onChange([...lines, newCustomLine(`line_custom_${Date.now().toString(36)}_${counter.current}`, currency)]);
  };
  const hasRemovedHours = Boolean(onResetHours);

  return (
    <div className="space-y-3">
      {lines.length === 0 && <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">{emptyMessage}</p>}
      {lines.map((line, index) => {
        const e = showErrors ? errors[line.id] ?? {} : {};
        const adjusted = isLineAdjusted(line);
        const isHours = line.type === 'hours';
        return (
          <fieldset
            key={line.id}
            className={clsx('rounded-lg border bg-surface p-4', adjusted ? 'border-warning/50' : 'border-line', Object.keys(e).length && 'border-danger/50')}
          >
            <legend className="sr-only">Line {index + 1}</legend>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-ink-muted">Line {index + 1}</span>
                <LineMeta line={line} />
                {adjusted && (
                  <Badge tone="warning" icon={AlertTriangle}>
                    Adjusted
                  </Badge>
                )}
              </div>
              <Button
                variant="danger-ghost"
                size="xs"
                icon={Trash2}
                onClick={() => remove(line.id)}
                title={isHours ? 'Remove line — its attendance records stay unbilled' : 'Remove line'}
              >
                Remove
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
              <FormField label="Description" required error={e.description} className="sm:col-span-6">
                <Input value={line.description} maxLength={240} onChange={(ev) => edit(line.id, 'description', ev.target.value)} />
              </FormField>
              <FormField label={isHours ? 'Quantity (hours)' : 'Quantity'} required error={e.quantity} className="sm:col-span-2">
                <Input inputMode="decimal" value={line._qtyInput ?? String(line.quantityHours)} onChange={(ev) => edit(line.id, 'quantity', ev.target.value)} suffix={isHours ? 'h' : undefined} />
              </FormField>
              {isHours ? (
                <div className="sm:col-span-2">
                  <p className="label">Hourly rate</p>
                  <p className="tabular flex h-10 items-center text-sm text-ink">{formatMoney(line.hourlyRate, currency)} / h</p>
                </div>
              ) : (
                <FormField label="Unit rate" required error={e.rate} className="sm:col-span-2">
                  <Input inputMode="decimal" value={line._rateInput ?? ''} onChange={(ev) => edit(line.id, 'rate', ev.target.value)} suffix={currency} />
                </FormField>
              )}
              {line.amountOverridden ? (
                <FormField label="Amount (manual)" required error={e.amount} className="sm:col-span-2">
                  <Input inputMode="decimal" value={line._amountInput ?? ''} onChange={(ev) => edit(line.id, 'amount', ev.target.value)} suffix={currency} />
                </FormField>
              ) : (
                <div className="sm:col-span-2">
                  <p className="label">Amount</p>
                  <p className="tabular flex h-10 items-center text-sm font-semibold text-ink">{formatMoney(line.amount, currency)}</p>
                </div>
              )}
              <div className="sm:col-span-6">
                <Checkbox
                  label="Override line amount"
                  description={line.amountOverridden ? 'The amount no longer follows quantity × rate.' : 'Amount is calculated as quantity × rate.'}
                  checked={Boolean(line.amountOverridden)}
                  onChange={(ev) => edit(line.id, 'override', ev.target.checked)}
                />
              </div>
              {isHours && adjusted && (
                <div className="sm:col-span-6">
                  <AdjustedNote line={line} currency={currency} />
                </div>
              )}
              {(!isHours || adjusted || line.adjustmentReason) && (
                <FormField
                  label={isHours ? 'Reason for adjustment' : 'Reason / reference'}
                  required={!isHours || adjusted}
                  error={e.reason}
                  hint={isHours ? 'Recorded in the audit log.' : 'E.g. "Materials agreed by email on 12 Mar" or a PO number.'}
                  className="sm:col-span-6"
                >
                  <Input value={line.adjustmentReason ?? ''} maxLength={240} onChange={(ev) => edit(line.id, 'reason', ev.target.value)} />
                </FormField>
              )}
            </div>
          </fieldset>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={Plus} onClick={addCustom}>
          Add additional service line
        </Button>
        {hasRemovedHours && (
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onResetHours}>
            Rebuild attendance lines
          </Button>
        )}
      </div>
    </div>
  );
}
