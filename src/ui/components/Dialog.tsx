import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { useFocusTrap } from './useFocusTrap';

interface DialogProps {
  readonly title: string;
  readonly description?: ReactNode;
  /** Element that receives focus when the dialog opens (its main action). */
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
  /** Escape closes the dialog when provided. */
  readonly onEscape?: () => void;
  readonly className?: string;
  readonly children: ReactNode;
}

/** Modal dialog on a dimmed backdrop. Focus moves inside, stays there and returns to the opener on close. */
export function Dialog({ title, description, initialFocusRef, onEscape, className, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useFocusTrap(dialogRef, { initialFocusRef, onEscape });

  return (
    <div className="dialog-backdrop">
      <div
        ref={dialogRef}
        className={className ? `panel dialog ${className}` : 'panel dialog'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description === undefined ? undefined : descriptionId}
        tabIndex={-1}
      >
        <h2 id={titleId} className="panel__title">
          {title}
        </h2>
        {description !== undefined && (
          <p id={descriptionId} className="dialog__description">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
