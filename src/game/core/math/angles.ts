const FULL_TURN = Math.PI * 2;

/** Wraps an angle to the range (-PI, PI]. */
export function wrapAngle(angle: number): number {
  let wrapped = angle % FULL_TURN;
  if (wrapped <= -Math.PI) wrapped += FULL_TURN;
  else if (wrapped > Math.PI) wrapped -= FULL_TURN;
  return wrapped;
}

/** Smallest signed rotation from `fromAngle` to `toAngle`, in (-PI, PI]. */
export function angleDifference(fromAngle: number, toAngle: number): number {
  return wrapAngle(toAngle - fromAngle);
}
