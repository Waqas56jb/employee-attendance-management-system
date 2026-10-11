import { useId, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarPlus, Save } from 'lucide-react';
import { hourlyRateSchema } from '../../utils/validation';
import { formatMoney, toMajor } from '../../utils/currency';
import { addDaysKey, formatDate, todayKey } from '../../utils/dateUtils';
import { findOverlappingRates, getRateStatus, RATE_STATUS } from '../../utils/calculations';
import { useBilling } from '../../hooks/useBilling';
import { useCustomers } from '../../hooks/useCustomers';
import { useBusiness } from '../../hooks/useBusiness';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { FormField, FormGrid, Input, Textarea } from '../common/FormField';
import { SelectField } from '../common/SelectField';
import { Callout } from '../common/Callout';
import { RateImpactPreview } from './RateImpactPreview';
import { currencySymbol } from './billingHelpers';

const OPEN_END = '9999-12-31';

function describeRate(rate) {
  return `${formatMoney(rate.amount, rate.currency)}/h (${formatDate(rate.effectiveFrom)} – ${rate.effectiveTo ? formatDate(rate.effectiveTo) : 'open-ended'})`;
}

/**
 * Create / schedule / edit an hourly rate in a modal.
 * - New rate: every field; an earlier open-ended rate is ended automatically.
 * - Scheduled (future) rate: amount, dates and notes can change.
 * - Active rate: only the end date and notes can change (service enforces).
 */
