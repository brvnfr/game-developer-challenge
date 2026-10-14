import { useEffect, useRef } from 'react';
import './pause-overlay.css';

interface PauseOverlayProps {
  readonly reasonText: string;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onMainMenu: () => void;
}

/** Modal pause dialog. Focus starts on Resume and stays inside the dialog (Tab wraps around). */
export function PauseOverlay({ reasonText, onResume, onRestart, onMainMenu }: PauseOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    resumeRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const buttons = [...dialog.querySelectorAll('button')];
      const first = buttons[0];
      const last = buttons.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', keepFocusInside);
    return () => dialog.removeEventListener('keydown', keepFocusInside);
  }, []);

  return (
    <div className="pause-overlay">
      <div
        ref={dialogRef}
        className="panel pause-overlay__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        aria-describedby="pause-reason"
      >
        <h2 id="pause-title" className="panel__title">
          Paused
        </h2>
        <p id="pause-reason" className="pause-overlay__reason">
          {reasonText}
        </p>
        <button ref={resumeRef} type="button" className="primary-button" onClick={onResume}>
          Resume
        </button>
        <button type="button" className="secondary-button" onClick={onRestart}>
          Restart
        </button>
        <button type="button" className="secondary-button" onClick={onMainMenu}>
          Main Menu
        </button>
      </div>
    </div>
  );
}
