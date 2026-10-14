/** Space-separated ids for `aria-describedby`, skipping the messages that are not shown. */
export function describedBy(hintId: string, hint: string | undefined, errorId: string, error: string | undefined) {
  const ids = [hint !== undefined ? hintId : null, error !== undefined ? errorId : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}
