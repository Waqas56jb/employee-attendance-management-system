import { useEffect, useState } from 'react';

const TOKENS = ['brand-600', 'brand-200', 'line', 'ink-muted', 'ink', 'surface', 'success'];

function read() {
  const styles = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    TOKENS.map((t) => [t, `rgb(${styles.getPropertyValue(`--${t}`).trim().split(/\s+/).join(', ')})`]),
  );
}

/**
 * Resolved token colors for SVG charts (Recharts sets colors as attributes,
 * so CSS variables are resolved here and refreshed when the theme changes).
 */
export function useThemeColors() {
  const [colors, setColors] = useState(read);

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return colors;
}
