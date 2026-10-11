import { PageHeader } from '../../components/common/PageHeader';
import { SettingsNav } from '../../components/settings/SettingsNav';
import { WorkingHoursSettings } from '../../components/settings/WorkingHoursSettings';

export default function WorkingHoursSettingsPage() {
  return (
    <>
      <PageHeader
        title="Working hours"
        description="Standard schedule, attendance review rules and billing defaults."
        breadcrumbs={[{ label: 'Settings', to: '/settings' }, { label: 'Working hours' }]}
      />
      <SettingsNav />
      <WorkingHoursSettings />
    </>
  );
}
