import { Toaster } from 'sonner';
import { usePreferences } from '../../hooks/usePreferences';

/** App-wide toast host (Sonner), themed to match the current color scheme. */
export function ToastProvider() {
  const { preferences } = usePreferences();
  return (
    <Toaster
      position="top-right"
      theme={preferences.theme}
      richColors
      closeButton
      duration={4500}
      offset={16}
      toastOptions={{
        className: 'font-sans',
        style: { borderRadius: '12px' },
      }}
    />
  );
}

export default ToastProvider;
