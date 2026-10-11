import { useEffect, useState } from 'react';
import { canPromptInstall, isIosSafari, isStandalone, promptInstall, subscribeInstall } from '../utils/pwa';

/**
 * Install state for the "Add to home screen" UI.
 * mode: 'installed' | 'prompt' (one-tap install) | 'ios' (manual steps) | 'unsupported'
 */
export function useInstallApp() {
  const compute = () => {
    if (isStandalone()) return 'installed';
    if (canPromptInstall()) return 'prompt';
    if (isIosSafari()) return 'ios';
    return 'unsupported';
  };
  const [mode, setMode] = useState(compute);

  useEffect(() => {
    const update = () => setMode(compute());
    const unsubscribe = subscribeInstall(update);
    const media = window.matchMedia?.('(display-mode: standalone)');
    media?.addEventListener?.('change', update);
    return () => {
      unsubscribe();
      media?.removeEventListener?.('change', update);
    };
  }, []);

  return { mode, install: promptInstall };
}
