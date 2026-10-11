import { createContext, useMemo, useState } from 'react';

export const AppBarContext = createContext(null);

/**
 * Lets the current page tell the phone app bar its title and back target.
 * `titleVisible` is false once the page's large heading has scrolled under
 * the app bar, at which point the bar shows the title (native-app pattern).
 */
export function AppBarProvider({ children }) {
  const [page, setPage] = useState({ title: '', backTo: null, backLabel: '' });
  const [titleVisible, setTitleVisible] = useState(true);

  const value = useMemo(() => ({ page, setPage, titleVisible, setTitleVisible }), [page, titleVisible]);
  return <AppBarContext.Provider value={value}>{children}</AppBarContext.Provider>;
}
