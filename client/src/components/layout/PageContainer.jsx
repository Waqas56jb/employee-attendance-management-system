import { cn } from '../../utils/cn';

export function PageContainer({ className, children }) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12', className)}>
      {children}
    </div>
  );
}

export default PageContainer;
