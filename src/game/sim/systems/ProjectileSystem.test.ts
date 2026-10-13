import { describe, expect, it } from 'vitest';
import { Vector2 } from '@/game/core/math/Vector2';
import { createTestContext, eventsOfType, ISLAND_SEA, stepsFor } from '../testing/fixtures';
import type { ArenaDefinition } from '../arena/ArenaDefinition';
import { Projectile } from '../entities/Projectile';
import { ProjectileSystem } from './ProjectileSystem';
import { WeaponSystem } from './WeaponSystem';

const projectiles = new ProjectileSystem();
const weapons = new WeaponSystem();

function setUp(arena?: ArenaDefinition) {
  const context = createTestContext(arena);
  const player = context.ships.createPlayer(new Vector2(200, 200), 0);
  const frontCannon = player.weapon('front');
  if (!frontCannon) throw new Error('Player has no front cannon');
  const fireFront = () => weapons.fire(player, frontCannon, context);
  const simulate = (seconds: number) => {
    for (let step = 0; step < stepsFor(seconds); step++) projectiles.update(context);
  };
  return { context, player, fireFront, simulate };
}

describe('ProjectileSystem', () => {
  it('expires a projectile once its range is travelled', () => {
    const { context, fireFront, simulate } = setUp();
    fireFront();
    const { range, projectileSpeed } = context.config.player.frontCannon;
    simulate(range / projectileSpeed - 0.05);
    expect(context.world.projectiles[0]?.isActive).toBe(true);
    simulate(0.1);
    expect(context.world.projectiles[0]?.isActive).toBe(false);
    expect(eventsOfType(context.events.drain(), 'projectileExpired').map((event) => event.reason)).toEqual([
      'rangeExhausted',
    ]);
  });

  it('removes a projectile that leaves the arena', () => {
    const { context, player, fireFront, simulate } = setUp();
    player.position = new Vector2(20, 200);
    player.heading = Math.PI;
    fireFront();
    simulate(0.5);
    expect(eventsOfType(context.events.drain(), 'projectileExpired').map((event) => event.reason)).toEqual([
      'leftArena',
    ]);
  });

  it('stops a projectile at the island coast', () => {
    const { context, player, fireFront, simulate } = setUp(ISLAND_SEA);
    player.position = new Vector2(300, 384);
    fireFront();
    const shieldedTarget = context.ships.createChaser(new Vector2(900, 384), 0);
    simulate(1.5);
    expect(shieldedTarget.health).toBe(shieldedTarget.maxHealth);
    const [expiry] = eventsOfType(context.events.drain(), 'projectileExpired');
    expect(expiry?.reason).toBe('hitIsland');
    expect(expiry?.position.x).toBeCloseTo(512, 0);
  });

  it('damages an enemy exactly once and disappears', () => {
    const { context, fireFront, simulate } = setUp();
    const enemy = context.ships.createShooter(new Vector2(400, 200), 0);
    fireFront();
    simulate(1);
    expect(enemy.health).toBe(enemy.maxHealth - context.config.player.frontCannon.damage);
    expect(context.world.projectiles[0]?.isActive).toBe(false);
    expect(eventsOfType(context.events.drain(), 'projectileHit')).toHaveLength(1);
  });

  it('never hits ships of the same faction', () => {
    const { context, player, simulate } = setUp();
    const shooter = context.ships.createShooter(new Vector2(500, 200), Math.PI);
    const allyInTheWay = context.ships.createShooter(new Vector2(400, 200), 0);
    const cannon = shooter.weapon('cannon');
    if (!cannon) throw new Error('Shooter has no cannon');
    weapons.fire(shooter, cannon, context);
    simulate(1);
    expect(allyInTheWay.health).toBe(allyInTheWay.maxHealth);
    expect(player.health).toBe(player.maxHealth - context.config.shooter.cannon.damage);
  });

  it('does not tunnel through a target at very high speed', () => {
    const { context } = setUp();
    const enemy = context.ships.createChaser(new Vector2(300, 200), 0);
    context.world.addProjectile(
      new Projectile({
        id: context.world.createEntityId(),
        ownerId: 1,
        faction: 'player',
        weaponSlot: 'front',
        position: new Vector2(230, 200),
        velocity: new Vector2(100_000, 0),
        damage: 5,
        radius: 5,
        range: 100_000,
      }),
    );
    projectiles.update(context);
    expect(enemy.health).toBeLessThan(enemy.maxHealth);
  });

  it('ignores destroyed ships', () => {
    const { context, fireFront, simulate } = setUp();
    context.ships.createChaser(new Vector2(400, 200), 0).destroy();
    fireFront();
    simulate(1);
    expect(eventsOfType(context.events.drain(), 'projectileHit')).toHaveLength(0);
  });
});
