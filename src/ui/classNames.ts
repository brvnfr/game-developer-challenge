/** Joins the class names that apply, skipping `false`, `null`, `undefined` and empty strings. */
export function classNames(...names: readonly (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}
