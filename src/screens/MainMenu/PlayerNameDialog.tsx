import { useRef, useState, type FormEvent } from 'react';
import { PLAYER_NAME_MAX_LENGTH } from '@/profile/playerName';
import { Button } from '@/ui/components/Button';
import { Dialog } from '@/ui/components/Dialog';
import { TextField } from '@/ui/components/TextField';

interface PlayerNameDialogProps {
  readonly suggestedName: string;
  /** Saves the name; returns an error message when it is not valid. */
  readonly onConfirm: (name: string) => string | undefined;
  readonly onCancel: () => void;
}

/** Asked on the first Play: the captain name identifies the player in the ranking (editable later in Options). */
export function PlayerNameDialog({ suggestedName, onConfirm, onCancel }: PlayerNameDialogProps) {
  const [name, setName] = useState(suggestedName);
  const [error, setError] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = onConfirm(name);
    setError(validationError);
    if (validationError !== undefined) inputRef.current?.focus();
  };

  return (
    <Dialog
      title="Name your captain"
      description="Your name appears in the ranking. You can change it later in Options."
      initialFocusRef={inputRef}
      onEscape={onCancel}
    >
      <form className="form" noValidate onSubmit={handleSubmit}>
        <TextField
          inputRef={inputRef}
          name="captainName"
          label="Captain name"
          value={name}
          maxLength={PLAYER_NAME_MAX_LENGTH + 10}
          error={error}
          onChange={(value) => {
            setName(value);
            setError(undefined);
          }}
        />
        <div className="form__actions">
          <Button type="submit">Set sail</Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
