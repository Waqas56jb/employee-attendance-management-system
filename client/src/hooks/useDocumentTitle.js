import { useEffect } from 'react';
import { config } from '../services/config';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${config.appName}` : `${config.appName} · Employee Portal`;
  }, [title]);
}
