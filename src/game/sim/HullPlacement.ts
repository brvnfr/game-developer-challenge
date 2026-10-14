import type { Vector2 } from '@/game/core/math/Vector2';
import type { Arena } from './arena/Arena';
import type { Ship } from './entities/Ship';

const RESOLUTION_PASSES = 4;

/**
 * Places a ship's hull at a target position without letting any hull circle (stern, midship, bow)
 * enter an island or cross the arena edge. Used for movement and for separating colliding ships.
 */
export class HullPlacement {
  constructor(private readonly arena: Arena) {}

  /** Moves the ship as close to `target` as possible; returns true when an obstacle stopped it. */
  place(ship: Ship, target: Vector2): boolean {
    let position = target;
    let hasTouchedObstacle = false;
    for (let pass = 0; pass < RESOLUTION_PASSES; pass++) {
      let moved = false;
      for (const circleCenter of ship.hullCircleCenters(position)) {
        const resolution = this.arena.resolveCircle(circleCenter, ship.hullRadius);
        if (!resolution.touchedIsland && !resolution.touchedBounds) continue;
        position = position.add(resolution.position.subtract(circleCenter));
        moved = true;
        hasTouchedObstacle = true;
      }
      if (!moved) break;
    }
    ship.position = position;
    return hasTouchedObstacle;
  }

  /** True when any hull circle overlaps land or crosses the arena edge. */
  isBlocked(ship: Ship, tolerance = 0): boolean {
    return ship.hullCircleCenters().some((center) => this.arena.isCircleBlocked(center, ship.hullRadius - tolerance));
  }
}
