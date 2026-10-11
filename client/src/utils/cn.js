import clsx from 'clsx';

/** Joins conditional class names. Thin wrapper so components import one helper. */
export function cn(...inputs) {
  return clsx(inputs);
}
