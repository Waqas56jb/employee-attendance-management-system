import clsx from 'clsx';

export function Card({ as: Tag = 'section', className, children, ...props }) {
  return (
    <Tag className={clsx('card', className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, action, icon: Icon, className }) {
  return (
    <div className={clsx('flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Icon size={16} aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={clsx('px-5 py-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return <div className={clsx('flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3', className)}>{children}</div>;
}
