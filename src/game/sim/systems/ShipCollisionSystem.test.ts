import { describe, expect, it } from 'vitest';
import { Vector2 } from '@/game/core/math/Vector2';
import { createTestContext, eventsOfType } from '../testing/fixtures';
import { ShipCollisionSystem } from './ShipCollisionSystem';
import { WeaponSystem } from './WeaponSystem';

const collisions = new ShipCollisionSystem();

describe('ShipCollisionSystem', () => {
  it('makes a Chaser that rams the player explode and damage the player', () => {
    const context = createTestContext();
    const player = context.ships.createPlayer(new Vector2(300, 300), 0);
    const chaser = context.ships.createChaser(new Vector2(320, 300), 0);
    collisions.update(context);
    expect(chaser.isAlive).toBe(false);
    expect(player.health).toBe(player.maxHealth - context.config.chaser.ramDamage);
    expect(eventsOfType(context.events.drain(), 'shipDestroyed').map((event) => event.cause)).toEqual(['ram']);
  });

  it('ignores a destroyed Chaser', () => {
    const context = createTestContext();
    const player = context.ships.createPlayer(new Vector2(300, 300), 0);
    context.ships.createChaser(new Vector2(320, 300), 0).destroy();
    collisions.update(context);
    expect(player.health).toBe(player.maxHealth);
  });

  it('separates other overlapping ships', () => {
    const context = createTestContext();
    const first = context.ships.createShooter(new Vector2(300, 300), 0);
    const second = context.ships.createShooter(new Vector2(310, 300), 0);
    collisions.update(context);
    expect(first.position.distanceTo(second.position)).toBeCloseTo(first.radius + second.radius);
  });
});

describe('DamageResolver', () => {
  it('reports damage and a single destruction', () => {
    const context = createTestContext();
    const chaser = context.ships.createChaser(new Vector2(300, 300), 0);
    expect(context.damage.applyDamage(chaser, 10, 'playerProjectile')).toBe(false);
    expect(context.damage.applyDamage(chaser, 100, 'playerProjectile')).toBe(true);
    expect(context.damage.applyDamage(chaser, 10, 'playerProjectile')).toBe(false);
    const events = context.events.drain();
    expect(eventsOfType(events, 'shipDamaged').map((event) => event.damage)).toEqual([10, 20]);
    expect(eventsOfType(events, 'shipDestroyed')).toHaveLength(1);
  });

  it('removes the projectiles in flight of a destroyed enemy', () => {
    const context = createTestContext();
    context.ships.createPlayer(new Vector2(900, 300), 0);
    const shooter = context.ships.createShooter(new Vector2(300, 300), 0);
    const cannon = shooter.weapon('cannon');
    if (!cannon) throw new Error('Shooter has no cannon');
    const [projectile] = new WeaponSystem().fire(shooter, cannon, context);
    context.damage.applyDamage(shooter, 1000, 'playerProjectile');
    expect(projectile?.isActive).toBe(false);
  });
});
