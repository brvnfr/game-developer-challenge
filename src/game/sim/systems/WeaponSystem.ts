import type { Vector2 } from '@/game/core/math/Vector2';
import { Projectile } from '../entities/Projectile';
import type { Ship } from '../entities/Ship';
import { isBroadside, type Weapon } from '../entities/Weapon';
import type { SimulationContext } from '../SimulationContext';
import type { SimulationSystem } from './SimulationSystem';

/** Broadside projectiles leave from this fraction of the hull half-width, on the firing side. */
const BROADSIDE_MUZZLE_OFFSET = 0.8;
/** Gap between the bow and a front projectile when it spawns (px). */
const BOW_MUZZLE_GAP = 2;

/** Ticks weapon cooldowns in simulation time and fires the weapons whose trigger is held. */
export class WeaponSystem implements SimulationSystem {
  update(context: SimulationContext): void {
    for (const ship of context.world.ships) {
      if (!ship.isAlive) continue;
      for (const weapon of ship.weapons) {
        weapon.tick(context.stepSeconds);
        if (weapon.shouldFire) this.fire(ship, weapon, context);
      }
    }
  }

  /**
   * Fires one shot and starts the cooldown.
   * - front / cannon: one projectile from the bow along the heading
   * - left / right: parallel projectiles perpendicular to the hull, spaced along it
   * Projectiles add the configured share of the ship's velocity, so they keep its momentum.
   */
  fire(ship: Ship, weapon: Weapon, context: SimulationContext): Projectile[] {
    const forward = ship.forward;
    const muzzles =
      (weapon.slot === 'left' || weapon.slot === 'right') && isBroadside(weapon.stats)
        ? this.broadsideMuzzles(ship, weapon.slot, weapon.stats.projectileCount, weapon.stats.projectileSpacing)
        : [{ origin: ship.position.add(forward.scale(ship.boundingRadius + BOW_MUZZLE_GAP)), direction: forward }];

    const projectiles = muzzles.map(({ origin, direction }) =>
      context.world.addProjectile(
        new Projectile({
          id: context.world.createEntityId(),
          ownerId: ship.id,
          faction: ship.faction,
          weaponSlot: weapon.slot,
          position: origin,
          velocity: direction
            .scale(weapon.stats.projectileSpeed)
            .add(ship.velocity.scale(weapon.stats.velocityInheritance)),
          damage: weapon.stats.damage,
          radius: weapon.stats.projectileRadius,
          range: weapon.stats.range,
        }),
      ),
    );
    weapon.startCooldown();
    context.events.push({
      type: 'weaponFired',
      shipId: ship.id,
      weaponSlot: weapon.slot,
      projectileIds: projectiles.map((projectile) => projectile.id),
      position: ship.position,
      heading: projectiles[0]?.heading ?? ship.heading,
    });
    return projectiles;
  }

  private broadsideMuzzles(
    ship: Ship,
    side: 'left' | 'right',
    count: number,
    spacing: number,
  ): { origin: Vector2; direction: Vector2 }[] {
    const forward = ship.forward;
    const left = forward.leftPerpendicular();
    const direction = side === 'left' ? left : left.scale(-1);
    const sideOrigin = ship.position.add(direction.scale(ship.hullRadius * BROADSIDE_MUZZLE_OFFSET));
    return Array.from({ length: count }, (_, index) => ({
      origin: sideOrigin.add(forward.scale((index - (count - 1) / 2) * spacing)),
      direction,
    }));
  }
}
