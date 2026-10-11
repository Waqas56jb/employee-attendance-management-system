import { useEffect } from 'react';
import { Breadcrumbs } from './Breadcrumbs';

/**
 * Consistent page title area. Also sets the document title so the browser tab
 * always names the current section.
 */
export function PageHeader({ title, description, breadcrumbs, actions, meta, documentTitle }) {
  useEffect(() => {
    const text = documentTitle ?? (typeof title === 'string' ? title : null);
    if (text) document.title = `${text} · Shiftwise Admin`;
  }, [title, documentTitle]);

  return (
    <header className="mb-6">
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-ink-muted">{description}</p>}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
      </div>
    </header>
  );
}
