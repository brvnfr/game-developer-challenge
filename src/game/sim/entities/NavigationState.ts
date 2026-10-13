import type { Vector2 } from '@/game/core/math/Vector2';

/** Per-enemy memory used by the steering logic to avoid oscillating and to escape when stuck. */
export class NavigationState {
  secondsSinceProgressCheck = 0;
  escapeSecondsRemaining = 0;
  escapeTurnDirection: 1 | -1;

  constructor(
    /** Side (+1 right / -1 left) preferred when going around an obstacle; kept to avoid oscillation. */
    public preferredAvoidanceSide: 1 | -1,
    public lastProgressPosition: Vector2,
  ) {
    this.escapeTurnDirection = preferredAvoidanceSide;
  }

  get isEscaping(): boolean {
    return this.escapeSecondsRemaining > 0;
  }

  markProgress(position: Vector2): void {
    this.lastProgressPosition = position;
    this.secondsSinceProgressCheck = 0;
  }

  startEscape(durationSeconds: number, turnDirection: 1 | -1): void {
    this.escapeSecondsRemaining = durationSeconds;
    this.escapeTurnDirection = turnDirection;
  }
}
