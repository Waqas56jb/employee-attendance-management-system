import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:bg-brand-600/60',
  secondary: 'border border-line-strong bg-surface text-ink shadow-sm hover:bg-subtle disabled:text-ink-muted',
  ghost: 'text-ink-secondary hover:bg-subtle hover:text-ink disabled:text-ink-muted',
  danger: 'bg-danger text-white shadow-sm hover:bg-danger-ink disabled:bg-danger/60',
  'danger-ghost': 'text-danger-ink hover:bg-danger-soft disabled:text-ink-muted',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
};

const SIZES = {
  xs: 'h-7 gap-1 rounded-md px-2 text-xs',
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-sm',
  md: 'h-10 gap-2 rounded-lg px-4 text-sm',
  lg: 'h-11 gap-2 rounded-lg px-5 text-[15px]',
  icon: 'h-9 w-9 justify-center rounded-lg',
  'icon-sm': 'h-8 w-8 justify-center rounded-lg',
};

/**
 * Button / link-button. Pass `to` to render a router Link.
 * `loading` disables the button and shows a spinner.
 */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading = false, disabled, to, className, children, type = 'button', ...props },
  ref,
) {
  const classes = clsx(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-150 disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
  const iconSize = size === 'xs' ? 14 : 16;
  const content = (
    <>
      {loading ? <Loader2 size={iconSize} className="animate-spin" aria-hidden /> : Icon ? <Icon size={iconSize} aria-hidden /> : null}
      {children}
      {IconRight && !loading ? <IconRight size={iconSize} aria-hidden /> : null}
    </>
  );

  if (to && !disabled) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
});