export function HourlyRateForm({ open, onClose, rate = null, defaultCustomerId = '' }) {
  const formId = useId();
  const { customers, customersById } = useCustomers();
  const { business } = useBusiness();
  const { hourlyRates, createRate, updateRate, previewRateImpact } = useBilling();
  const [run] = useAsyncAction();

  const status = rate ? getRateStatus(rate) : null;
  const mode = !rate ? 'create' : status === RATE_STATUS.SCHEDULED ? 'scheduled' : 'active';
  const locked = mode === 'active';

  const initialCustomer = rate?.customerId ?? defaultCustomerId;
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(hourlyRateSchema),
    defaultValues: rate
      ? {
          customerId: rate.customerId,
          amount: toMajor(rate.amount, rate.currency),
          currency: rate.currency,
          effectiveFrom: rate.effectiveFrom,
          effectiveTo: rate.effectiveTo ?? '',
          notes: rate.notes ?? '',
        }
      : {
          customerId: initialCustomer,
          amount: '',
          currency: customersById[initialCustomer]?.currency ?? business.currency,
          effectiveFrom: todayKey(),
          effectiveTo: '',
          notes: '',
        },
  });

  const values = watch();
  const customer = customersById[values.customerId];
  const currency = values.currency;
  const amountNumber = Number(String(values.amount ?? '').replace(',', '.'));
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(values.effectiveFrom ?? '');

  /* Explain how the new dates interact with existing rates (mirrors billingService.createRate). */
  const timeline = useMemo(() => {
    if (locked || !values.customerId || !validDate) return { effectiveTo: values.effectiveTo, notes: [], conflicts: [] };
    let effectiveTo = values.effectiveTo || '';
    const notes = [];
    const conflicts = [];
    const others = hourlyRates.filter((r) => r.id !== rate?.id && r.customerId === values.customerId && r.currency === currency && r.status !== RATE_STATUS.INACTIVE);
    if (!effectiveTo && mode === 'create') {
      const later = others.filter((r) => r.effectiveFrom > values.effectiveFrom).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0];
      if (later) {
        effectiveTo = addDaysKey(later.effectiveFrom, -1);
        notes.push(`This rate will end on ${formatDate(effectiveTo)}, because ${describeRate(later)} is already scheduled.`);
      }
    }
    const candidate = { id: rate?.id, customerId: values.customerId, currency, effectiveFrom: values.effectiveFrom, effectiveTo: effectiveTo || null };
    findOverlappingRates(hourlyRates, candidate).forEach((r) => {
      const canSplit = mode === 'create' && r.effectiveFrom < candidate.effectiveFrom && (r.effectiveTo || OPEN_END) <= (candidate.effectiveTo || OPEN_END);
      if (canSplit) {
        notes.push(`The ${describeRate(r)} rate will automatically end on ${formatDate(addDaysKey(candidate.effectiveFrom, -1))}, the day before this rate starts.`);
      } else {
        conflicts.push(`Overlaps ${describeRate(r)}. Adjust the dates or deactivate that rate first.`);
      }
    });
    return { effectiveTo, notes, conflicts };
  }, [hourlyRates, rate?.id, values.customerId, values.effectiveFrom, values.effectiveTo, currency, mode, locked, validDate]);

  const impact = useMemo(() => {
    if (locked || !validDate || !(amountNumber > 0)) return null;
    return previewRateImpact({
      customerId: values.customerId,
      amount: amountNumber,
      effectiveFrom: values.effectiveFrom,
      effectiveTo: timeline.effectiveTo || '',
      currency,
    });
  }, [locked, validDate, amountNumber, previewRateImpact, values.customerId, values.effectiveFrom, timeline.effectiveTo, currency]);

  const customerOptions = customers
    .filter((c) => c.status !== 'archived' || c.id === values.customerId)
    .map((c) => ({ value: c.id, label: `${c.companyName}${c.status !== 'active' ? ` (${c.status})` : ''}` }));

  const customerField = register('customerId');

  const onSubmit = async (data) => {
    try {
      await run(() => (rate ? updateRate(rate.id, data) : createRate(data)), {
        success: rate ? 'Hourly rate updated' : data.effectiveFrom > todayKey() ? 'Rate change scheduled' : 'Hourly rate saved',
        rethrow: true,
      });
      onClose();
    } catch (error) {
      if (error?.field) setError(error.field, { message: error.message });
    }
  };

  const title = mode === 'create' ? 'New hourly rate' : mode === 'scheduled' ? 'Edit scheduled rate' : 'Edit active rate';

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!isSubmitting}
      size="lg"
      title={title}
      description={customer ? `${customer.companyName} · invoiced in ${customer.currency}` : 'Hours are billed at the rate in force on each work date.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting} icon={mode === 'create' ? CalendarPlus : Save}>
            {mode === 'create' ? (values.effectiveFrom > todayKey() ? 'Schedule rate' : 'Save rate') : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {locked && (
          <Callout tone="info" title="This rate is already in force">
            Its amount and start date are frozen so past billing never changes retroactively. You can set an end date or edit the notes. To charge a
            different amount, create a new rate — the current one will end the day before.
          </Callout>
        )}
        {mode === 'scheduled' && (
          <Callout tone="info">This rate has not taken effect yet, so its amount and dates can still change. The start date must stay in the future.</Callout>
        )}

        <FormGrid>
          <FormField label="Customer" required error={errors.customerId?.message} className="sm:col-span-2">
            {rate ? (
              <Input value={customer?.companyName ?? 'Unknown customer'} readOnly />
            ) : (
              <SelectField
                {...customerField}
                onChange={(e) => {
                  customerField.onChange(e);
                  const next = customersById[e.target.value];
                  if (next) setValue('currency', next.currency, { shouldValidate: true });
                }}
                placeholder="Select a customer…"
                options={customerOptions}
              />
            )}
          </FormField>

          <FormField label="Hourly rate" required error={errors.amount?.message} hint={locked ? 'Frozen for an active rate.' : 'Net amount per hour, before tax.'}>
            <Input
              {...register('amount')}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              prefix={currencySymbol(currency)}
              suffix="/ h"
              readOnly={locked}
              placeholder="35.00"
            />
          </FormField>

          <FormField label="Currency" required error={errors.currency?.message} hint="Locked to the customer's invoice currency.">
            <Input {...register('currency')} readOnly />
          </FormField>

          <FormField label="Effective from" required error={errors.effectiveFrom?.message}>
            <Input {...register('effectiveFrom')} type="date" readOnly={locked} />
          </FormField>

          <FormField label="Effective to" optional error={errors.effectiveTo?.message} hint="Leave empty for an open-ended rate.">
            <Input {...register('effectiveTo')} type="date" min={values.effectiveFrom || undefined} />
          </FormField>

          <FormField label="Notes" optional error={errors.notes?.message} className="sm:col-span-2">
            <Textarea {...register('notes')} rows={2} maxLength={300} placeholder="e.g. Annual rate review, contract addendum 2026-03" />
          </FormField>
        </FormGrid>

        {timeline.notes.map((note) => (
          <Callout key={note} tone="info">
            {note}
          </Callout>
        ))}
        {timeline.conflicts.map((note) => (
          <Callout key={note} tone="warning" title="Overlapping rate">
            {note}
          </Callout>
        ))}

        {locked ? (
          values.effectiveTo && (
            <Callout tone="warning">
              Approved hours after {formatDate(values.effectiveTo)} will have no rate (and be flagged “No rate”) unless another rate starts the next day.
            </Callout>
          )
        ) : (
          <RateImpactPreview impact={impact} currency={currency} effectiveFrom={values.effectiveFrom} />
        )}
      </form>
    </Modal>
  );
}
