import { useEffect, useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '../common/Button';
import { Callout } from '../common/Callout';
import { FormField, FormGrid, FormSection, Input, Textarea } from '../common/FormField';
import { SelectField } from '../common/SelectField';
import { MultiSelect } from '../common/MultiSelect';
import { useCustomers } from '../../hooks/useCustomers';
import { useEmployees } from '../../hooks/useEmployees';
import { useAttendance } from '../../hooks/useAttendance';
import { PROJECT_STATUSES } from '../../services/projectService';
import { projectSchema } from '../../utils/validation';
import { ProjectCustomerSummary } from './ProjectCustomerSummary';

const FIELDS = ['name', 'projectNumber', 'customerId', 'description', 'address', 'startDate', 'endDate', 'status', 'assignedEmployeeIds', 'instructions', 'targetHours', 'internalNotes'];

// An empty number input means "no target" (undefined → stored as null), never 0.
const targetHoursValue = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

/**
 * Create / edit form for projects.
 * - `onSubmit(values)` must return a promise; ServiceErrors with `.field` are shown inline.
 * - With `formId` and `showActions={false}` the submit button can live in a modal footer.
 */
export function ProjectForm({ project, defaultValues, onSubmit, onCancel, submitLabel = 'Save project', formId, showActions = true, onSubmittingChange, compact = false }) {
  const { customers, customersById } = useCustomers();
  const { employees } = useEmployees();
  const { attendance } = useAttendance();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(projectSchema), defaultValues });

  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);

  const customerId = watch('customerId');
  const selectedCustomer = customersById[customerId];
  const previousCustomer = useRef(defaultValues?.customerId ?? '');

  // When the customer changes: replace the address if it was empty or came from the previous customer.
  useEffect(() => {
    const prevId = previousCustomer.current;
    if (prevId === customerId) return;
    previousCustomer.current = customerId;
    const address = (getValues('address') ?? '').trim();
    const prevAddress = (customersById[prevId]?.serviceAddress ?? '').trim();
    if (!address || (prevAddress && address === prevAddress)) {
      setValue('address', customersById[customerId]?.serviceAddress ?? '', { shouldValidate: Boolean(address) });
    }
  }, [customerId, customersById, getValues, setValue]);

  const hasAttendance = useMemo(() => Boolean(project && attendance.some((a) => a.projectId === project.id)), [project, attendance]);
  const customerLocked = hasAttendance && project && customerId !== project.customerId;

  const customerOptions = useMemo(
    () =>
      customers
        .filter((c) => c.status !== 'archived' || c.id === project?.customerId)
        .sort((a, b) => a.companyName.localeCompare(b.companyName))
        .map((c) => ({ value: c.id, label: `${c.companyName}${c.status === 'inactive' ? ' (inactive)' : ''}` })),
    [customers, project?.customerId],
  );

  const originallyAssigned = useMemo(() => project?.assignedEmployeeIds ?? [], [project]);
  const employeeOptions = useMemo(
    () =>
      employees
        .filter((e) => e.status !== 'archived' || originallyAssigned.includes(e.id))
        .sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || a.fullName.localeCompare(b.fullName))
        .map((e) => ({
          value: e.id,
          label: e.fullName,
          description: `${e.jobTitle} · ${e.employeeNumber}${e.status !== 'active' ? ` · ${e.status}` : ''}`,
          disabled: e.status !== 'active' && !originallyAssigned.includes(e.id),
          disabledReason: `${e.status === 'inactive' ? 'Inactive' : 'Archived'} employees cannot be newly assigned`,
        })),
    [employees, originallyAssigned],
  );

  const submit = async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error?.field && FIELDS.includes(error.field)) {
        setError(error.field, { type: 'server', message: error.message }, { shouldFocus: true });
      } else {
        toast.error(error?.message ?? 'The project could not be saved.');
      }
    }
  };

  const fields = (
    <div className="space-y-4">
      <FormSection title="Project details" description="Name, reference and the customer the work is billed to.">
        <FormGrid>
          <FormField label="Project name" required error={errors.name?.message} className="sm:col-span-2">
            <Input placeholder="e.g. Warehouse Operations Support" maxLength={120} {...register('name')} />
          </FormField>
          <FormField label="Project reference" required error={errors.projectNumber?.message} hint="Unique. Letters, numbers and dashes.">
            <Input className="uppercase" maxLength={20} {...register('projectNumber')} />
          </FormField>
          <FormField label="Status" required error={errors.status?.message}>
            <SelectField options={PROJECT_STATUSES} {...register('status')} />
          </FormField>
          <FormField
            label="Customer"
            required
            error={errors.customerId?.message}
            hint={hasAttendance ? 'This project has attendance records, so its customer cannot be changed.' : undefined}
            className="sm:col-span-2"
          >
            <SelectField placeholder="Select customer" options={customerOptions} {...register('customerId')} />
          </FormField>
          {customerLocked && (
            <Callout tone="warning" className="sm:col-span-2">
              Saving will fail: attendance already recorded on this project belongs to {customersById[project.customerId]?.companyName}. Create a new project for the new customer instead.
            </Callout>
          )}
          <FormField label="Description" optional error={errors.description?.message} className="sm:col-span-2">
            <Textarea rows={2} maxLength={1000} {...register('description')} />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Schedule & location">
        <FormGrid>
          <FormField
            label="Work address"
            required
            error={errors.address?.message}
            hint={selectedCustomer?.serviceAddress ? "Pre-filled from the customer's service address — edit if the site differs." : undefined}
            className="sm:col-span-2"
          >
            <Input maxLength={200} placeholder="Street, postal code, city" {...register('address')} />
          </FormField>
          <FormField label="Start date" required error={errors.startDate?.message}>
            <Input type="date" {...register('startDate')} />
          </FormField>
          <FormField label="End date" optional error={errors.endDate?.message} hint="Leave empty for ongoing work.">
            <Input type="date" min={watch('startDate') || undefined} {...register('endDate')} />
          </FormField>
          <FormField label="Target hours" optional error={errors.targetHours?.message} hint="Used for the progress bar on the project page.">
            <Input type="number" min={0} step="0.5" inputMode="decimal" suffix="h" {...register('targetHours', { setValueAs: targetHoursValue })} />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Team" description="Only active employees can be newly assigned. Assignments appear in the employee app.">
        <FormField label="Assigned employees" error={errors.assignedEmployeeIds?.message} htmlFor="project-employees">
          <Controller
            control={control}
            name="assignedEmployeeIds"
            render={({ field }) => (
              <MultiSelect
                id="project-employees"
                aria-label="Assigned employees"
                options={employeeOptions}
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder="Search employees…"
              />
            )}
          />
        </FormField>
      </FormSection>

      <FormSection title="Instructions & notes">
        <div className="space-y-4">
          <FormField label="Instructions for employees" optional error={errors.instructions?.message} hint="Shown to assigned employees in the employee app.">
            <Textarea rows={3} maxLength={2000} {...register('instructions')} />
          </FormField>
          <FormField label="Internal notes" optional error={errors.internalNotes?.message} hint="Only visible to administrators.">
            <Textarea rows={2} maxLength={2000} {...register('internalNotes')} />
          </FormField>
        </div>
      </FormSection>
    </div>
  );

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} noValidate>
      <div className={compact ? 'space-y-4' : 'grid grid-cols-1 gap-4 lg:grid-cols-3'}>
        {compact && <ProjectCustomerSummary customer={selectedCustomer} />}
        <div className={compact ? undefined : 'lg:col-span-2'}>{fields}</div>
        {!compact && (
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <ProjectCustomerSummary customer={selectedCustomer} />
          </aside>
        )}
      </div>
      {showActions && (
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
