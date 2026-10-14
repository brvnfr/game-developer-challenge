import type { ComponentPropsWithRef } from 'react';

interface RoundIconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Image URL of the icon (decorative: the accessible name comes from `label`). */
  readonly icon: string;
  readonly label: string;
}

/** Round brass button with an icon, used for steppers, pause and touch controls. */
export function RoundIconButton({ icon, label, className, ...buttonProps }: RoundIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={className ? `round-button ${className}` : 'round-button'}
      {...buttonProps}
    >
      <img src={icon} alt="" />
    </button>
  );
}
