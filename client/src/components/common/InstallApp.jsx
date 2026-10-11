import { useState } from 'react';
import { CheckCircle2, Download, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { toast } from 'sonner';
import { useInstallApp } from '../../hooks/useInstallApp';
import { readJSON, writeJSON } from '../../utils/storage';
import { Button } from './Button';
import { LogoMark } from './AppLogo';

const DISMISS_KEY = 'install-card-dismissed';

function IosSteps() {
  return (
    <ol className="mt-2 space-y-1.5 text-sm text-ink-secondary">
      <li className="flex items-center gap-2">
        <span className="tabular text-xs font-semibold text-ink-muted">1.</span> Tap
        <Share size={16} className="text-brand-700" aria-label="Share" /> in Safari&apos;s toolbar
      </li>
      <li className="flex items-center gap-2">
        <span className="tabular text-xs font-semibold text-ink-muted">2.</span> Choose
        <span className="inline-flex items-center gap-1 font-medium text-ink">
          <PlusSquare size={15} aria-hidden="true" /> Add to Home Screen
        </span>
      </li>
    </ol>
  );
}

async function runInstall(install) {
  const outcome = await install();
  if (outcome === 'accepted') toast.success('ShiftLine is being added to your home screen');
}

/** Phone dashboard card inviting the employee to install the app (dismissible). */
export function InstallAppCard() {
  const { mode, install } = useInstallApp();
  const [dismissed, setDismissed] = useState(() => readJSON(DISMISS_KEY, false));

  if (dismissed || (mode !== 'prompt' && mode !== 'ios')) return null;

  const dismiss = () => {
    writeJSON(DISMISS_KEY, true);
    setDismissed(true);
  };

  return (
    <section className="card relative mb-5 flex gap-3 p-4 md:hidden" aria-label="Install the app">
      <LogoMark size={44} className="rounded-xl" />
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-[15px] font-semibold text-ink">Install ShiftLine</p>
        <p className="text-sm text-ink-muted">Open it from your home screen like a regular app — full screen, one tap to check in.</p>
        {mode === 'prompt' ? (
          <Button size="sm" leftIcon={Download} className="mt-3" onClick={() => runInstall(install)}>
            Install app
          </Button>
        ) : (
          <IosSteps />
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-subtle"
        aria-label="Dismiss install suggestion"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </section>
  );
}

/** Settings section describing the install state on this device. */
export function InstallAppSettings() {
  const { mode, install } = useInstallApp();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 text-sm text-ink-secondary">
        {mode === 'installed' && (
          <p className="flex items-center gap-2 font-medium text-success-ink">
            <CheckCircle2 size={16} aria-hidden="true" /> You are using the installed app.
          </p>
        )}
        {mode === 'prompt' && <p>Add ShiftLine to your home screen or desktop to open it in its own window, like a native app.</p>}
        {mode === 'ios' && (
          <>
            <p>On iPhone and iPad, install from Safari:</p>
            <IosSteps />
          </>
        )}
        {mode === 'unsupported' && (
          <p>
            To install on your phone, open this site in <strong>Chrome</strong> (Android) or <strong>Safari</strong> (iPhone) and choose
            “Install app” / “Add to Home Screen”.
          </p>
        )}
      </div>
      {mode === 'prompt' && (
        <Button leftIcon={Smartphone} onClick={() => runInstall(install)} className="shrink-0">
          Install app
        </Button>
      )}
    </div>
  );
}
