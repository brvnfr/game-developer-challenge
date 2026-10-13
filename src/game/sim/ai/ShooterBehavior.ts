import type { ShooterShipConfig } from '@/game/config/types';
import { angleDifference } from '@/game/core/math/angles';
import type { Ship } from '../entities/Ship';
import type { SimulationContext } from '../SimulationContext';
import type { EnemyBehavior } from './EnemyBehavior';
import { turnInputFor, type SteeringNavigator } from './SteeringNavigator';

/** Throttle used to close the gap while already in range but farther than the preferred distance. */
const CLOSING_THROTTLE = 0.6;

/**
 * Shooter: approaches until the player is within attack range with a clear line of sight, then holds
 * around its preferred range, turns to face the player and fires only when aimed.
 */
export class ShooterBehavior implements EnemyBehavior {
  constructor(
    private readonly navigator: SteeringNavigator,
    private readonly stats: ShooterShipConfig,
  ) {}

  decide(enemy: Ship, player: Ship, context: SimulationContext): void {
    const cannon = enemy.weapon('cannon');
    const distance = enemy.position.distanceTo(player.position);
    const canEngage =
      distance <= this.stats.attackRange && context.arena.hasLineOfSight(enemy.position, player.position);

    if (!canEngage) {
      if (cannon) cannon.isTriggerHeld = false;
      this.navigator.steerTowards(enemy, player.position, context);
      return;
    }

    const aimError = angleDifference(enemy.heading, enemy.position.angleTo(player.position));
    enemy.setControls(
      distance > this.stats.preferredRange ? CLOSING_THROTTLE : 0,
      turnInputFor(enemy, aimError, context.stepSeconds),
    );
    if (cannon) cannon.isTriggerHeld = Math.abs(aimError) <= this.stats.aimTolerance;
    enemy.navigation?.markProgress(enemy.position);
  }
}
