import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        duration: 4000,
        classNames: { toast: 'font-sans text-sm' },
      }}
    />
  );
}
