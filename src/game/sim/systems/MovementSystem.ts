import type { Ship } from '../entities/Ship';
import type { SimulationContext } from '../SimulationContext';
import type { SimulationSystem } from './SimulationSystem';

/** Speed kept after scraping along a coast or the arena edge, per step of contact. */
const SCRAPE_SPEED_RETENTION = 0.85;

/**
 * Integrates rotation and forward motion of living ships, then resolves contact with islands and
 * arena bounds (ships slide along them). Ships only move forward, as required for the player.
 */
export class MovementSystem implements SimulationSystem {
  update(context: SimulationContext): void {
    for (const ship of context.world.ships) {
      ship.rememberPreviousState();
      if (ship.isAlive) this.move(ship, context);
    }
  }

  private move(ship: Ship, context: SimulationContext): void {
    const { stepSeconds, arena } = context;
    ship.heading += ship.turnInput * ship.turnSpeed * stepSeconds;

    const targetSpeed = ship.throttle * ship.maxSpeed;
    ship.speed =
      ship.speed < targetSpeed
        ? Math.min(targetSpeed, ship.speed + ship.acceleration * stepSeconds)
        : Math.max(targetSpeed, ship.speed - ship.deceleration * stepSeconds);

    const resolution = arena.resolveCircle(
      ship.position.add(ship.forward.scale(ship.speed * stepSeconds)),
      ship.radius,
    );
    ship.position = resolution.position;
    if (resolution.touchedIsland || resolution.touchedBounds) ship.speed *= SCRAPE_SPEED_RETENTION;
  }
}
