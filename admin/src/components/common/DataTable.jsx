import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Pagination } from './Pagination';

/**
 * Sortable, paginated table with a card layout on small screens.
 *
 * columns: [{
 *   key, header,
 *   render?: (row) => node            (defaults to row[key])
 *   sortValue?: (row) => string|number (enables sorting; defaults to row[key] when sortable)
 *   sortable?: boolean, align?: 'left'|'right'|'center', className?, headerClassName?
 *   mobile?: false                     (hide from the mobile card)
 *   primary?: true                     (shown as the card title on mobile)
 * }]
 *
 * Rows are expected to be filtered already; sorting and pagination happen
 * here and always operate on the filtered set.
 */
export function DataTable({
  columns,
  rows,
  getRowId = (row) => row.id,
  initialSort,
  pageSize = 10,
  onRowClick,
  emptyState,
  caption,
  footer,
  rowClassName,
  mobileCards = true,
  dense = false,
  paginate = true,
  resetKey,
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(1);

  // Back to page 1 whenever the filtered set changes.
  useEffect(() => {
    setPage(1);
  }, [rows.length, resetKey]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return rows;
    const getValue = column.sortValue ?? ((row) => row[column.key]);
    const factor = sort.dir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va === vb) return 0;
      if (va === null || va === undefined || va === '') return 1;
      if (vb === null || vb === undefined || vb === '') return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * factor;
    });
  }, [rows, sort, columns]);

  const pageCount = paginate ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const currentPage = Math.min(page, pageCount);
  const visible = paginate ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sorted;

  const toggleSort = (key) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, dir: 'asc' };
      if (current.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  if (rows.length === 0) return emptyState ?? null;

  const isSortable = (c) => c.sortable ?? Boolean(c.sortValue);
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary && c.mobile !== false);
  const renderCell = (column, row) => (column.render ? column.render(row) : row[column.key] ?? '—');
  const cellPad = dense ? 'py-2' : '';

  return (
    <div>
      <div className={clsx('scrollbar-thin overflow-x-auto', mobileCards && 'hidden md:block')}>
        <table className="table-base">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key;
                const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={clsx(column.align === 'right' && 'text-right', column.align === 'center' && 'text-center', column.headerClassName)}
                  >
                    {isSortable(column) ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={clsx(
                          'inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink',
                          column.align === 'right' && 'flex-row-reverse',
                          active && 'text-ink',
                        )}
                      >
                        {column.header}
                        {active ? (
                          sort.dir === 'asc' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />
                        ) : (
                          <ChevronsUpDown size={12} className="opacity-50" aria-hidden />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? (e) => !e.target.closest('a,button,input,select,label') && onRowClick(row) : undefined}
                className={clsx(onRowClick && 'cursor-pointer', rowClassName?.(row))}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={clsx(cellPad, column.align === 'right' && 'text-right tabular', column.align === 'center' && 'text-center', column.className)}
                  >
                    {renderCell(column, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>

      {mobileCards && (
        <ul className="divide-y divide-line md:hidden">
          {visible.map((row) => (
            <li key={getRowId(row)} className={clsx('px-4 py-3', rowClassName?.(row))}>
              <div
                className={clsx('min-w-0', onRowClick && 'cursor-pointer')}
                onClick={onRowClick ? (e) => !e.target.closest('a,button,input,select,label') && onRowClick(row) : undefined}
              >
                <div className="mb-2 min-w-0 font-medium text-ink">{renderCell(primary, row)}</div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {rest.map((column) => (
                    <div key={column.key} className={clsx('min-w-0', column.key === 'actions' && 'col-span-2')}>
                      {column.key !== 'actions' && <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">{column.header}</dt>}
                      <dd className="mt-0.5 min-w-0 break-words text-ink">{renderCell(column, row)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </li>
          ))}
        </ul>
      )}

      {paginate && sorted.length > pageSize && (
        <Pagination page={currentPage} pageCount={pageCount} total={sorted.length} pageSize={pageSize} onChange={setPage} />
      )}
    </div>
  );
}
