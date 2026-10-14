import type { ComponentPropsWithRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'small';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  readonly variant?: ButtonVariant;
}

/** Wooden plank button from the UI kit. Defaults to `type="button"` so it never submits a form by accident. */
export function Button({ variant = 'primary', className, type = 'button', ...buttonProps }: ButtonProps) {
  const classes = className ? `${variant}-button ${className}` : `${variant}-button`;
  return <button type={type} className={classes} {...buttonProps} />;
}
