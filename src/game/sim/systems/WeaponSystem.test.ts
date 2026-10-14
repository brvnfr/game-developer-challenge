import { describe, expect, it } from 'vitest';
import { Vector2 } from '@/game/core/math/Vector2';
import type { Ship } from '../entities/Ship';
import type { Weapon } from '../entities/Weapon';
import type { WeaponSlot } from '../entities/types';
import { createTestContext, eventsOfType, stepsFor } from '../testing/fixtures';
import { WeaponSystem } from './WeaponSystem';

const weapons = new WeaponSystem();

function weaponOf(ship: Ship, slot: WeaponSlot): Weapon {
  const weapon = ship.weapon(slot);
  if (!weapon) throw new Error(`Ship has no ${slot} weapon`);
  return weapon;
}

const firedSlots = (context: ReturnType<typeof createTestContext>) =>
  eventsOfType(context.events.drain(), 'weaponFired').map((event) => event.weaponSlot);

describe('WeaponSystem', () => {
  it('fires one front projectile from the bow along the heading', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(400, 300), Math.PI / 2);
    weaponOf(ship, 'front').isTriggerHeld = true;
    weapons.update(context);
    expect(context.world.projectiles).toHaveLength(1);
    const [projectile] = context.world.projectiles;
    expect(projectile?.position.y).toBeGreaterThan(300 + ship.boundingRadius);
    expect(projectile?.velocity.normalized().y).toBeCloseTo(1);
    expect(projectile?.faction).toBe('player');
  });

  it.each([
    ['left', -1],
    ['right', 1],
  ] as const)('fires the %s broadside as three parallel projectiles to that side', (slot, expectedDirectionY) => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(400, 300), 0);
    weaponOf(ship, slot).isTriggerHeld = true;
    weapons.update(context);
    const projectiles = context.world.projectiles;
    expect(projectiles).toHaveLength(3);
    for (const projectile of projectiles) {
      expect(projectile.velocity.normalized().x).toBeCloseTo(0);
      expect(projectile.velocity.normalized().y).toBeCloseTo(expectedDirectionY);
      expect(Math.sign(projectile.position.y - 300)).toBe(expectedDirectionY);
    }
    const xPositions = projectiles.map((projectile) => projectile.position.x).sort((first, second) => first - second);
    const spacing = context.config.player.broadside.projectileSpacing;
    expect((xPositions[1] ?? 0) - (xPositions[0] ?? 0)).toBeCloseTo(spacing);
    expect((xPositions[2] ?? 0) - (xPositions[1] ?? 0)).toBeCloseTo(spacing);
    expect(new Set(projectiles.map((projectile) => projectile.position.y.toFixed(6))).size).toBe(1);
  });

  it('respects the cooldown while the trigger is held', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(400, 300), 0);
    weaponOf(ship, 'front').isTriggerHeld = true;
    let shots = 0;
    for (let step = 0; step < stepsFor(1); step++) {
      weapons.update(context);
      shots += firedSlots(context).length;
    }
    expect(shots).toBe(Math.floor(1 / context.config.player.frontCannon.cooldownSeconds) + 1);
  });

  it('keeps an independent cooldown per weapon', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(400, 300), 0);
    for (const weapon of ship.weapons) weapon.isTriggerHeld = true;
    weapons.update(context);
    expect(firedSlots(context)).toEqual(['front', 'left', 'right']);
    for (let step = 0; step < stepsFor(0.5); step++) weapons.update(context);
    expect(firedSlots(context)).toEqual(['front']);
  });

  it('never fires from a destroyed ship', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(400, 300), 0);
    ship.destroy();
    for (const weapon of ship.weapons) weapon.isTriggerHeld = true;
    weapons.update(context);
    expect(context.world.projectiles).toHaveLength(0);
  });
});
