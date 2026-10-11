import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Optional browser geolocation. Coordinates are only ever what the browser
 * returns — nothing is estimated or fabricated. A captured position does NOT
 * prove the employee is at the customer site; that needs server-side checks.
 *
 * status: 'idle' | 'requesting' | 'captured' | 'denied' | 'unavailable' | 'error'
 */
export function useGeolocation() {
  const [state, setState] = useState({ status: 'idle', location: null, message: '' });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unavailable', location: null, message: 'This browser does not support location services.' });
      return;
    }
    if (!window.isSecureContext) {
      setState({ status: 'unavailable', location: null, message: 'Location requires a secure (HTTPS) connection.' });
      return;
    }
    setState({ status: 'requesting', location: null, message: '' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mounted.current) return;
        setState({
          status: 'captured',
          message: '',
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
          },
        });
      },
      (error) => {
        if (!mounted.current) return;
        const denied = error.code === error.PERMISSION_DENIED;
        setState({
          status: denied ? 'denied' : 'error',
          location: null,
          message: denied
            ? 'Location permission was denied. You can allow it in your browser settings.'
            : error.code === error.TIMEOUT
              ? 'Getting your location took too long.'
              : 'Your location could not be determined.',
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, []);

  const reset = useCallback(() => setState({ status: 'idle', location: null, message: '' }), []);

  return { ...state, request, reset };
}
