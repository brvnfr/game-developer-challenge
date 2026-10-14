/** Hint and error lines under a form field, referenced by the field's `aria-describedby`. */
export function FieldMessages({
  hintId,
  hint,
  errorId,
  error,
}: {
  readonly hintId: string;
  readonly hint: string | undefined;
  readonly errorId: string;
  readonly error: string | undefined;
}) {
  return (
    <>
      {hint !== undefined && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </>
  );
}
