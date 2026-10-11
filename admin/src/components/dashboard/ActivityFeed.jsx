import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ScrollText } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';
import { EmptyState } from '../common/EmptyState';
import { entityPath } from '../../services/notificationService';
import { formatDateTime } from '../../utils/dateUtils';

/** Latest administrator actions from the activity log. */
export function ActivityFeed({ activity, limit = 8 }) {
  const items = activity.slice(0, limit);
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={ScrollText}
        title="Recent activity"
        description="Changes made by administrators"
        action={
          <Button variant="ghost" size="xs" to="/notifications?tab=activity">
            Activity log
          </Button>
        }
      />
      {items.length === 0 ? (
        <EmptyState compact icon={ScrollText} title="No activity yet" description="Changes to records will be logged here." />
      ) : (
        <ol className="divide-y divide-line">
          {items.map((entry) => {
            const path = entityPath(entry.entityType, entry.entityId);
            const body = (
              <>
                <Avatar name={entry.actorName} size="xs" className="mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink">{entry.summary}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {entry.actorName} ·{' '}
                    <time dateTime={entry.createdAt} title={formatDateTime(entry.createdAt)}>
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </time>
                  </span>
                </span>
              </>
            );
            return (
              <li key={entry.id}>
                {path ? (
                  <Link to={path} className="flex items-start gap-3 px-5 py-2.5 hover:bg-subtle/60">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-5 py-2.5">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
