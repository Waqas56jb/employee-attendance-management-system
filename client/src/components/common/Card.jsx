import { cn } from '../../utils/cn';

export function Card({ as: Component = 'section', className, children, padded = true, ...props }) {
  return (
    <Component className={cn('card', padded && 'p-5 sm:p-6', className)} {...props}>
      {children}
    </Component>
  );
}

export function CardHeader({ title, description, action, icon: Icon, className, titleAs: Title = 'h2', id }) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-ink-secondary">
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <Title id={id} className="text-[15px] font-semibold leading-6 text-ink">
            {title}
          </Title>
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default Card;
