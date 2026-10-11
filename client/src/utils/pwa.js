/**
 * Install-to-home-screen support. Chrome/Edge/Android fire
 * `beforeinstallprompt` early (often before React mounts), so the event is
 * captured here at import time and handed to subscribers later.
 */

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // show our own install UI instead of the mini-infobar
    deferredPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export function subscribeInstall(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const canPromptInstall = () => Boolean(deferredPrompt);

/** Shows the browser's install dialog. Resolves to 'accepted' | 'dismissed' | 'unavailable'. */
export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  const event = deferredPrompt;
  deferredPrompt = null;
  notify();
  event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}

/** Running as an installed app (home-screen / standalone window)? */
export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

/** iPhone/iPad Safari, where installing is manual (Share → Add to Home Screen). */
export function isIosSafari() {
  const ua = window.navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

/** Short vibration on supported phones (Android) to confirm an action. */
export function haptic(pattern = 18) {
  try {
    window.navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}
