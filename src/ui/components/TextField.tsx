import { useId, type Ref } from 'react';
import { describedBy } from './describedBy';
import { FieldMessages } from './FieldMessages';

interface TextFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly hint?: string;
  readonly error?: string | undefined;
  readonly maxLength?: number;
  readonly name?: string;
  readonly inputRef?: Ref<HTMLInputElement>;
}

/** Labelled text input with an optional hint and an accessible error message. */
export function TextField({ label, value, onChange, hint, error, maxLength, name, inputRef }: TextFieldProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  return (
    <div className="field">
      <label htmlFor={inputId} className="field__label">
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        className="field__input"
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={value}
        maxLength={maxLength}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy(hintId, hint, errorId, error)}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldMessages hintId={hintId} hint={hint} errorId={errorId} error={error} />
    </div>
  );
}
