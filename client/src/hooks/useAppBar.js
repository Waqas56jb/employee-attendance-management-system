import { useContext, useEffect } from 'react';
import { AppBarContext } from '../context/AppBarContext';

/** Read the app bar state (returns null outside the workspace layout). */
export function useAppBar() {
  return useContext(AppBarContext);
}

/**
 * Registers the page title/back link with the phone app bar and tracks
 * whether the page heading (`headingRef`) is still visible below the bar.
 */
export function useRegisterAppBar({ title, backTo, backLabel }, headingRef) {
  const ctx = useContext(AppBarContext);
  const setPage = ctx?.setPage;
  const setTitleVisible = ctx?.setTitleVisible;
  const plainTitle = typeof title === 'string' ? title : '';

  useEffect(() => {
    if (!setPage) return undefined;
    setPage({ title: plainTitle, backTo: backTo ?? null, backLabel: backLabel ?? '' });
    return () => setPage({ title: '', backTo: null, backLabel: '' });
  }, [setPage, plainTitle, backTo, backLabel]);

  useEffect(() => {
    if (!setTitleVisible || !headingRef.current || !('IntersectionObserver' in window)) return undefined;
    setTitleVisible(true);
    // 56px = phone app bar height (plus the notch inset, approximated by the margin).
    const observer = new IntersectionObserver(([entry]) => setTitleVisible(entry.isIntersecting), {
      rootMargin: '-64px 0px 0px 0px',
      threshold: 0,
    });
    observer.observe(headingRef.current);
    return () => {
      observer.disconnect();
      setTitleVisible(true);
    };
  }, [setTitleVisible, headingRef, plainTitle]);
}
