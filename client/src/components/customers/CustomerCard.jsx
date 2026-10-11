import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Mail, MapPin, Phone, User } from 'lucide-react';
import { formatDuration, phoneHref, pluralize } from '../../utils/formatters';

export function CustomerCard({ customer, recordedMinutes = 0 }) {
  return (
    <article className="card flex flex-col transition-shadow duration-150 hover:shadow-raised">
      <div className="flex-1 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Building2 size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold leading-snug text-ink">
              <Link to={`/customers/${customer.id}`} className="hover:text-brand-700">
                {customer.companyName}
              </Link>
            </h3>
            {customer.industry && <p className="text-xs text-ink-muted">{customer.industry}</p>}
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-ink-secondary">
          {customer.contactPerson && (
            <p className="flex items-start gap-2">
              <User size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
              <span>
                {customer.contactPerson}
                {customer.contactRole && <span className="text-ink-muted"> · {customer.contactRole}</span>}
              </span>
            </p>
          )}
          {customer.address && (
            <p className="flex items-start gap-2">
              <MapPin size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
              {customer.address}
            </p>
          )}
          {customer.phone && (
            <a href={phoneHref(customer.phone)} className="flex items-center gap-2 text-brand-700 hover:underline">
              <Phone size={15} className="shrink-0" aria-hidden="true" />
              {customer.phone}
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="flex min-w-0 items-center gap-2 text-brand-700 hover:underline">
              <Mail size={15} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{customer.email}</span>
            </a>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
        <dl className="flex gap-6">
          <div>
            <dt className="text-xs text-ink-muted">Your projects</dt>
            <dd className="tabular text-sm font-semibold text-ink">{pluralize(customer.projectIds.length, 'project')}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Hours recorded</dt>
            <dd className="tabular text-sm font-semibold text-ink">{formatDuration(recordedMinutes)}</dd>
          </div>
        </dl>
        <Link
          to={`/customers/${customer.id}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
          aria-label={`View details for ${customer.companyName}`}
        >
          Details <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default CustomerCard;
