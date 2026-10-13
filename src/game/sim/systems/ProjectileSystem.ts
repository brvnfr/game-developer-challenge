import { segmentCircleEntry } from '@/game/core/math/geometry';
import type { Vector2 } from '@/game/core/math/Vector2';
import type { Projectile } from '../entities/Projectile';
import type { Ship } from '../entities/Ship';
import type { SimulationContext } from '../SimulationContext';
import type { SimulationSystem } from './SimulationSystem';

interface ShipHit {
  readonly ship: Ship;
  readonly fraction: number;
}

/**
 * Moves projectiles with a swept test (segment from the current to the next position), so fast
 * projectiles never tunnel through ships or islands. The earliest contact wins:
 * - an enemy ship takes the damage exactly once and the projectile is removed
 * - an island stops the projectile
 * - otherwise it travels, and is removed when its range runs out or it leaves the arena
 */
export class ProjectileSystem implements SimulationSystem {
  update(context: SimulationContext): void {
    for (const projectile of context.world.projectiles) {
      if (projectile.isActive) this.advance(projectile, context);
    }
  }

  private advance(projectile: Projectile, context: SimulationContext): void {
    const { arena, events, damage } = context;
    const start = projectile.position;
    const end = start.add(projectile.velocity.scale(context.stepSeconds));
    const shipHit = this.findFirstShipHit(projectile, end, context);
    const islandEntry = arena.findIslandEntry(start, end);

    if (shipHit && (islandEntry === null || shipHit.fraction <= islandEntry)) {
      projectile.stopAt(start.lerp(end, shipHit.fraction));
      events.push({
        type: 'projectileHit',
        projectileId: projectile.id,
        targetId: shipHit.ship.id,
        damage: projectile.damage,
        position: projectile.position,
      });
      damage.applyDamage(
        shipHit.ship,
        projectile.damage,
        projectile.faction === 'player' ? 'playerProjectile' : 'enemyProjectile',
      );
      return;
    }
    if (islandEntry !== null) {
      projectile.stopAt(start.lerp(end, islandEntry));
      events.push({
        type: 'projectileExpired',
        projectileId: projectile.id,
        reason: 'hitIsland',
        position: projectile.position,
      });
      return;
    }

    projectile.travelTo(end);
    if (!arena.contains(projectile.position)) {
      projectile.deactivate();
      events.push({
        type: 'projectileExpired',
        projectileId: projectile.id,
        reason: 'leftArena',
        position: projectile.position,
      });
    } else if (projectile.remainingRange <= 0) {
      projectile.deactivate();
      events.push({
        type: 'projectileExpired',
        projectileId: projectile.id,
        reason: 'rangeExhausted',
        position: projectile.position,
      });
    }
  }

  private findFirstShipHit(projectile: Projectile, end: Vector2, context: SimulationContext): ShipHit | null {
    let firstHit: ShipHit | null = null;
    for (const ship of context.world.ships) {
      if (!ship.isAlive || ship.faction === projectile.faction) continue;
      const fraction = segmentCircleEntry(projectile.position, end, ship.position, ship.radius + projectile.radius);
      if (fraction !== null && (firstHit === null || fraction < firstHit.fraction)) firstHit = { ship, fraction };
    }
    return firstHit;
  }
}
