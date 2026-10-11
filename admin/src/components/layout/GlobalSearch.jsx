import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Briefcase, Building2, Receipt, Search, User } from 'lucide-react';
import { useEmployees } from '../../hooks/useEmployees';
import { useCustomers } from '../../hooks/useCustomers';
import { useProjects } from '../../hooks/useProjects';
import { useInvoices } from '../../hooks/useInvoices';
import { useClickOutside } from '../../hooks/useClickOutside';
import { invoiceLabel } from '../../services/invoiceService';

/** Quick jump to any employee, customer, project or invoice (press "/" to focus). */
export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { employees } = useEmployees();
  const { customers, customersById } = useCustomers();
  const { projects } = useProjects();
  const { invoices } = useInvoices();
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const match = (...values) => values.some((v) => v && String(v).toLowerCase().includes(q));
    return [
      ...employees.filter((e) => match(e.fullName, e.employeeNumber, e.email)).slice(0, 4).map((e) => ({ id: e.id, icon: User, label: e.fullName, meta: `Employee · ${e.employeeNumber}`, to: `/employees/${e.id}` })),
      ...customers.filter((c) => match(c.companyName, c.customerNumber, c.contactPerson)).slice(0, 4).map((c) => ({ id: c.id, icon: Building2, label: c.companyName, meta: `Customer · ${c.customerNumber}`, to: `/customers/${c.id}` })),
      ...projects.filter((p) => match(p.name, p.projectNumber)).slice(0, 4).map((p) => ({ id: p.id, icon: Briefcase, label: p.name, meta: `Project · ${customersById[p.customerId]?.companyName ?? ''}`, to: `/projects/${p.id}` })),
      ...invoices.filter((i) => match(i.invoiceNumber, customersById[i.customerId]?.companyName)).slice(0, 4).map((i) => ({ id: i.id, icon: Receipt, label: invoiceLabel(i), meta: `Invoice · ${customersById[i.customerId]?.companyName ?? ''}`, to: `/invoices/${i.id}` })),
    ];
  }, [query, employees, customers, projects, invoices, customersById]);

  const go = (item) => {
    navigate(item.to);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active] ?? results[0]);
    }
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="global-search-results"
        aria-label="Search employees, customers, projects and invoices"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search people, customers, invoices…"
        className="input h-9 bg-subtle/70 py-1.5 pl-9 pr-10 hover:bg-surface focus:bg-surface [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 font-mono text-2xs text-ink-muted sm:block">/</kbd>
      {open && query.trim().length >= 2 && (
        <ul id="global-search-results" role="listbox" className="absolute left-0 right-0 top-11 z-40 max-h-96 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-overlay">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-muted">No matches for “{query}”</li>}
          {results.map((item, index) => (
            <li key={`${item.to}`} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => go(item)}
                className={clsx('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left', index === active && 'bg-subtle')}
              >
                <item.icon size={16} className="shrink-0 text-ink-muted" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{item.label}</span>
                  <span className="block truncate text-xs text-ink-muted">{item.meta}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
