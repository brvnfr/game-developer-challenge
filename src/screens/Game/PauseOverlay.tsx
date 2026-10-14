import { useRef } from 'react';
import { Button } from '@/ui/components/Button';
import { Dialog } from '@/ui/components/Dialog';
import './pause-overlay.css';

interface PauseOverlayProps {
  readonly reasonText: string;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onMainMenu: () => void;
}

/**
 * Modal pause dialog. Focus starts on Resume and stays inside the dialog. Escape and P are handled by the
 * game's keyboard source (toggle pause), so the dialog does not add its own Escape handler.
 */
export function PauseOverlay({ reasonText, onResume, onRestart, onMainMenu }: PauseOverlayProps) {
  const resumeRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog title="Paused" description={reasonText} initialFocusRef={resumeRef} className="pause-overlay__dialog">
      <Button ref={resumeRef} onClick={onResume}>
        Resume
      </Button>
      <Button variant="secondary" onClick={onRestart}>
        Restart
      </Button>
      <Button variant="secondary" onClick={onMainMenu}>
        Main Menu
      </Button>
    </Dialog>
  );
}
