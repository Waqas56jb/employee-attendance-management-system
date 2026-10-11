import { Link } from 'react-router-dom';
import { ArrowRight, Building2, FolderKanban, Mail, MapPin, Phone, Timer, User } from 'lucide-react';
import { useAssignments } from '../../hooks/useAssignments';
import { isFinished } from '../../utils/dateUtils';
import { formatDuration, phoneHref } from '../../utils/formatters';
import { Card, CardHeader } from '../common/Card';
import { SessionList } from '../attendance/SessionList';
import { ProjectStatusBadge } from '../projects/ProjectStatusBadge';

export function CustomerDetails({ customer, records }) {
  const { projectsById } = useAssignments();
  const projects = customer.projectIds.map((id) => projectsById[id]).filter(Boolean);
  const finished = records.filter(isFinished);
  const total = finished.reduce((sum, r) => sum + (r.durationMinutes ?? 0), 0);
  const byProject = finished.reduce((acc, r) => ({ ...acc, [r.projectId]: (acc[r.projectId] || 0) + (r.durationMinutes ?? 0) }), {});

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader title="About" icon={Building2} />
          <p className="text-sm leading-relaxed text-ink-secondary">{customer.description}</p>
        </Card>

        <Card padded={false}>
          <div className="p-5 pb-0 sm:p-6 sm:pb-0">
            <CardHeader title="Your projects" description="Projects for this customer that are assigned to you" icon={FolderKanban} />
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {projects.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-canvas sm:px-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink">{p.name}</p>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">{p.location}</p>
                  </div>
                  <span className="tabular shrink-0 text-sm font-semibold text-ink">{formatDuration(byProject[p.id] || 0)}</span>
                  <ArrowRight size={16} className="shrink-0 text-ink-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Recent sessions" description="Your attendance for this customer" />
          <SessionList
            records={records}
            subtitle={(r) => projectsById[r.projectId]?.name ?? 'Unknown project'}
            emptyDescription="You have not recorded any time for this customer yet."
          />
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Hours recorded" icon={Timer} />
          <p className="tabular text-3xl font-semibold tracking-tight text-ink">{formatDuration(total)}</p>
          <p className="mt-1 text-sm text-ink-muted">
            Across {finished.length} completed session{finished.length === 1 ? '' : 's'}
            {records.some((r) => r.status === 'active') && ' — plus one shift in progress'}
          </p>
        </Card>

        <Card>
          <CardHeader title="Contact" icon={User} />
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs text-ink-muted">Contact person</dt>
              <dd className="font-medium text-ink">
                {customer.contactPerson ?? 'Not provided'}
                {customer.contactRole && <span className="block font-normal text-ink-muted">{customer.contactRole}</span>}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
                <MapPin size={13} aria-hidden="true" /> Work location
              </dt>
              <dd className="font-medium text-ink">{customer.address ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Phone size={13} aria-hidden="true" /> Phone
              </dt>
              <dd>
                {customer.phone ? (
                  <a href={phoneHref(customer.phone)} className="font-medium text-brand-700 hover:underline">
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-ink-muted">Not provided</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Mail size={13} aria-hidden="true" /> Email
              </dt>
              <dd className="min-w-0">
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="block truncate font-medium text-brand-700 hover:underline">
                    {customer.email}
                  </a>
                ) : (
                  <span className="text-ink-muted">Not provided</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}

export default CustomerDetails;
