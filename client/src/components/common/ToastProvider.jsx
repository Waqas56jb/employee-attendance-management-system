import { Toaster } from 'sonner';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePreferences } from '../../hooks/usePreferences';

/** App-wide toast host (Sonner), themed to match the current color scheme. */
export function ToastProvider() {
  const { preferences } = usePreferences();
  const phone = useMediaQuery('(max-width: 767px)');
  return (
    <Toaster
      position={phone ? 'top-center' : 'top-right'}
      theme={preferences.theme}
      richColors
      closeButton
      duration={4500}
      offset={phone ? 'calc(env(safe-area-inset-top) + 64px)' : 16}
      toastOptions={{
        className: 'font-sans',
        style: { borderRadius: '12px' },
      }}
    />
  );
}

export default ToastProvider;
