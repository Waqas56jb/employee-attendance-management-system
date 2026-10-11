import { createContext, useCallback, useEffect, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../utils/storage';

export const DEFAULT_PREFERENCES = {
  theme: 'light', // 'light' | 'dark' | 'system'
  clockFormat: '12h', // '12h' | '24h'
  dateFormat: 'medium', // see DATE_FORMATS in utils/formatters
  weekStartsOn: 1, // 1 = Monday, 0 = Sunday
  notifications: {
    shifts: true,
    assignments: true,
    reminders: true,
    announcements: true,
  },
};

export const PreferencesContext = createContext(null);

function applyTheme(theme) {
  const dark =
    theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  // Colors the phone status bar / browser chrome to match the app bar.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111521' : '#FFFFFF');
}

/** Device-level display preferences, persisted in LocalStorage. */
export function PreferencesProvider({ children }) {
  const [stored, setStored] = useLocalStorage(STORAGE_KEYS.preferences, DEFAULT_PREFERENCES);

  const preferences = useMemo(
    () => ({
      ...DEFAULT_PREFERENCES,
      ...stored,
      notifications: { ...DEFAULT_PREFERENCES.notifications, ...stored?.notifications },
    }),
    [stored],
  );

  useEffect(() => {
    applyTheme(preferences.theme);
    if (preferences.theme !== 'system' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preferences.theme]);

  const updatePreferences = useCallback(
    (changes) => setStored((prev) => ({ ...DEFAULT_PREFERENCES, ...prev, ...changes })),
    [setStored],
  );

  const resetPreferences = useCallback(() => setStored(DEFAULT_PREFERENCES), [setStored]);

  const value = useMemo(
    () => ({ preferences, updatePreferences, resetPreferences }),
    [preferences, updatePreferences, resetPreferences],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
