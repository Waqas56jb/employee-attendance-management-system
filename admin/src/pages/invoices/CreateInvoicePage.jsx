import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorState } from '../../components/common/ErrorState';
import { InvoiceForm } from '../../components/invoices/InvoiceForm';
import { useInvoices } from '../../hooks/useInvoices';
import { invoiceLabel } from '../../services/invoiceService';
import { INVOICE_STATUS } from '../../utils/calculations';

export default function CreateInvoicePage() {
  // Remount for every navigation to this route (e.g. "Create invoice" while editing a draft).
  const location = useLocation();
  return <CreateInvoiceContent key={location.key} />;
}

function CreateInvoiceContent() {
  const [params] = useSearchParams();
  const { invoicesById } = useInvoices();

  // Snapshot the URL and the draft once: after finalizing, the draft becomes a
  // finalized invoice and the wizard must not re-initialise mid-navigation.
  const [entry] = useState(() => {
    const draftId = params.get('draft');
    return {
      draftId,
      draft: draftId ? invoicesById[draftId] ?? null : null,
      query: { customer: params.get('customer') ?? '', from: params.get('from') ?? '', to: params.get('to') ?? '', project: params.get('project') ?? '' },
    };
  });

  const breadcrumbs = [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Invoices', to: '/invoices' }];

  if (entry.draftId && !entry.draft) {
    return (
      <>
        <PageHeader title="Edit draft" breadcrumbs={[...breadcrumbs, { label: 'Edit draft' }]} />
        <ErrorState title="Draft not found" message="This draft does not exist or was deleted." backTo="/invoices" backLabel="Back to invoices" />
      </>
    );
  }
  if (entry.draft && entry.draft.status !== INVOICE_STATUS.DRAFT) {
    return (
      <>
        <PageHeader title="Edit draft" breadcrumbs={[...breadcrumbs, { label: 'Edit draft' }]} />
        <ErrorState
          title="This invoice can no longer be edited"
          message={`${invoiceLabel(entry.draft)} is finalized. Finalized invoices are frozen financial records — void it and create a new invoice to make corrections.`}
          backTo={`/invoices/${entry.draft.id}`}
          backLabel="View invoice"
        />
      </>
    );
  }

  const editing = Boolean(entry.draft);
  return (
    <>
      <PageHeader
        title={editing ? `Edit ${invoiceLabel(entry.draft)}` : 'Create invoice'}
        description={
          editing
            ? 'Update the draft. Nothing is issued until you finalize it.'
            : 'Build an invoice from approved attendance in seven guided steps. Nothing is issued until you finalize it.'
        }
        breadcrumbs={[...breadcrumbs, ...(editing ? [{ label: invoiceLabel(entry.draft), to: `/invoices/${entry.draft.id}` }, { label: 'Edit' }] : [{ label: 'New invoice' }])]}
      />
      <InvoiceForm draft={entry.draft} query={entry.query} />
    </>
  );
}
