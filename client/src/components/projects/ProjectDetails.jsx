import { Link } from 'react-router-dom';
import { Building2, CalendarDays, ClipboardList, Clock, Mail, MapPin, Phone, Play, Square, Timer, User } from 'lucide-react';
import { useAttendance } from '../../hooks/useAttendance';
import { useAssignments } from '../../hooks/useAssignments';
import { useFormatters } from '../../hooks/useFormatters';
import { useShiftDialogs } from '../../hooks/useShiftDialogs';
import { isFinished } from '../../utils/dateUtils';
import { formatDuration, phoneHref } from '../../utils/formatters';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { Card, CardHeader } from '../common/Card';
import { SessionList } from '../attendance/SessionList';

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-ink-muted">{label}</dt>
        <dd className="text-sm font-medium text-ink">{children}</dd>
      </div>
    </div>
  );
}

function ShiftAction({ project }) {
  const { activeShift } = useAttendance();
  const { projectsById } = useAssignments();
  const { openCheckIn, openCheckOut } = useShiftDialogs();
  const fmt = useFormatters();

  if (activeShift?.projectId === project.id) {
    return (
      <div className="space-y-3">
        <Alert tone="success" title="You are checked in here">
          Since {fmt.time(activeShift.checkInAt)}. Check out when you finish.
        </Alert>
        <Button variant="danger" leftIcon={Square} fullWidth onClick={openCheckOut}>
          Check Out
        </Button>
      </div>
    );
  }
  if (activeShift) {
    return (
      <div className="space-y-3">
        <Alert tone="warning" title="Another shift is active">
          You are checked in to {projectsById[activeShift.projectId]?.name ?? 'another project'}. Check out of that shift before
          checking in here.
        </Alert>
        <Button variant="secondary" leftIcon={Square} fullWidth onClick={openCheckOut}>
          Check out of current shift
        </Button>
      </div>
    );
  }
  if (project.status !== 'active') {
    return (
      <Alert tone="neutral">
        Check-in is only available while a project is active. This project is currently{' '}
        <strong>{project.status === 'on-hold' ? 'on hold' : project.status}</strong>.
      </Alert>
    );
  }
  return (
    <Button size="lg" leftIcon={Play} fullWidth onClick={() => openCheckIn(project.id)}>
      Check in to this project
    </Button>
  );
}

export function ProjectDetails({ project, customer, records }) {
  const fmt = useFormatters();
  const finished = records.filter(isFinished);
  const recorded = finished.reduce((sum, r) => sum + (r.durationMinutes ?? 0), 0);
  const scheduled = project.assignment?.scheduledHours;
  const pct = scheduled ? Math.min(100, Math.round((recorded / (scheduled * 60)) * 100)) : null;
  const contact = project.contact;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader title="About this project" icon={ClipboardList} />
          <p className="text-sm leading-relaxed text-ink-secondary">{project.description}</p>
          <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <InfoRow icon={MapPin} label="Work address">
              {project.location}
            </InfoRow>
            <InfoRow icon={CalendarDays} label="Project dates">
              {fmt.date(project.startDate)} – {fmt.date(project.endDate)}
            </InfoRow>
            <InfoRow icon={User} label="Your role">
              {project.assignment?.role ?? 'Team member'}
            </InfoRow>
            <InfoRow icon={Clock} label="Assigned on">
              {fmt.date(project.assignment?.assignedAt)}
            </InfoRow>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Site instructions" description="Read before starting work on site" />
          {project.instructions.length ? (
            <ol className="space-y-3">
              {project.instructions.map((text, i) => (
                <li key={text} className="flex gap-3 text-sm text-ink-secondary">
                  <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-muted">No special instructions for this project.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Your sessions" description="Attendance you recorded on this project" />
          <SessionList records={records} emptyDescription="You have not recorded any time on this project yet." />
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Attendance" icon={Timer} />
          <ShiftAction project={project} />
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5">
            <div>
              <dt className="text-xs text-ink-muted">Recorded</dt>
              <dd className="tabular text-lg font-semibold text-ink">{formatDuration(recorded)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Sessions</dt>
              <dd className="tabular text-lg font-semibold text-ink">{finished.length}</dd>
            </div>
          </dl>
          {pct !== null && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-ink-muted">
                <span>Scheduled: {scheduled}h</span>
                <span className="tabular">{pct}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-subtle"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Share of scheduled hours recorded"
              >
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Customer" icon={Building2} />
          <p className="text-sm font-semibold text-ink">{customer?.companyName ?? project.customerName}</p>
          {customer?.address && <p className="mt-1 text-sm text-ink-muted">{customer.address}</p>}
          <Link to={`/customers/${project.customerId}`} className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
            View customer
          </Link>
        </Card>

        {contact && (
          <Card>
            <CardHeader title="On-site contact" icon={User} />
            <p className="text-sm font-semibold text-ink">{contact.name}</p>
            {contact.role && <p className="text-sm text-ink-muted">{contact.role}</p>}
            <div className="mt-3 space-y-2">
              {contact.phone ? (
                <a href={phoneHref(contact.phone)} className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
                  <Phone size={15} aria-hidden="true" /> {contact.phone}
                </a>
              ) : (
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                  <Phone size={15} aria-hidden="true" /> No phone provided
                </p>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex min-w-0 items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
                  <Mail size={15} aria-hidden="true" /> <span className="truncate">{contact.email}</span>
                </a>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ProjectDetails;
