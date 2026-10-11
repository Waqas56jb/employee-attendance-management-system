import clsx from 'clsx';

export function PageContainer({ children, className }) {
  return <div className={clsx('mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8', className)}>{children}</div>;
}
