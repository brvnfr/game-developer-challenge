import type { EnemyKind } from '@/game/config/types';

/** Position (arena pixels) and heading (radians, 0 = east, clockwise) of a ship at the start of a match. */
export interface ShipPlacement {
  readonly x: number;
  readonly y: number;
  readonly heading: number;
}

export interface EnemyPlacement extends ShipPlacement {
  readonly kind: EnemyKind;
}

/**
 * Optional starting layout of a match, used by reproducible test scenarios. It only decides where ships start;
 * every rule (movement, AI, weapons, damage, spawning) runs unchanged afterwards.
 */
export interface MatchSetup {
  readonly player?: ShipPlacement;
  readonly enemies?: readonly EnemyPlacement[];
}
