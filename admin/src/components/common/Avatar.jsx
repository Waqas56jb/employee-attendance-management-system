import clsx from 'clsx';
import { initials } from '../../utils/formatters';

const PALETTE = [
  'bg-brand-100 text-brand-700',
  'bg-success-soft text-success-ink',
  'bg-info-soft text-info-ink',
  'bg-warning-soft text-warning-ink',
  'bg-danger-soft text-danger-ink',
  'bg-neutral-soft text-neutral-ink',
];

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

function hash(value = '') {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, src, size = 'sm', className, square = false }) {
  const shape = square ? 'rounded-lg' : 'rounded-full';
  if (src) {
    return <img src={src} alt="" className={clsx(SIZES[size], shape, 'shrink-0 object-cover', className)} />;
  }
  return (
    <span
      aria-hidden
      className={clsx(
        'inline-flex shrink-0 items-center justify-center font-semibold',
        SIZES[size],
        shape,
        PALETTE[hash(name) % PALETTE.length],
        className,
      )}
    >
      {initials(name) || '?'}
    </span>
  );
}

/** Overlapping avatars with "+N" overflow. */
export function AvatarGroup({ names = [], max = 3, size = 'xs' }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  if (names.length === 0) return <span className="text-ink-muted">—</span>;
  return (
    <span className="flex items-center" title={names.join(', ')}>
      <span className="sr-only">{names.join(', ')}</span>
      {shown.map((name) => (
        <Avatar key={name} name={name} size={size} className="-ml-1 ring-2 ring-surface first:ml-0" />
      ))}
      {rest > 0 && (
        <span className="-ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-subtle px-1 text-[10px] font-semibold text-ink-secondary ring-2 ring-surface">
          +{rest}
        </span>
      )}
    </span>
  );
}
