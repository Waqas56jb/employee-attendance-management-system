import { PageHeader } from '../../components/common/PageHeader';
import { SettingsNav } from '../../components/settings/SettingsNav';
import { InvoiceSettingsForm } from '../../components/settings/InvoiceSettingsForm';

export default function InvoiceSettingsPage() {
  return (
    <>
      <PageHeader
        title="Invoice settings"
        description="Numbering, payment terms, tax defaults and the texts printed on every invoice."
        breadcrumbs={[{ label: 'Settings', to: '/settings' }, { label: 'Invoices' }]}
      />
      <SettingsNav />
      <InvoiceSettingsForm />
    </>
  );
}
