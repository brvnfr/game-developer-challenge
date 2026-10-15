import type { ComponentPropsWithRef } from 'react';
import { classNames } from '@/ui/classNames';

export type ButtonVariant = 'primary' | 'secondary' | 'small';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  readonly variant?: ButtonVariant;
}

/** Wooden plank button from the UI kit. Defaults to `type="button"` so it never submits a form by accident. */
export function Button({ variant = 'primary', className, type = 'button', ...buttonProps }: ButtonProps) {
  return <button type={type} className={classNames(`${variant}-button`, className)} {...buttonProps} />;
}
