import { PageHeader } from '../../components/common/PageHeader';
import { SettingsNav } from '../../components/settings/SettingsNav';
import { BusinessProfileForm } from '../../components/settings/BusinessProfileForm';
import { DemoDataCard } from '../../components/settings/DemoDataCard';

export default function BusinessSettingsPage() {
  return (
    <>
      <PageHeader
        title="Business profile"
        description="Company details, letterhead and regional defaults used on invoices and exports."
        breadcrumbs={[{ label: 'Settings', to: '/settings' }, { label: 'Business profile' }]}
      />
      <SettingsNav />
      <BusinessProfileForm />
      <div className="mt-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-danger-ink">Danger zone</h2>
        <DemoDataCard />
      </div>
    </>
  );
}
