import type { Ship } from './entities/Ship';
import type { EventQueue } from './events/EventQueue';
import type { DestructionCause } from './events/GameEvent';
import type { World } from './World';

/**
 * Applies damage and destruction consistently and emits the matching events.
 * A destroyed ship stops colliding and firing, and its projectiles still in flight are removed
 * (README: destroyed enemies stop dealing damage).
 */
export class DamageResolver {
  constructor(
    private readonly world: World,
    private readonly events: EventQueue,
  ) {}

  /** Returns true when this damage destroyed the ship. */
  applyDamage(target: Ship, amount: number, cause: DestructionCause): boolean {
    const outcome = target.takeDamage(amount);
    if (outcome.applied <= 0) return false;
    this.events.push({
      type: 'shipDamaged',
      shipId: target.id,
      kind: target.kind,
      damage: outcome.applied,
      health: target.health,
      maxHealth: target.maxHealth,
      position: target.position,
    });
    if (outcome.wasDestroyed) this.reportDestruction(target, cause);
    return outcome.wasDestroyed;
  }

  /** Destroys a ship outright (e.g. a Chaser exploding on impact). */
  destroy(ship: Ship, cause: DestructionCause): void {
    if (!ship.isAlive) return;
    ship.destroy();
    this.reportDestruction(ship, cause);
  }

  private reportDestruction(ship: Ship, cause: DestructionCause): void {
    this.events.push({ type: 'shipDestroyed', shipId: ship.id, kind: ship.kind, cause, position: ship.position });
    for (const projectile of this.world.projectiles) {
      if (projectile.isActive && projectile.ownerId === ship.id) {
        projectile.deactivate();
        this.events.push({
          type: 'projectileExpired',
          projectileId: projectile.id,
          reason: 'ownerDestroyed',
          position: projectile.position,
        });
      }
    }
  }
}
