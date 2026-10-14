import { useId, type Ref } from 'react';
import minusIcon from '@assets/png/retina/ui/controls/icon_minus.png';
import plusIcon from '@assets/png/retina/ui/controls/icon_plus.png';
import { describedBy } from './describedBy';
import { FieldMessages } from './FieldMessages';
import { RoundIconButton } from './RoundIconButton';

interface NumberStepperProps {
  readonly label: string;
  /** Raw text of the field, so invalid input can be shown and explained instead of silently replaced. */
  readonly value: string;
  readonly unit: string;
  readonly hint?: string;
  readonly error?: string | undefined;
  readonly canDecrease: boolean;
  readonly canIncrease: boolean;
  readonly onChange: (value: string) => void;
  readonly onStep: (direction: -1 | 1) => void;
  readonly name?: string;
  readonly inputRef?: Ref<HTMLInputElement>;
}

/** − value + control: the buttons step the value, and the value itself can also be typed. */
export function NumberStepper({
  label,
  value,
  unit,
  hint,
  error,
  canDecrease,
  canIncrease,
  onChange,
  onStep,
  name,
  inputRef,
}: NumberStepperProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  return (
    <div className="field stepper">
      <label htmlFor={inputId} className="field__label">
        {label}
      </label>
      <div className="stepper__controls">
        <RoundIconButton
          icon={minusIcon}
          label={`Decrease ${label}`}
          disabled={!canDecrease}
          onClick={() => onStep(-1)}
        />
        <span className="stepper__value">
          <input
            ref={inputRef}
            id={inputId}
            name={name}
            className="stepper__input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            aria-invalid={error !== undefined}
            aria-describedby={describedBy(hintId, hint, errorId, error)}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                onStep(event.key === 'ArrowUp' ? 1 : -1);
              }
            }}
          />
          <span className="stepper__unit" aria-hidden="true">
            {unit}
          </span>
        </span>
        <RoundIconButton
          icon={plusIcon}
          label={`Increase ${label}`}
          disabled={!canIncrease}
          onClick={() => onStep(1)}
        />
      </div>
      <FieldMessages hintId={hintId} hint={hint} errorId={errorId} error={error} />
    </div>
  );
}
