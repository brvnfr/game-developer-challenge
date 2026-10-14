import type { Vector2 } from '@/game/core/math/Vector2';
import type { Ship } from '../entities/Ship';
import type { SimulationContext } from '../SimulationContext';
import type { SimulationSystem } from './SimulationSystem';

/** Share of the sliding speed kept per step while scraping along a coast or the arena edge. */
const SCRAPE_SPEED_RETENTION = 0.97;

/** Moves `value` towards `target` by at most `maxDelta`. */
function approach(value: number, target: number, maxDelta: number): number {
  return value < target ? Math.min(target, value + maxDelta) : Math.max(target, value - maxDelta);
}

/**
 * Integrates the motion of living ships, then keeps the whole hull out of islands and inside the arena.
 * - Rotation has inertia: the turn rate eases towards `turnInput × turnSpeed` at `turnAcceleration`.
 * - Thrust only pushes forward (no reverse). Momentum is kept in world space, so after a turn part of it is
 *   sideways drift, which fades at `lateralGrip`; without throttle the ship glides to a stop (`deceleration`).
 * - Against an obstacle the ship keeps the part of its motion that slides along it instead of stopping dead.
 */
export class MovementSystem implements SimulationSystem {
  update(context: SimulationContext): void {
    for (const ship of context.world.ships) {
      ship.rememberPreviousState();
      if (ship.isAlive) this.move(ship, context);
    }
  }

  private move(ship: Ship, context: SimulationContext): void {
    const { stepSeconds } = context;
    const startHeading = ship.heading;
    ship.angularVelocity = approach(
      ship.angularVelocity,
      ship.turnInput * ship.turnSpeed,
      ship.turnAcceleration * stepSeconds,
    );
    ship.heading += ship.angularVelocity * stepSeconds;

    const forward = ship.forward;
    const left = forward.leftPerpendicular();
    const targetSpeed = ship.throttle * ship.maxSpeed;
    const forwardSpeed = ship.velocity.dot(forward);
    const newForwardSpeed = approach(
      forwardSpeed,
      targetSpeed,
      (forwardSpeed < targetSpeed ? ship.acceleration : ship.deceleration) * stepSeconds,
    );
    const newDriftSpeed = ship.velocity.dot(left) * Math.exp(-ship.lateralGrip * stepSeconds);
    ship.velocity = forward.scale(newForwardSpeed).add(left.scale(newDriftSpeed));

    const start = ship.position;
    const hasTouchedObstacle = context.hullPlacement.place(ship, start.add(ship.velocity.scale(stepSeconds)));
    if (!hasTouchedObstacle) return;
    if (context.hullPlacement.isBlocked(ship)) this.undoBlockedMove(ship, start, startHeading, context);
    ship.velocity = ship.position.subtract(start).scale(SCRAPE_SPEED_RETENTION / stepSeconds);
  }

  /**
   * Rare case where the resolution passes cannot free the hull (a bow swinging into a coast while wedged in a
   * corner): keep the last valid pose, without the rotation if the rotation itself is what collides.
   */
  private undoBlockedMove(ship: Ship, start: Vector2, startHeading: number, context: SimulationContext): void {
    ship.position = start;
    if (!context.hullPlacement.isBlocked(ship)) return;
    ship.heading = startHeading;
    ship.angularVelocity = 0;
  }
}
