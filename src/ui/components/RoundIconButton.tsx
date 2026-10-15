import type { ComponentPropsWithRef } from 'react';
import { classNames } from '@/ui/classNames';

interface RoundIconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Image URL of the icon (decorative: the accessible name comes from `label`). */
  readonly icon: string;
  readonly label: string;
}

/** Round brass button with an icon, used for steppers, pause and touch controls. */
export function RoundIconButton({ icon, label, className, ...buttonProps }: RoundIconButtonProps) {
  return (
    <button type="button" aria-label={label} className={classNames('round-button', className)} {...buttonProps}>
      <img src={icon} alt="" />
    </button>
  );
}
