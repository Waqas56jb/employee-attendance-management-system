import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CalendarDays, Mail, MapPin, Phone, User } from 'lucide-react';
import { useFormatters } from '../../hooks/useFormatters';
import { formatDuration, phoneHref } from '../../utils/formatters';
import { ProjectStatusBadge } from './ProjectStatusBadge';

function Row({ icon: Icon, children }) {
  return (
    <p className="flex min-w-0 items-start gap-2 text-sm text-ink-secondary">
      <Icon size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function ProjectCard({ project, recordedMinutes = 0 }) {
  const fmt = useFormatters();
  const scheduledHours = project.assignment?.scheduledHours;
  const pct = scheduledHours ? Math.min(100, Math.round((recordedMinutes / (scheduledHours * 60)) * 100)) : null;
  const contact = project.contact;

  return (
    <article className="card flex flex-col transition-shadow duration-150 hover:shadow-raised">
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold leading-snug text-ink">
              <Link to={`/projects/${project.id}`} className="hover:text-brand-700">
                {project.name}
              </Link>
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
              <Building2 size={14} aria-hidden="true" />
              <Link to={`/customers/${project.customerId}`} className="truncate hover:text-brand-700 hover:underline">
                {project.customerName}
              </Link>
            </p>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-ink-secondary">{project.description}</p>

        <div className="mt-4 space-y-2">
          <Row icon={MapPin}>{project.location}</Row>
          <Row icon={CalendarDays}>
            Assigned {fmt.date(project.assignment?.assignedAt)}
            {project.assignment?.role && <span className="text-ink-muted"> · {project.assignment.role}</span>}
          </Row>
          {contact && (
            <Row icon={User}>
              {contact.name}
              {contact.role && <span className="text-ink-muted"> · {contact.role}</span>}
              <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {contact.phone && (
                  <a href={phoneHref(contact.phone)} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                    <Phone size={13} aria-hidden="true" />
                    {contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="inline-flex min-w-0 items-center gap-1 text-brand-700 hover:underline">
                    <Mail size={13} aria-hidden="true" />
                    <span className="truncate">{contact.email}</span>
                  </a>
                )}
              </span>
            </Row>
          )}
        </div>
      </div>

      <div className="border-t border-line px-5 py-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-muted">Recorded hours</p>
            <p className="tabular text-sm font-semibold text-ink">
              {formatDuration(recordedMinutes)}
              {scheduledHours ? <span className="font-normal text-ink-muted"> of {scheduledHours}h scheduled</span> : null}
            </p>
            {pct !== null && (
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Share of scheduled hours recorded"
              >
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
          <Link
            to={`/projects/${project.id}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
            aria-label={`View details for ${project.name}`}
          >
            View details <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ProjectCard;
