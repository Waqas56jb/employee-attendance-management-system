import { Loader2, LocateFixed, MapPin, MapPinOff, RotateCcw } from 'lucide-react';
import { config } from '../../services/config';
import { formatCoordinates } from '../../utils/formatters';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

/**
 * Optional location step for check-in / check-out. Shows exactly what the
 * browser returned and never implies the employee is verified on site.
 */
export function LocationCapture({ geo, className }) {
  const { status, location, message, request, reset } = geo;
  const required = config.requireLocation;

  const tone =
    status === 'captured'
      ? 'border-success/30 bg-success-soft/60'
      : status === 'denied' || status === 'error' || status === 'unavailable'
        ? 'border-warning/30 bg-warning-soft/60'
        : 'border-line bg-canvas';

  return (
    <div className={cn('rounded-xl border p-4', tone, className)}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            status === 'captured' ? 'bg-success/15 text-success-ink' : 'bg-subtle text-ink-secondary',
          )}
        >
          {status === 'requesting' ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : status === 'captured' ? (
            <MapPin size={18} aria-hidden="true" />
          ) : status === 'idle' ? (
            <LocateFixed size={18} aria-hidden="true" />
          ) : (
            <MapPinOff size={18} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-sm font-medium text-ink">
            {status === 'captured' && 'Location captured'}
            {status === 'requesting' && 'Requesting your location…'}
            {status === 'idle' && `Share your location ${required ? '(required)' : '(optional)'}`}
            {['denied', 'error', 'unavailable'].includes(status) && 'Location not captured'}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {status === 'captured' && (
              <>
                {formatCoordinates(location)}
                {location.accuracy ? ` · accuracy ±${Math.round(location.accuracy)} m` : ''}. Stored with this attendance record.
                Browser location alone does not verify you are at the customer site.
              </>
            )}
            {status === 'idle' &&
              (required
                ? 'Your organization requires a location to record attendance.'
                : 'Your browser will ask for permission. You can continue without it.')}
            {status === 'requesting' && 'Approve the request in your browser if prompted.'}
            {['denied', 'error', 'unavailable'].includes(status) &&
              `${message} ${required ? 'A location is required to continue.' : 'You can still continue without a location.'}`}
          </p>
        </div>
        {status === 'idle' && (
          <Button size="sm" variant="secondary" leftIcon={LocateFixed} onClick={request}>
            Share
          </Button>
        )}
        {['denied', 'error', 'unavailable', 'captured'].includes(status) && (
          <Button
            size="sm"
            variant="ghost"
            leftIcon={RotateCcw}
            onClick={status === 'captured' ? reset : request}
            aria-label={status === 'captured' ? 'Remove captured location' : 'Try getting location again'}
          >
            {status === 'captured' ? 'Remove' : 'Retry'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default LocationCapture;
