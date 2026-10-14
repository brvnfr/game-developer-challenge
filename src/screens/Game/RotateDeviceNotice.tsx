import { useRef } from 'react';
import { Button } from '@/ui/components/Button';
import { Dialog } from '@/ui/components/Dialog';

/** Shown on touch devices held in portrait: the arena is played in landscape and the match stays paused. */
export function RotateDeviceNotice({ onMainMenu }: { readonly onMainMenu: () => void }) {
  const mainMenuRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      title="Rotate your device"
      description="Pirate Battle is played in landscape. Turn your device sideways; the match is paused meanwhile."
      initialFocusRef={mainMenuRef}
      className="rotate-device"
    >
      <span className="rotate-device__icon" aria-hidden="true">
        ⟳
      </span>
      <Button ref={mainMenuRef} variant="secondary" onClick={onMainMenu}>
        Main Menu
      </Button>
    </Dialog>
  );
}
