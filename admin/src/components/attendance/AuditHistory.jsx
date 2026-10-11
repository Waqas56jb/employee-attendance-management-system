import { Link } from 'react-router-dom';
import { ArrowRight, Ban, CheckCheck, Flag, History, LogOut, PencilLine, PlusCircle, RotateCcw, Smartphone, Wallet } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../common/Card';
import { Callout } from '../common/Callout';
import { getStatusMeta } from '../common/StatusBadge';
import { useLookups } from '../../hooks/useLookups';
import { formatDateTime } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';
import { invoiceLabel } from '../../services/invoiceService';

const TYPE_META = {
  correction: { label: 'Correction', icon: PencilLine, tone: 'bg-brand-50 text-brand-700' },
  admin_checkout: { label: 'Shift closed by administrator', icon: LogOut, tone: 'bg-warning-soft text-warning-ink' },
  approval: { label: 'Approved', icon: CheckCheck, tone: 'bg-success-soft text-success-ink' },
  flagged: { label: 'Flagged for review', icon: Flag, tone: 'bg-warning-soft text-warning-ink' },
  cancellation: { label: 'Cancelled', icon: Ban, tone: 'bg-neutral-soft text-neutral-ink' },
  restore: { label: 'Restored', icon: RotateCcw, tone: 'bg-info-soft text-info-ink' },
  manual_entry: { label: 'Manual entry created', icon: PlusCircle, tone: 'bg-brand-50 text-brand-700' },
  billing: { label: 'Billing adjustment', icon: Wallet, tone: 'bg-info-soft text-info-ink' },
  released: { label: 'Released from void invoice', icon: RotateCcw, tone: 'bg-neutral-soft text-neutral-ink' },
  created: { label: 'Recorded', icon: Smartphone, tone: 'bg-subtle text-ink-secondary' },
};

const FIELD_LABELS = {
  checkInAt: 'Check-in',
  checkOutAt: 'Check-out',
  recordedDurationMinutes: 'Recorded duration',
  billableDurationMinutes: 'Billable duration',
  customerId: 'Customer',
  projectId: 'Project',
  status: 'Status',
  checkInNote: 'Check-in note',
  checkOutNote: 'Check-out note',
};

function formatValue(field, value, { customersById, projectsById }) {
  if (value === null || value === undefined || value === '') {
    if (field === 'checkOutAt') return 'Open';
    if (field === 'billableDurationMinutes') return 'Same as recorded';
    return '—';
  }
  switch (field) {
    case 'checkInAt':
    case 'checkOutAt':
      return formatDateTime(value);
    case 'recordedDurationMinutes':
    case 'billableDurationMinutes':
      return formatDuration(value);
    case 'customerId':
      return customersById[value]?.companyName ?? value;
    case 'projectId':
      return projectsById[value]?.name ?? value;
    case 'status':
      return getStatusMeta('attendance', value).label;
    default:
      return String(value);
  }
}

function diff(previous, next) {
  if (!next) return [];
  const keys = Object.keys(FIELD_LABELS).filter((k) => k in next || (previous && k in previous));
  return keys.filter((k) => JSON.stringify(previous?.[k] ?? null) !== JSON.stringify(next?.[k] ?? null));
}

