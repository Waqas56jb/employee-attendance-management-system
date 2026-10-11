import { useId, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { employeeSchema } from '../../utils/validation';
import { useEmployees } from '../../hooks/useEmployees';
import { useProjects } from '../../hooks/useProjects';
import { useCustomers } from '../../hooks/useCustomers';
import { FormField, FormGrid, FormSection, Input, Textarea } from '../common/FormField';
import { SelectField } from '../common/SelectField';
import { MultiSelect } from '../common/MultiSelect';
import { Callout } from '../common/Callout';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';
import { assignmentOptions } from './employeeUtils';

const NO_IDS = [];

const CREATE_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function Section({ variant, title, description, children }) {
  if (variant === 'page') {
    return (
      <FormSection title={title} description={description}>
        {children}
      </FormSection>
    );
  }
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Create / edit employee form.
 *  - `onSubmit(values)` may throw a ServiceError; `.field` errors are shown inline.
 *  - In edit mode the status is shown read-only: status changes go through the
 *    dedicated actions so open-shift checks and the audit reason apply.
 *  - `variant="page"` renders card sections with `footer`; `variant="modal"`
 *    renders plain sections and is submitted via `form={formId}` from outside.
 */
export function EmployeeForm({ mode = 'create', defaultValues, onSubmit, formId, variant = 'page', footer, currentProjectIds = NO_IDS }) {
  const { employees } = useEmployees();
  const { projects } = useProjects();
  const { customersById } = useCustomers();
  const fallbackId = useId();
  const id = formId ?? fallbackId;
  const departmentListId = `${id}-departments`;

  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(employeeSchema), defaultValues });

  const status = watch('status');

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [employees],
  );

  const options = useMemo(
    () => assignmentOptions(projects, customersById, { employeeStatus: status, currentIds: currentProjectIds }),
    [projects, customersById, status, currentProjectIds],
  );

  const submit = async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error?.field) setError(error.field, { type: 'server', message: error.message }, { shouldFocus: true });
      else toast.error(error?.message ?? 'The employee could not be saved.');
    }
  };

  return (
    <form id={id} onSubmit={handleSubmit(submit)} noValidate className="space-y-6">
      <Section variant={variant} title="Personal details" description="Contact details used for scheduling and the employee app.">
        <FormGrid>
          <FormField label="Full name" required error={errors.fullName?.message}>
            <Input autoComplete="off" placeholder="e.g. Maria Schulz" data-autofocus {...register('fullName')} />
          </FormField>
          <FormField label="Employee ID" required error={errors.employeeNumber?.message} hint="Must be unique. Letters, numbers and dashes.">
            <Input autoComplete="off" className="uppercase" {...register('employeeNumber')} />
          </FormField>
          <FormField label="Email" required error={errors.email?.message}>
            <Input type="email" autoComplete="off" placeholder="name@company.com" {...register('email')} />
          </FormField>
          <FormField label="Phone" required error={errors.phone?.message}>
            <Input type="tel" autoComplete="off" placeholder="+49 151 5550 0000" {...register('phone')} />
          </FormField>
        </FormGrid>
      </Section>

      <Section variant={variant} title="Employment" description="Role, department and status within your business.">
        <FormGrid>
          <FormField label="Job title" required error={errors.jobTitle?.message}>
            <Input autoComplete="off" placeholder="e.g. Facility Technician" {...register('jobTitle')} />
          </FormField>
          <FormField label="Department" required error={errors.department?.message} hint="Pick an existing department or type a new one.">
            <Input autoComplete="off" list={departmentListId} {...register('department')} />
          </FormField>
          <datalist id={departmentListId}>
            {departments.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <FormField label="Employment start date" required error={errors.employmentStartDate?.message}>
            <Input type="date" {...register('employmentStartDate')} />
          </FormField>
          {mode === 'create' ? (
            <FormField label="Employment status" required error={errors.status?.message}>
              <SelectField options={CREATE_STATUS_OPTIONS} {...register('status')} />
            </FormField>
          ) : (
            <div>
              <p className="label">Employment status</p>
              <div className="flex min-h-10 items-center">
                <EmployeeStatusBadge status={defaultValues.status} />
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">Use Activate, Deactivate or Archive on the employee page to change the status.</p>
            </div>
          )}
          <FormField label="Notes" optional error={errors.notes?.message} className="sm:col-span-2">
            <Textarea rows={3} placeholder="Internal notes (certifications, availability, …)" {...register('notes')} />
          </FormField>
        </FormGrid>
      </Section>

      <Section
        variant={variant}
        title="Project assignments"
        description="Only planned, active and on-hold projects can receive new employees."
      >
        <div className="space-y-3">
          {status !== 'active' && (
            <Callout tone="warning">
              {mode === 'create' ? 'Inactive employees' : 'This employee is not active and'} cannot be assigned to new projects.
              {currentProjectIds.length > 0 && ' Existing assignments can still be removed.'}
            </Callout>
          )}
          <FormField label="Assigned projects" optional error={errors.assignedProjectIds?.message} htmlFor={`${id}-projects`}>
            <Controller
              control={control}
              name="assignedProjectIds"
              render={({ field }) => (
                <MultiSelect
                  id={`${id}-projects`}
                  aria-label="Assigned projects"
                  options={options}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Search projects or customers…"
                  emptyText="No projects found"
                />
              )}
            />
          </FormField>
        </div>
      </Section>

      {typeof footer === 'function' ? footer({ isSubmitting }) : footer}
    </form>
  );
}
