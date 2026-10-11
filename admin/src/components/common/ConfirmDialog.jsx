import { useEffect, useId, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { FormField, Textarea } from './FormField';

/**
 * Confirmation for destructive or irreversible actions.
 * With `requireReason`, the administrator must explain the action (min 5
 * characters); the reason is passed to `onConfirm(reason)` for the audit log.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Explain why this change is needed…',
  children,
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const formId = useId();

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
      setPending(false);
    }
  }, [open]);

  const submit = async (event) => {
    event.preventDefault();
    if (requireReason && reason.trim().length < 5) {
      setError('Describe the reason in at least 5 characters.');
      return;
    }
    setPending(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch {
      // The caller shows the error toast; keep the dialog open to retry.
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!pending}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} type="submit" form={formId} loading={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4">
        <div className="flex gap-3">
          <span
            className={
              tone === 'danger'
                ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger-ink'
                : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning-ink'
            }
          >
            <AlertTriangle size={18} aria-hidden />
          </span>
          <div className="text-sm text-ink-secondary">{message}</div>
        </div>
        {children}
        {requireReason && (
          <FormField label={reasonLabel} required error={error}>
            <Textarea
              data-autofocus
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={reasonPlaceholder}
              rows={3}
              maxLength={500}
            />
          </FormField>
        )}
      </form>
    </Modal>
  );
}