function DiffList({ entry, lookups }) {
  const fields = diff(entry.previous, entry.next);
  if (entry.type === 'manual_entry' || fields.length === 0) return null;
  return (
    <dl className="mt-2 space-y-1 rounded-md border border-line bg-subtle/50 px-3 py-2 text-xs">
      {fields.map((field) => (
        <div key={field} className="grid grid-cols-1 gap-x-3 sm:grid-cols-[8rem_1fr]">
          <dt className="font-medium text-ink-muted">{FIELD_LABELS[field]}</dt>
          <dd className="flex min-w-0 flex-wrap items-center gap-1.5 text-ink">
            <span className="text-ink-muted line-through">{formatValue(field, entry.previous?.[field], lookups)}</span>
            <ArrowRight size={12} className="shrink-0 text-ink-muted" aria-label="changed to" />
            <span className="font-medium">{formatValue(field, entry.next?.[field], lookups)}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Full audit trail of an attendance record: corrections, approvals, billing changes. */
export function AuditHistory({ record }) {
  const lookups = useLookups();
  const { invoicesById } = lookups;

  const events = [
    ...(record.source !== 'admin'
      ? [{ id: 'created', type: 'created', at: record.createdAt ?? record.checkInAt, by: 'Employee app', reason: 'Check-in recorded by the employee.' }]
      : []),
    ...(record.correctionHistory ?? []).map((entry) => ({ ...entry, kind: 'history' })),
    ...(record.billingAdjustments ?? []).map((adj) => ({
      id: adj.id,
      type: 'billing',
      at: adj.at,
      by: adj.by,
      reason: adj.reason,
      billing: adj,
    })),
    ...(record.billingHistory ?? []).map((h, i) => ({ id: `bh_${i}`, type: h.action === 'released' ? 'released' : 'billing', at: h.at, by: h.by ?? 'Administrator', reason: h.reason, invoiceId: h.invoiceId })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));

  return (
    <Card>
      <CardHeader icon={History} title="Audit history" description="Every change with timestamp, administrator, reason and the values before and after." />
      <CardBody className="space-y-4">
        <ol className="relative space-y-5 border-l border-line pl-6">
          {events.map((event) => {
            const meta = TYPE_META[event.type] ?? { label: event.type, icon: History, tone: 'bg-subtle text-ink-secondary' };
            const Icon = meta.icon;
            return (
              <li key={event.id} className="relative">
                <span className={`absolute -left-[37px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-surface ${meta.tone}`} aria-hidden>
                  <Icon size={13} />
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-sm font-medium text-ink">{meta.label}</p>
                  <time dateTime={event.at} className="text-xs text-ink-muted">
                    {formatDateTime(event.at)}
                  </time>
                </div>
                <p className="text-xs text-ink-muted">by {event.by ?? 'Unknown'}</p>
                {event.reason && <p className="mt-1 text-sm text-ink-secondary">&ldquo;{event.reason}&rdquo;</p>}
                {event.kind === 'history' && <DiffList entry={event} lookups={lookups} />}
                {event.billing && (
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 rounded-md border border-line bg-subtle/50 px-3 py-2 text-xs">
                    <span className="font-medium text-ink-muted">{event.billing.field === 'billingExclusion' ? 'Billing exclusion' : 'Billable duration'}</span>
                    <span className="text-ink-muted line-through">
                      {event.billing.field === 'billingExclusion' ? event.billing.previous || 'None' : formatDuration(event.billing.previous)}
                    </span>
                    <ArrowRight size={12} className="text-ink-muted" aria-label="changed to" />
                    <span className="font-medium text-ink">
                      {event.billing.field === 'billingExclusion' ? (event.billing.next ? event.billing.next : 'Included in billing') : formatDuration(event.billing.next)}
                    </span>
                  </p>
                )}
                {event.invoiceId && invoicesById[event.invoiceId] && (
                  <p className="mt-1 text-xs">
                    Invoice{' '}
                    <Link to={`/invoices/${event.invoiceId}`} className="font-medium text-brand-700 hover:underline">
                      {invoiceLabel(invoicesById[event.invoiceId])}
                    </Link>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        {record.billingExclusion && (
          <p className="text-xs text-ink-muted">
            Currently excluded from billing since {formatDateTime(record.billingExclusion.at)} by {record.billingExclusion.by}: {record.billingExclusion.reason}
          </p>
        )}
        <Callout tone="demo">
          In this demo, audit entries are stored locally in your browser together with the data. In production, audit logs are written and protected on the server and cannot
          be edited or deleted from the admin panel.
        </Callout>
      </CardBody>
    </Card>
  );
}
