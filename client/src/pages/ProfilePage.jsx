import { BadgeCheck, Briefcase, Building, CalendarDays, Hash, Lock, Mail, ShieldCheck, User, Warehouse } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Card, CardHeader } from '../components/common/Card';
import { PageHeader } from '../components/common/PageHeader';
import { Tooltip } from '../components/common/Tooltip';
import { PageContainer } from '../components/layout/PageContainer';
import { ProfileForm } from '../components/profile/ProfileForm';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFormatters } from '../hooks/useFormatters';

function ReadOnlyField({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-ink-muted">{label}</dt>
        <dd className="break-words text-sm font-medium text-ink">{value || '—'}</dd>
      </div>
    </div>
  );
}

export function ProfilePage() {
  useDocumentTitle('My Profile');
  const { employee } = useAuth();
  const fmt = useFormatters();

  if (!employee) return null;

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader title="My Profile" description="Your personal and employment information." />

      <Card className="mb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={employee.fullName} src={employee.avatar} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">{employee.fullName}</h2>
              <Badge tone={employee.status === 'active' ? 'success' : 'neutral'} dot>
                {employee.status === 'active' ? 'Active account' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-sm text-ink-secondary">
              {employee.jobTitle}
              {employee.department && ` · ${employee.department}`}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Shown as <span className="font-medium text-ink-secondary">{employee.displayName || employee.fullName}</span>
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ProfileForm />
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Employment details"
              description="Managed by your administrator"
              action={
                <Tooltip content="Read-only — managed by your administrator" align="end">
                  <span tabIndex={0} className="flex h-8 w-8 items-center justify-center rounded-lg bg-subtle text-ink-muted" aria-label="Read-only">
                    <Lock size={15} aria-hidden="true" />
                  </span>
                </Tooltip>
              }
            />
            <dl className="space-y-4">
              <ReadOnlyField icon={User} label="Full name" value={employee.fullName} />
              <ReadOnlyField icon={Hash} label="Employee ID" value={employee.employeeNumber} />
              <ReadOnlyField icon={Mail} label="Work email" value={employee.email} />
              <ReadOnlyField icon={Briefcase} label="Job title" value={employee.jobTitle} />
              <ReadOnlyField icon={Building} label="Department" value={employee.department} />
              <ReadOnlyField icon={ShieldCheck} label="Account role" value={employee.role === 'employee' ? 'Employee' : employee.role} />
              <ReadOnlyField icon={BadgeCheck} label="Account status" value={employee.status === 'active' ? 'Active' : 'Inactive'} />
              <ReadOnlyField icon={CalendarDays} label="Employment start date" value={fmt.date(employee.employmentStartDate)} />
              <ReadOnlyField icon={User} label="Supervisor" value={employee.supervisor} />
              <ReadOnlyField icon={Warehouse} label="Home base" value={employee.homeBase} />
            </dl>
            <p className="mt-5 border-t border-line pt-4 text-xs text-ink-muted">
              To correct any of these details, contact your supervisor or HR administrator.
            </p>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

export default ProfilePage;
