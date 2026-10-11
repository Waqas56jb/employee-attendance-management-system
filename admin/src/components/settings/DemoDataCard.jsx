import { useState } from 'react';
import { Database, RotateCcw } from 'lucide-react';
import { useBusiness } from '../../hooks/useBusiness';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { formatDateTime } from '../../utils/dateUtils';
import { Card, CardBody, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';

/** Danger zone: restore the original sample dataset kept in LocalStorage. */
export function DemoDataCard() {
  const { resetDemoData, seededAt } = useBusiness();
  const [run] = useAsyncAction();
  const [open, setOpen] = useState(false);

  const confirm = () => run(() => resetDemoData(), { success: 'Demo data was reset to its initial state.', rethrow: true });

  return (
    <Card className="border-danger/30">
      <CardHeader
        icon={Database}
        title="Demo data"
        description="This demo stores all data — employees, attendance, invoices, payments and settings — in this browser's LocalStorage. Nothing is sent to a server."
      />
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-ink-secondary">
          <p className="font-medium text-ink">Reset demo data</p>
          <p className="mt-0.5 text-ink-muted">
            Discards every change made in this browser and restores the original sample dataset.
            {seededAt && <> Current dataset created {formatDateTime(seededAt)}.</>}
          </p>
        </div>
        <Button variant="danger" icon={RotateCcw} onClick={() => setOpen(true)}>
          Reset demo data
        </Button>
      </CardBody>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        title="Reset demo data?"
        confirmLabel="Reset demo data"
        message={
          <>
            All changes made in this browser — new employees, corrections, invoices, payments and settings — will be discarded and the original sample
            dataset restored. This cannot be undone.
          </>
        }
      />
    </Card>
  );
}
