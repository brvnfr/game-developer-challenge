import { useId, useRef, type ReactNode, type Ref } from 'react';
import type { DeveloperToolsSettings } from '@/storage/repositories';
import { Button } from '@/ui/components/Button';
import { Dialog } from '@/ui/components/Dialog';

interface DeveloperToolsDialogProps {
  readonly settings: DeveloperToolsSettings;
  readonly onChange: (settings: DeveloperToolsSettings) => void;
  /** Opens the network scenarios of the mock API; absent when the mocks are off. */
  readonly onOpenNetworkScenarios: (() => void) | null;
  readonly onClose: () => void;
}

/**
 * Testing aids, opened from the gear button in the corner of the main menu: match overlays and the mock API's
 * network scenarios. Choices are saved in this browser and the overlays apply from the next match; all of them
 * are off by default, so players see the game without them.
 */
export function DeveloperToolsDialog({
  settings,
  onChange,
  onOpenNetworkScenarios,
  onClose,
}: DeveloperToolsDialogProps) {
  const firstToggleRef = useRef<HTMLInputElement>(null);
  return (
    <Dialog
      title="Developer tools"
      description="Testing aids for this browser. Overlays apply from the next match."
      initialFocusRef={firstToggleRef}
      onEscape={onClose}
      className="developer-dialog"
    >
      <fieldset className="developer-dialog__group">
        <legend className="field__label">Match overlays</legend>
        <Toggle
          inputRef={firstToggleRef}
          label="Aim lanes"
          hint="Dashed lanes showing where each cannon fires and how far."
          isChecked={settings.showAimLanes}
          onToggle={(showAimLanes) => onChange({ ...settings, showAimLanes })}
        />
        <Toggle
          label="Hitboxes"
          hint="Collision shapes of islands, ships and cannonballs."
          isChecked={settings.showHitboxes}
          onToggle={(showHitboxes) => onChange({ ...settings, showHitboxes })}
        />
      </fieldset>
      <div className="form__actions">
        {onOpenNetworkScenarios && (
          <Button variant="small" onClick={onOpenNetworkScenarios}>
            Network scenarios
          </Button>
        )}
        <Button variant="small" onClick={() => onChange({ showAimLanes: false, showHitboxes: false })}>
          Turn overlays off
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
}

function Toggle({
  label,
  hint,
  isChecked,
  onToggle,
  inputRef,
}: {
  readonly label: string;
  readonly hint: ReactNode;
  readonly isChecked: boolean;
  readonly onToggle: (isChecked: boolean) => void;
  readonly inputRef?: Ref<HTMLInputElement>;
}) {
  const inputId = useId();
  const hintId = useId();
  return (
    <div className="developer-dialog__toggle">
      <input
        ref={inputRef}
        id={inputId}
        type="checkbox"
        checked={isChecked}
        aria-describedby={hintId}
        onChange={(event) => onToggle(event.target.checked)}
      />
      <div>
        <label htmlFor={inputId} className="developer-dialog__toggle-label">
          {label}
        </label>
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      </div>
    </div>
  );
}
