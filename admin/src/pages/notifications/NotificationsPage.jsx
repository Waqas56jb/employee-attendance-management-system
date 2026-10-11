import { PageHeader } from '../../components/common/PageHeader';
import { Tabs } from '../../components/common/Tabs';
import { Callout } from '../../components/common/Callout';
import { NotificationList } from '../../components/notifications/NotificationList';
import { ActivityLogTable } from '../../components/notifications/ActivityLogTable';
import { useNotifications } from '../../hooks/useNotifications';
import { useLookups } from '../../hooks/useLookups';
import { useBusiness } from '../../hooks/useBusiness';
import { useQueryState } from '../../hooks/useQueryState';

const DEFAULTS = { tab: 'notifications', q: '', type: '', read: '', aq: '', entity: '', from: '', to: '' };

export default function NotificationsPage() {
  const { notifications, activity, unreadCount, markRead, markAllRead, dismiss } = useNotifications();
  const lookups = useLookups();
  const { business } = useBusiness();
  const [filters, setFilter] = useQueryState(DEFAULTS);
  const tab = filters.tab === 'activity' ? 'activity' : 'notifications';

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Alerts about attendance, invoices and payments, plus the audit trail of every change made by administrators."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Notifications' }]}
      />

      <Tabs
        className="mb-4"
        label="Notification sections"
        value={tab}
        onChange={(next) => setFilter('tab', next === 'notifications' ? '' : next)}
        tabs={[
          { value: 'notifications', label: 'Notifications', count: unreadCount || undefined },
          { value: 'activity', label: 'Activity log', count: activity.length },
        ]}
      />

      <div role="tabpanel" aria-label={tab === 'activity' ? 'Activity log' : 'Notifications'}>
        {tab === 'notifications' ? (
          <NotificationList
            notifications={notifications}
            unreadCount={unreadCount}
            markRead={markRead}
            markAllRead={markAllRead}
            dismiss={dismiss}
            filters={filters}
            setFilter={setFilter}
          />
        ) : (
          <div className="space-y-4">
            <Callout tone="demo" title="Demo audit log">
              In this demo the activity log is kept in your browser and can be reset. In production, audit logs must be written and stored server-side
              (append-only, with server timestamps and the authenticated user), so they cannot be altered from the browser.
            </Callout>
            <ActivityLogTable activity={activity} filters={filters} setFilter={setFilter} lookups={lookups} currency={business.currency} />
          </div>
        )}
      </div>
    </>
  );
}
