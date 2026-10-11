import { PROJECT_STATUS } from '../../services/projectService';
import { Badge } from '../common/Badge';

export function ProjectStatusBadge({ status, className }) {
  const meta = PROJECT_STATUS[status] ?? { label: status, tone: 'neutral' };
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
}

export default ProjectStatusBadge;
