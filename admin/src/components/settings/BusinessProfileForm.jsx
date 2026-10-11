import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useBusiness } from '../../hooks/useBusiness';
import { businessProfileSchema } from '../../utils/validation';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';
import { LOGO_RULES, readLogoFile, TIMEZONES } from '../../services/settingsService';
import { FormField, FormGrid, FormSection, Input } from '../common/FormField';
import { SelectField } from '../common/SelectField';
import { Button } from '../common/Button';
import { Callout } from '../common/Callout';
import { BackendHint } from './BackendHint';
import { BusinessLetterhead } from './BusinessLetterhead';
import { SettingsSaveBar } from './SettingsSaveBar';
import { useSettingsForm } from './useSettingsForm';

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` }));
const TIMEZONE_OPTIONS = TIMEZONES.map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') }));

function toForm(business) {
  return {
    name: business.name ?? '',
    logo: business.logo ?? null,
    email: business.email ?? '',
    phone: business.phone ?? '',
    street: business.address?.street ?? '',
    postalCode: business.address?.postalCode ?? '',
    city: business.address?.city ?? '',
    country: business.address?.country ?? '',
    website: business.website ?? '',
    registrationNumber: business.registrationNumber ?? '',
    taxId: business.taxId ?? '',
    currency: business.currency ?? 'EUR',
    timezone: business.timezone ?? 'Europe/Berlin',
  };
}

// The zod schema strips unknown keys, so the logo (managed outside the schema) is re-attached here.
const withLogo = (data, getValues) => ({ ...data, logo: getValues('logo') ?? null });

export function BusinessProfileForm() {
  const { business, updateBusinessProfile } = useBusiness();
  const defaults = useMemo(() => toForm(business), [business]);
  const { form, onSubmit, discard } = useSettingsForm({
    schema: businessProfileSchema,
    defaults,
    save: updateBusinessProfile,
    success: 'Business profile saved.',
    transform: withLogo,
  });
  const {
    register,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const fileRef = useRef(null);
  const [logoError, setLogoError] = useState('');
  const values = watch();

  const pickLogo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readLogoFile(file);
      setValue('logo', dataUrl, { shouldDirty: true });
      setLogoError('');
    } catch (error) {
      setLogoError(error.message);
    }
  };

  const removeLogo = () => {
    setValue('logo', null, { shouldDirty: true });
    setLogoError('');
  };

  const handleDiscard = () => {
    setLogoError('');
    discard();
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <FormSection title="Company" description="Shown in the header of every invoice and PDF export.">
            <FormGrid>
              <FormField label="Business name" required error={errors.name?.message} className="sm:col-span-2">
                <Input {...register('name')} autoComplete="organization" />
              </FormField>

              <FormField
                label="Logo"
                optional
                htmlFor="business-logo"
                error={logoError}
                hint="PNG, JPG, SVG or WebP, up to 300 KB."
                className="sm:col-span-2"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-subtle">
                    {values.logo ? (
                      <img src={values.logo} alt="Current logo" className="max-h-14 max-w-[6.5rem] object-contain" />
                    ) : (
                      <span className="text-xs text-ink-muted">No logo</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileRef}
                      id="business-logo"
                      type="file"
                      accept={LOGO_RULES.types.join(',')}
                      className="sr-only"
                      tabIndex={-1}
                      onChange={pickLogo}
                      aria-invalid={logoError ? 'true' : undefined}
                    />
                    <Button variant="secondary" size="sm" icon={ImagePlus} onClick={() => fileRef.current?.click()}>
                      {values.logo ? 'Replace logo' : 'Upload logo'}
                    </Button>
                    {values.logo && (
                      <Button variant="danger-ghost" size="sm" icon={Trash2} onClick={removeLogo}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </FormField>
              <Callout tone="demo" className="sm:col-span-2">
                Demo mode: the logo is stored only in this browser (LocalStorage) as an embedded image. It is not uploaded to any server.
              </Callout>

              <FormField label="Registration number" optional error={errors.registrationNumber?.message}>
                <Input {...register('registrationNumber')} placeholder="e.g. HRB 214587 B" />
              </FormField>
              <FormField label="VAT / tax ID" optional error={errors.taxId?.message}>
                <Input {...register('taxId')} placeholder="e.g. DE318274650" />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Contact" description="How customers reach your billing department.">
            <FormGrid>
              <FormField label="Contact email" required error={errors.email?.message}>
                <Input type="email" {...register('email')} autoComplete="email" />
              </FormField>
              <FormField label="Phone" required error={errors.phone?.message}>
                <Input type="tel" {...register('phone')} autoComplete="tel" />
              </FormField>
              <FormField label="Website" optional error={errors.website?.message} className="sm:col-span-2">
                <Input type="url" {...register('website')} placeholder="https://example.com" autoComplete="url" />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Address">
            <FormGrid>
              <FormField label="Street address" required error={errors.street?.message} className="sm:col-span-2">
                <Input {...register('street')} autoComplete="street-address" />
              </FormField>
              <FormField label="Postal code" required error={errors.postalCode?.message}>
                <Input {...register('postalCode')} autoComplete="postal-code" />
              </FormField>
              <FormField label="City" required error={errors.city?.message}>
                <Input {...register('city')} autoComplete="address-level2" />
              </FormField>
              <FormField label="Country" required error={errors.country?.message} className="sm:col-span-2">
                <Input {...register('country')} autoComplete="country-name" />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Regional defaults">
            <FormGrid>
              <FormField
                label="Default currency"
                required
                error={errors.currency?.message}
                hint="Used for new customers and invoices. Existing invoices keep the currency they were created in."
              >
                <SelectField options={CURRENCY_OPTIONS} {...register('currency')} />
              </FormField>
              <FormField
                label="Default time zone"
                required
                error={errors.timezone?.message}
                hint="Used to display dates and times."
                labelAction={<BackendHint />}
              >
                <SelectField options={TIMEZONE_OPTIONS} {...register('timezone')} />
              </FormField>
            </FormGrid>
            <p className="mt-4 text-xs text-ink-muted">
              Day boundaries for attendance (which work date a shift belongs to) must be calculated by the backend in this time zone. The demo uses
              the browser&apos;s local time.
            </p>
          </FormSection>
        </div>

        <aside className="min-w-0">
          <div className="space-y-3 xl:sticky xl:top-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Invoice letterhead preview</p>
            <BusinessLetterhead values={values} />
            <p className="text-xs text-ink-muted">Updates as you type. Finalized invoices keep the details they were issued with.</p>
          </div>
        </aside>
      </div>

      <SettingsSaveBar isDirty={isDirty} isSubmitting={isSubmitting} onDiscard={handleDiscard} />
    </form>
  );
}
