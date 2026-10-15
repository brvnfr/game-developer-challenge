/** Limits `value` to the range [minimum, maximum]. */
export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/** Moves `value` towards `target` by at most `maxDelta`, never past it. */
export function approach(value: number, target: number, maxDelta: number): number {
  return value < target ? Math.min(target, value + maxDelta) : Math.max(target, value - maxDelta);
}
