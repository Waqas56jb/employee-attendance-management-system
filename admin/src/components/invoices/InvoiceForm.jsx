import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, ArrowRight, FileCheck2, Printer, Save } from 'lucide-react';
import { Card, CardBody, CardFooter, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Callout } from '../common/Callout';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { DescriptionList } from '../common/DescriptionList';
import { InvoiceCalculationSummary } from '../billing/InvoiceCalculationSummary';
import { InvoiceWizardSteps } from './InvoiceWizardSteps';
import { InvoiceCustomerStep } from './InvoiceCustomerStep';
import { InvoicePeriodStep } from './InvoicePeriodStep';
import { InvoiceAttendanceStep } from './InvoiceAttendanceStep';
import { InvoiceLineItems } from './InvoiceLineItems';
import { InvoiceTermsFields } from './InvoiceTermsFields';
import { InvoicePreview } from './InvoicePreview';
import { parseDecimal, printElement, stripLine, toEditableLine, validateLineItems } from './invoiceUtils';
import { useInvoices } from '../../hooks/useInvoices';
import { useCustomers } from '../../hooks/useCustomers';
import { useProjects } from '../../hooks/useProjects';
import { useEmployees } from '../../hooks/useEmployees';
import { useBusiness } from '../../hooks/useBusiness';
import { useDb } from '../../hooks/useStore';
import { dueDateFor, invoiceLabel } from '../../services/invoiceService';
import { calculateInvoiceTotals, isLineAdjusted } from '../../utils/calculations';
import { formatMoney, toMajor, toMinor } from '../../utils/currency';
import { formatPeriod, getPresetRange } from '../../utils/dateUtils';
import { formatHoursValue, pluralize } from '../../utils/formatters';

const STEPS = [
  { label: 'Customer', title: 'Select customer', description: 'Who are you invoicing? Their billing details and tax defaults are applied.' },
  { label: 'Billing period', title: 'Billing period', description: 'Which work should be invoiced, and how should it be grouped into lines?' },
  { label: 'Attendance', title: 'Billable attendance', description: 'Approved, closed and not yet billed records with a valid rate are included.' },
  { label: 'Totals', title: 'Calculated totals', description: 'Lines are built from billable hours × the rate in force on each work date.' },
  { label: 'Review & adjust', title: 'Review & adjust', description: 'Edit lines, add services, set discount, tax, dates and notes.' },
  { label: 'Preview', title: 'Preview', description: 'This is how the invoice document will look.' },
  { label: 'Save or finalize', title: 'Save draft or finalize', description: 'Keep working on a draft, or issue the invoice.' },
];

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const LINE_FIELD_STEPS = ['lineItems', 'discountType', 'discountValue', 'discountReason', 'taxRate', 'taxLabel', 'issueDate', 'dueDate', 'paymentTerms', 'notes'];
const RECALC_CODES = ['ineligible', 'needs_recalculation', 'duplicate_billing'];

const selectionKey = (v) => [v.customerId, v.billingPeriodStart, v.billingPeriodEnd, v.projectId, v.employeeId, v.grouping].join('|');

function discountMinorOf(v) {
  if (v.discountType === 'none') return 0;
  const d = parseDecimal(v.discountValue);
  if (!Number.isFinite(d) || d < 0) return 0;
  return v.discountType === 'fixed' ? toMinor(d, v.currency) : d;
}

