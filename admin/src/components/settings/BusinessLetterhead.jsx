import { Building2 } from 'lucide-react';

/** Live preview of the business block as it appears at the top of an invoice. */
export function BusinessLetterhead({ values }) {
  const { name, logo, street, postalCode, city, country, email, phone, website, registrationNumber, taxId } = values;
  const cityLine = [postalCode, city].filter((v) => v?.trim()).join(' ');
  const ids = [registrationNumber?.trim() && `Reg. ${registrationNumber.trim()}`, taxId?.trim() && `VAT ${taxId.trim()}`].filter(Boolean);

  return (
    <div className="rounded-lg border border-line bg-white p-5 text-[13px] leading-relaxed text-ink shadow-sm" aria-label="Invoice letterhead preview">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex h-12 max-w-[160px] items-center">
          {logo ? (
            <img src={logo} alt="Business logo" className="max-h-12 max-w-full object-contain" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-subtle text-ink-muted">
              <Building2 size={20} aria-hidden />
            </span>
          )}
        </div>
        <p className="text-lg font-semibold tracking-tight text-ink-muted">INVOICE</p>
      </div>
      <div className="mt-4 min-w-0 break-words">
        <p className="font-semibold">{name?.trim() || 'Business name'}</p>
        {street?.trim() && <p className="text-ink-secondary">{street}</p>}
        {(cityLine || country?.trim()) && <p className="text-ink-secondary">{[cityLine, country?.trim()].filter(Boolean).join(', ')}</p>}
        <div className="mt-2 text-xs text-ink-muted">
          {[email?.trim(), phone?.trim()].filter(Boolean).join(' · ')}
          {website?.trim() && <p>{website}</p>}
          {ids.length > 0 && <p>{ids.join(' · ')}</p>}
        </div>
      </div>
    </div>
  );
}
