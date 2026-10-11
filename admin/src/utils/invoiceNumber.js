/**
 * Invoice numbering: `${prefix}-${year}-${sequence padded to 4}`, e.g. INV-2026-0001.
 *
 * Numbers are assigned only on finalization. Drafts get a temporary
 * "DRAFT-xxxx" label so they are never confused with issued invoices.
 */

export function formatInvoiceNumber(prefix, year, sequence, padding = 4) {
  const cleanPrefix = (prefix || 'INV').trim().toUpperCase();
  return `${cleanPrefix}-${year}-${String(sequence).padStart(padding, '0')}`;
}

/**
 * Returns the next free invoice number and the sequence after it. If the
 * configured sequence collides with an existing number (e.g. after an import
 * or a manual settings change) it advances until the number is unique.
 */
export function allocateInvoiceNumber(settings, existingNumbers, year = new Date().getFullYear()) {
  const taken = new Set(existingNumbers.filter(Boolean).map((n) => n.toUpperCase()));
  let sequence = Math.max(1, Number(settings.nextSequence) || 1);
  let candidate = formatInvoiceNumber(settings.prefix, year, sequence);
  while (taken.has(candidate)) {
    sequence += 1;
    candidate = formatInvoiceNumber(settings.prefix, year, sequence);
  }
  return { invoiceNumber: candidate, nextSequence: sequence + 1 };
}

/** Highest sequence already used for a prefix/year, so settings can't move the counter backwards into a collision. */
export function highestUsedSequence(prefix, existingNumbers, year = new Date().getFullYear()) {
  const pattern = new RegExp(`^${(prefix || 'INV').trim().toUpperCase()}-${year}-(\\d+)$`);
  return existingNumbers.reduce((max, number) => {
    const match = pattern.exec((number || '').toUpperCase());
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
}

export function draftLabel(id) {
  return `DRAFT-${id.slice(-4).toUpperCase()}`;
}
