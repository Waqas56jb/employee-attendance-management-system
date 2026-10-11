import { useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRegisterAppBar } from '../../hooks/useAppBar';
import { cn } from '../../utils/cn';

export function PageHeader({ title, description, actions, backTo, backLabel = 'Back', eyebrow, className, children }) {
  const headingRef = useRef(null);
  useRegisterAppBar({ title, backTo, backLabel }, headingRef);

  return (
    <header className={cn('mb-6 sm:mb-8', className)}>
      {backTo && (
        // On phones the back arrow lives in the app bar instead.
        <Link
          to={backTo}
          className="mb-3 hidden items-center gap-1.5 rounded-md text-sm font-medium text-ink-muted transition-colors hover:text-ink md:inline-flex"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-2">{eyebrow}</div>}
          <h1 ref={headingRef} className="text-2xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted sm:text-[15px]">{description}</p>}
          {children}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export default PageHeader;
