import { cn } from '../../utils/cn';

export function PageContainer({ className, children }) {
  return (
    <div className={cn('pb-tabbar mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 md:pb-12 md:pt-8 lg:px-8', className)}>
      {children}
    </div>
  );
}

export default PageContainer;