function buildInitial({ draft, query, customers, projects, newInvoiceDefaults, invoiceSettings, workingHours }) {
  if (draft) {
    const values = {
      customerId: draft.customerId,
      billingPeriodStart: draft.billingPeriodStart,
      billingPeriodEnd: draft.billingPeriodEnd,
      projectId: draft.projectId ?? '',
      employeeId: draft.employeeId ?? '',
      grouping: draft.grouping ?? invoiceSettings.defaultGrouping,
      currency: draft.currency,
      lineItems: draft.lineItems.map((l) => toEditableLine(l, draft.currency)),
      discountType: draft.discountType ?? 'none',
      discountValue:
        draft.discountType === 'fixed' ? toMajor(draft.discountValue, draft.currency).toFixed(2) : draft.discountType === 'percent' ? String(draft.discountValue) : '',
      discountReason: draft.discountReason ?? '',
      taxRate: String(draft.taxRate ?? 0),
      taxLabel: draft.taxLabel ?? 'VAT',
      issueDate: draft.issueDate,
      paymentTerms: String(draft.paymentTerms ?? 0),
      dueDate: draft.dueDate,
      notes: draft.notes ?? '',
    };
    const step = draft.needsRecalculation ? 2 : 4;
    return { values, step, linesKey: draft.needsRecalculation ? null : selectionKey(values) };
  }

  const customer = customers.find((c) => c.id === query.customer && c.status !== 'archived');
  const customerId = customer?.id ?? '';
  const defaults = newInvoiceDefaults(customerId);
  const preset = getPresetRange(workingHours?.defaultBillingPeriod || 'last_month');
  const from = DATE_KEY.test(query.from ?? '') ? query.from : preset.from;
  const to = DATE_KEY.test(query.to ?? '') ? query.to : preset.to;
  const project = projects.find((p) => p.id === query.project && p.customerId === customerId);
  const values = {
    customerId,
    billingPeriodStart: from,
    billingPeriodEnd: to,
    projectId: project?.id ?? '',
    employeeId: '',
    grouping: defaults.grouping || 'employee_project',
    currency: defaults.currency,
    lineItems: [],
    discountType: 'none',
    discountValue: '',
    discountReason: '',
    taxRate: String(defaults.taxRate ?? 0),
    taxLabel: defaults.taxLabel,
    issueDate: defaults.issueDate,
    paymentTerms: String(defaults.paymentTerms ?? 0),
    dueDate: defaults.dueDate,
    notes: defaults.notes ?? '',
  };
  return { values, step: customerId ? 1 : 0, linesKey: null };
}

/**
 * Guided invoice wizard: customer → period → attendance → totals → review →
 * preview → save draft / finalize. Business rules are enforced again by the
 * invoice service; client-side checks give immediate, field-level feedback.
 */
