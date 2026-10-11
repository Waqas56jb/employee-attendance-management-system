/** Compact preview of the notes / payment instructions / footer block of an invoice. */
export function InvoiceFooterPreview({ values }) {
  const { defaultNotes, paymentInstructions, footer } = values;
  const empty = !defaultNotes?.trim() && !paymentInstructions?.trim() && !footer?.trim();

  return (
    <div className="rounded-lg border border-line bg-white p-4 text-xs leading-relaxed text-ink shadow-sm" aria-label="Invoice footer preview">
      {empty ? (
        <p className="text-ink-muted">No texts configured. The bottom of the invoice will be empty.</p>
      ) : (
        <div className="space-y-3 break-words">
          {defaultNotes?.trim() && (
            <div>
              <p className="font-semibold text-ink-secondary">Notes</p>
              <p className="whitespace-pre-line">{defaultNotes}</p>
            </div>
          )}
          {paymentInstructions?.trim() && (
            <div>
              <p className="font-semibold text-ink-secondary">Payment</p>
              <p className="whitespace-pre-line">{paymentInstructions}</p>
            </div>
          )}
          {footer?.trim() && <p className="border-t border-line pt-2 text-center text-2xs text-ink-muted">{footer}</p>}
        </div>
      )}
    </div>
  );
}
