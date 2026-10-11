import { cn } from '../../utils/cn';
import { getInitials } from '../../utils/formatters';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

export function Avatar({ name, src, size = 'md', className }) {
  if (src) {
    return <img src={src} alt={name ? `${name}'s profile photo` : ''} className={cn('shrink-0 rounded-full object-cover', SIZES[size], className)} />;
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ring-2 ring-surface',
        SIZES[size],
        className,
      )}
      aria-hidden={name ? undefined : true}
      role={name ? 'img' : undefined}
      aria-label={name || undefined}
    >
      {getInitials(name)}
    </span>
  );
}

export default Avatar;