export function InvoiceForm({ draft = null, query = {} }) {
  const navigate = useNavigate();
  const db = useDb();
  const { invoices, prepareInvoiceLines, newInvoiceDefaults, saveDraft, finalizeInvoice } = useInvoices();
  const { customers, customersById } = useCustomers();
  const { projects, projectsById } = useProjects();
  const { employees, employeesById } = useEmployees();
  const { business, invoiceSettings, workingHours } = useBusiness();
  const previewRef = useRef(null);

  const [init] = useState(() => buildInitial({ draft, query, customers, projects, newInvoiceDefaults, invoiceSettings, workingHours }));
  const [values, setValues] = useState(init.values);
  const [step, setStep] = useState(init.step);
  const [maxReached, setMaxReached] = useState(init.step);
  const [linesKey, setLinesKey] = useState(init.linesKey);
  const [draftId, setDraftId] = useState(draft?.id ?? null);
  const [errors, setErrors] = useState({});
  const [showLineErrors, setShowLineErrors] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [saving, setSaving] = useState(null);

  const rule = invoiceSettings.dueDateRule;
  const customer = customersById[values.customerId];
  const currency = values.currency;
  const key = selectionKey(values);
  const selectionValid = Boolean(
    values.customerId && values.billingPeriodStart && values.billingPeriodEnd && values.billingPeriodEnd >= values.billingPeriodStart,
  );

  const prepared = useMemo(
    () =>
      selectionValid
        ? prepareInvoiceLines({
            customerId: values.customerId,
            billingPeriodStart: values.billingPeriodStart,
            billingPeriodEnd: values.billingPeriodEnd,
            projectId: values.projectId,
            employeeId: values.employeeId,
            currency: values.currency,
            grouping: values.grouping,
            excludeInvoiceId: draftId ?? undefined,
          })
        : null,
    [
      prepareInvoiceLines,
      selectionValid,
      values.customerId,
      values.billingPeriodStart,
      values.billingPeriodEnd,
      values.projectId,
      values.employeeId,
      values.currency,
      values.grouping,
      draftId,
    ],
  );

  const discountMinor = discountMinorOf(values);
  const taxRateNumber = Number.isFinite(parseDecimal(values.taxRate)) ? parseDecimal(values.taxRate) : 0;
  const totals = calculateInvoiceTotals({ lineItems: values.lineItems, discountType: values.discountType, discountValue: discountMinor, taxRate: taxRateNumber });
  const lineErrors = useMemo(() => validateLineItems(values.lineItems), [values.lineItems]);
  const adjustedCount = values.lineItems.filter((l) => isLineAdjusted(l)).length;

  /* ------------------------------ state updates ------------------------------ */

  const clearErrors = (fields) =>
    setErrors((current) => {
      if (!fields.some((f) => current[f])) return current;
      const next = { ...current };
      fields.forEach((f) => delete next[f]);
      return next;
    });

  const updateSelection = (patch) => {
    setValues((v) => ({ ...v, ...patch }));
    setMaxReached((m) => Math.min(m, 2));
    clearErrors(Object.keys(patch));
  };

  const changeCustomer = (customerId) => {
    if (customerId === values.customerId) return;
    const defaults = newInvoiceDefaults(customerId);
    setValues((v) => {
      const terms = defaults.paymentTerms ?? 0;
      return {
        ...v,
        customerId,
        projectId: projects.some((p) => p.id === v.projectId && p.customerId === customerId) ? v.projectId : '',
        employeeId: '',
        currency: defaults.currency,
        taxRate: String(defaults.taxRate ?? 0),
        taxLabel: defaults.taxLabel,
        paymentTerms: String(terms),
        dueDate: v.issueDate ? dueDateFor(v.issueDate, terms, rule) : v.dueDate,
        notes: defaults.notes ?? v.notes,
        lineItems: [],
      };
    });
    setLinesKey(null);
    setMaxReached((m) => Math.min(m, 1));
    clearErrors(['customerId']);
  };

  const updateTerms = (patch, kind) => {
    setValues((v) => {
      const next = { ...v, ...patch };
      if (kind === 'dates') {
        const terms = Number(next.paymentTerms);
        if (next.issueDate && next.paymentTerms !== '' && Number.isInteger(terms) && terms >= 0) next.dueDate = dueDateFor(next.issueDate, terms, rule);
      }
      return next;
    });
    clearErrors([...Object.keys(patch), ...(kind === 'dates' ? ['dueDate'] : [])]);
  };

  const setLines = (lineItems) => {
    setValues((v) => ({ ...v, lineItems }));
    clearErrors(['lineItems']);
  };

  const rebuildHoursLines = (v) => {
    const hours = (prepared?.lines ?? []).map((l) => toEditableLine(l, v.currency));
    const custom = v.lineItems.filter((l) => l.type !== 'hours');
    return { ...v, lineItems: [...hours, ...custom] };
  };

  const resetHoursLines = () => {
    if (!prepared) return;
    setValues((v) => rebuildHoursLines(v));
    setLinesKey(key);
    toast.success('Attendance lines rebuilt from current data.');
  };

  /* -------------------------------- validation ------------------------------- */

  const validateDetails = (v) => {
    const fields = {};
    const subtotal = v.lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    if (!v.lineItems.length) fields.lineItems = 'Add at least one invoice line.';
    if (v.discountType !== 'none') {
      const d = parseDecimal(v.discountValue);
      if (!Number.isFinite(d) || d < 0) fields.discountValue = 'Enter a valid discount (0 or more).';
      else if (v.discountType === 'percent' && d > 100) fields.discountValue = 'A percentage discount cannot exceed 100%.';
      else if (v.discountType === 'fixed' && Math.abs(d * 100 - Math.round(d * 100)) > 1e-6) fields.discountValue = 'Use at most two decimal places.';
      else if (v.discountType === 'fixed' && toMinor(d, v.currency) > subtotal) fields.discountValue = 'The discount cannot exceed the subtotal.';
      if (Number.isFinite(d) && d > 0 && !v.discountReason.trim()) fields.discountReason = 'Enter a reason for the discount.';
    }
    const tax = parseDecimal(v.taxRate);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) fields.taxRate = 'Enter a tax rate between 0 and 100 %.';
    const terms = Number(v.paymentTerms);
    if (v.paymentTerms === '' || !Number.isInteger(terms) || terms < 0 || terms > 365) fields.paymentTerms = 'Enter whole days between 0 and 365.';
    if (!v.issueDate) fields.issueDate = 'Issue date is required.';
    if (!v.dueDate) fields.dueDate = 'Due date is required.';
    else if (v.issueDate && v.dueDate < v.issueDate) fields.dueDate = 'The due date must be on or after the issue date.';
    const lines = validateLineItems(v.lineItems);
    return { fields, hasLineErrors: Object.keys(lines).length > 0 };
  };

  /** Returns an error message (and records field errors) or null. */
  const checkStep = (index, v) => {
    if (index === 0 && !v.customerId) {
      setErrors((e) => ({ ...e, customerId: 'Select a customer.' }));
      return 'Select a customer to continue.';
    }
    if (index === 1) {
      const fields = {};
      if (!v.billingPeriodStart) fields.billingPeriodStart = 'Start date is required.';
      if (!v.billingPeriodEnd) fields.billingPeriodEnd = 'End date is required.';
      else if (v.billingPeriodStart && v.billingPeriodEnd < v.billingPeriodStart) fields.billingPeriodEnd = 'The end date must be on or after the start date.';
      if (Object.keys(fields).length) {
        setErrors((e) => ({ ...e, ...fields }));
        return 'Select a valid billing period.';
      }
    }
    if (index === 2 && (!prepared || prepared.summary.eligibleRecords === 0)) {
      return 'There is no billable attendance in this selection.';
    }
    if (index === 4) {
      const { fields, hasLineErrors } = validateDetails(v);
      if (Object.keys(fields).length || hasLineErrors) {
        setErrors((e) => ({ ...e, ...fields }));
        setShowLineErrors(true);
        return 'Fix the highlighted fields before continuing.';
      }
    }
    return null;
  };

  /** Moves to `target`, validating (and applying the transitions of) every step passed. */
  const goTo = (target) => {
    if (target <= step) {
      setStep(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    let working = values;
    for (let i = step; i < target; i += 1) {
      const error = checkStep(i, working);
      if (error) {
        toast.error(error);
        setValues(working);
        setStep(i);
        return;
      }
      if (i === 2 && selectionKey(working) !== linesKey) {
        const lost = working.lineItems.filter((l) => l.type === 'hours' && isLineAdjusted(l)).length;
        working = rebuildHoursLines(working);
        setLinesKey(selectionKey(working));
        if (lost) toast.info(`${pluralize(lost, 'manual line adjustment')} reset because the selection changed.`);
      }
    }
    setValues(working);
    setStep(target);
    setMaxReached((m) => Math.max(m, target));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ---------------------------------- saving --------------------------------- */

  const buildPayload = (v) => ({
    customerId: v.customerId,
    billingPeriodStart: v.billingPeriodStart,
    billingPeriodEnd: v.billingPeriodEnd,
    projectId: v.projectId || null,
    employeeId: v.employeeId || null,
    currency: v.currency,
    grouping: v.grouping,
    lineItems: v.lineItems.map(stripLine),
    discountType: v.discountType,
    discountValue: v.discountType === 'none' ? 0 : parseDecimal(v.discountValue) || 0,
    discountReason: v.discountType === 'none' ? '' : v.discountReason,
    taxRate: parseDecimal(v.taxRate),
    taxLabel: v.taxLabel,
    issueDate: v.issueDate,
    dueDate: v.dueDate,
    paymentTerms: Number(v.paymentTerms) || 0,
    notes: v.notes,
  });

  const validateBeforeSave = () => {
    for (const index of [0, 1, 4]) {
      const error = checkStep(index, values);
      if (error) {
        toast.error(error);
        setStep(index);
        return false;
      }
    }
    return true;
  };

  const handleServiceError = (error) => {
    const message = error?.message ?? 'Something went wrong. Please try again.';
    toast.error(message);
    if (RECALC_CODES.includes(error?.code)) {
      setLinesKey(null);
      setMaxReached((m) => Math.min(m, 2));
      setStep(2);
      return;
    }
    const field = error?.field;
    if (field === 'customerId') {
      setErrors((e) => ({ ...e, customerId: message }));
      setStep(0);
    } else if (field === 'billingPeriodStart' || field === 'billingPeriodEnd') {
      setErrors((e) => ({ ...e, [field]: message }));
      setStep(1);
    } else if (LINE_FIELD_STEPS.includes(field)) {
      setErrors((e) => ({ ...e, [field]: message }));
      setShowLineErrors(true);
      setStep(4);
    }
  };

  const saveAsDraft = async () => {
    if (!validateBeforeSave()) return;
    setSaving('draft');
    try {
      const invoice = await saveDraft(buildPayload(values), draftId);
      toast.success(draftId ? 'Draft updated' : `Draft ${invoiceLabel(invoice)} saved`);
      navigate(`/invoices/${invoice.id}`);
    } catch (error) {
      handleServiceError(error);
    } finally {
      setSaving(null);
    }
  };

  const finalize = async () => {
    if (!validateBeforeSave()) return;
    setSaving('finalize');
    try {
      const saved = await saveDraft(buildPayload(values), draftId);
      setDraftId(saved.id);
      const invoice = await finalizeInvoice(saved.id);
      toast.success(`Invoice ${invoice.invoiceNumber} finalized`);
      navigate(`/invoices/${invoice.id}`);
    } catch (error) {
      handleServiceError(error);
    } finally {
      setSaving(null);
    }
  };

  /* --------------------------------- rendering -------------------------------- */

  const previewInvoice = {
    id: draftId ?? 'new',
    invoiceNumber: null,
    status: 'draft',
    finalizedAt: null,
    voidedAt: null,
    customerSnapshot: null,
    customerId: values.customerId,
    issueDate: values.issueDate,
    dueDate: values.dueDate,
    paymentTerms: Number(values.paymentTerms) || 0,
    billingPeriodStart: values.billingPeriodStart,
    billingPeriodEnd: values.billingPeriodEnd,
    currency,
    lineItems: values.lineItems,
    discountType: values.discountType,
    discountValue: discountMinor,
    taxRate: taxRateNumber,
    taxLabel: values.taxLabel || 'VAT',
    notes: values.notes,
    amountPaid: 0,
  };

  const summaryProps = {
    lineItems: values.lineItems,
    discountType: values.discountType,
    discountValue: discountMinor,
    discountReason: values.discountReason,
    taxRate: taxRateNumber,
    taxLabel: values.taxLabel || 'VAT',
    currency,
  };

  const recordCount = values.lineItems.reduce((s, l) => s + (l.attendanceRecordIds?.length ?? 0), 0);
  const current = STEPS[step];
  const busy = Boolean(saving);
  const willRebuild = step === 2 && linesKey !== key && values.lineItems.some((l) => l.type === 'hours');

  let content = null;
  if (step === 0) {
    content = <InvoiceCustomerStep customers={customers} hourlyRates={db.hourlyRates} customerId={values.customerId} onChange={changeCustomer} error={errors.customerId} />;
  } else if (step === 1) {
    content = (
      <InvoicePeriodStep values={values} onChange={updateSelection} projects={projects} employees={employees} attendance={db.attendance} errors={errors} />
    );
  } else if (step === 2) {
    content = prepared ? (
      <div className="space-y-4">
        {draft?.needsRecalculation && linesKey === null && (
          <Callout tone="warning" title="Attendance on this draft changed">
            Records included in this draft were corrected, excluded or adjusted since it was saved. Continuing rebuilds the attendance lines from current data —
            manual adjustments on those lines will be reset. Additional service lines are kept.
          </Callout>
        )}
        {willRebuild && !draft?.needsRecalculation && (
          <Callout tone="info">The selection changed, so attendance lines will be rebuilt when you continue. Additional service lines are kept.</Callout>
        )}
        <InvoiceAttendanceStep prepared={prepared} currency={currency} employeesById={employeesById} projectsById={projectsById} invoices={invoices} />
      </div>
    ) : (
      <Callout tone="warning">Select a customer and a valid billing period first.</Callout>
    );
  } else if (step === 3) {
    content = (
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 overflow-hidden rounded-lg border border-line lg:col-span-3">
          <InvoiceLineItems lines={values.lineItems} currency={currency} emptyMessage="No lines — go back and load billable attendance." />
        </div>
        <div className="rounded-lg border border-line p-4 lg:col-span-2">
          <InvoiceCalculationSummary {...summaryProps} />
        </div>
      </div>
    );
  } else if (step === 4) {
    content = (
      <div className="space-y-6">
        {adjustedCount > 0 && (
          <Callout tone="warning" title={`${pluralize(adjustedCount, 'line')} differ from attendance-derived values`}>
            Original and adjusted values are shown on each line. Every adjusted line needs a reason — it is stored on the invoice and in the activity log.
          </Callout>
        )}
        {errors.lineItems && <Callout tone="danger">{errors.lineItems}</Callout>}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink">Invoice lines</h3>
          <InvoiceLineItems
            lines={values.lineItems}
            currency={currency}
            onChange={setLines}
            errors={lineErrors}
            showErrors={showLineErrors}
            onResetHours={prepared ? resetHoursLines : undefined}
            emptyMessage="No lines. Rebuild the attendance lines or add an additional service line."
          />
          <p className="mt-2 text-xs text-ink-muted">Removing an attendance line leaves its records unbilled, so they can go on a later invoice.</p>
        </section>
        <div className="border-t border-line pt-6">
          <InvoiceTermsFields values={values} onChange={updateTerms} errors={errors} currency={currency} dueDateRule={rule} />
        </div>
      </div>
    );
  } else if (step === 5) {
    content = (
      <div className="space-y-3">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Printer}
            onClick={() => {
              if (!printElement(previewRef.current, 'Draft invoice')) toast.error('Allow pop-ups for this site to print the invoice.');
            }}
          >
            Print
          </Button>
        </div>
        <InvoicePreview ref={previewRef} invoice={previewInvoice} customer={customer} business={business} invoiceSettings={invoiceSettings} />
      </div>
    );
  } else {
    content = (
      <div className="space-y-5">
        <DescriptionList
          columns={3}
          items={[
            { label: 'Customer', value: customer?.companyName },
            { label: 'Billing period', value: formatPeriod(values.billingPeriodStart, values.billingPeriodEnd) },
            { label: 'Lines', value: `${pluralize(values.lineItems.length, 'line')} · ${pluralize(recordCount, 'attendance record')}` },
            { label: 'Billable hours', value: formatHoursValue(totals.billableHours) },
            { label: 'Net amount (pre-tax)', value: formatMoney(totals.taxableAmount, currency) },
            { label: 'Total (tax-inclusive)', value: <span className="font-semibold">{formatMoney(totals.total, currency)}</span> },
          ]}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-line p-4">
            <p className="text-sm font-semibold text-ink">Save as draft</p>
            <p className="mt-1 text-sm text-ink-muted">
              Keeps the invoice editable. Its attendance records are reserved for this draft but not yet marked as billed. No number is assigned.
            </p>
          </div>
          <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
            <p className="text-sm font-semibold text-ink">Finalize invoice</p>
            <p className="mt-1 text-sm text-ink-muted">
              Assigns the next invoice number, freezes customer details, lines, rates and totals, and marks {pluralize(recordCount, 'attendance record')} as billed.
              Finalized invoices cannot be edited — only voided.
            </p>
          </div>
        </div>
        {adjustedCount > 0 && (
          <Callout tone="warning">
            {pluralize(adjustedCount, 'line')} deviate from attendance-derived values. The reasons you entered are kept on the invoice.
          </Callout>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InvoiceWizardSteps steps={STEPS} current={step} maxReached={maxReached} onSelect={goTo} />

      <div className={step === 4 ? 'grid items-start gap-4 lg:grid-cols-3' : ''}>
        <Card className={step === 4 ? 'min-w-0 lg:col-span-2' : 'min-w-0'}>
          <CardHeader title={`${step + 1}. ${current.title}`} description={current.description} />
          <CardBody>{content}</CardBody>
          <CardFooter className="justify-between">
            <div className="flex flex-wrap gap-2">
              {step > 0 && step < 6 && (
                <Button variant="secondary" icon={ArrowLeft} onClick={() => goTo(step - 1)} disabled={busy}>
                  Back
                </Button>
              )}
              {step === 6 && (
                <Button variant="secondary" icon={ArrowLeft} onClick={() => goTo(4)} disabled={busy}>
                  Back to editing
                </Button>
              )}
              <Button variant="ghost" to={draftId ? `/invoices/${draftId}` : '/invoices'} disabled={busy}>
                Cancel
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {step >= 3 && (
                <Button variant="secondary" icon={Save} onClick={saveAsDraft} loading={saving === 'draft'} disabled={busy && saving !== 'draft'}>
                  {draftId ? 'Save draft' : 'Save as draft'}
                </Button>
              )}
              {step < 6 ? (
                <Button iconRight={ArrowRight} onClick={() => goTo(step + 1)} disabled={busy || (step === 2 && (!prepared || prepared.summary.eligibleRecords === 0))}>
                  Continue
                </Button>
              ) : (
                <Button
                  icon={FileCheck2}
                  onClick={() => {
                    if (validateBeforeSave()) setConfirmFinalize(true);
                  }}
                  loading={saving === 'finalize'}
                  disabled={busy && saving !== 'finalize'}
                >
                  Finalize invoice
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>

        {step === 4 && (
          <aside className="card p-4 lg:sticky lg:top-20">
            <h3 className="mb-3 text-sm font-semibold text-ink">Totals</h3>
            <InvoiceCalculationSummary {...summaryProps} />
            {Object.keys(lineErrors).length > 0 && showLineErrors && (
              <p className="mt-3 flex items-start gap-1.5 text-xs font-medium text-danger-ink">
                <AlertTriangle size={13} className="mt-px shrink-0" aria-hidden />
                {pluralize(Object.keys(lineErrors).length, 'line')} need attention.
              </p>
            )}
          </aside>
        )}
      </div>

      <ConfirmDialog
        open={confirmFinalize}
        onClose={() => setConfirmFinalize(false)}
        onConfirm={finalize}
        tone="primary"
        title="Finalize this invoice?"
        confirmLabel="Finalize invoice"
        message={
          <div className="space-y-2">
            <p>
              Finalizing for <span className="font-medium text-ink">{customer?.companyName}</span> ({formatMoney(totals.total, currency)} incl. tax):
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>assigns the next unique invoice number,</li>
              <li>freezes the customer details, lines, rates, quantities and totals,</li>
              <li>marks {pluralize(recordCount, 'attendance record')} as billed so they cannot be invoiced twice.</li>
            </ul>
            <p>Afterwards the invoice can no longer be edited — mistakes are corrected by voiding it.</p>
          </div>
        }
      />
    </div>
  );
}
