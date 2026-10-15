import { useRef } from 'react';
import { Button } from '@/ui/components/Button';
import { Dialog } from '@/ui/components/Dialog';
import { ControlsHelp } from '@/ui/ControlsHelp';

/** The control instructions in a dialog, for screens too small to show them beside the menu. */
export function ControlsDialog({ onClose }: { readonly onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog title="Controls" initialFocusRef={closeRef} onEscape={onClose} className="controls-dialog">
      <ControlsHelp withTitle={false} />
      <Button ref={closeRef} variant="small" onClick={onClose}>
        Close
      </Button>
    </Dialog>
  );
}
