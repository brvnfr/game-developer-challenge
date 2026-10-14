import { describe, expect, it } from 'vitest';
import { Vector2 } from '@/game/core/math/Vector2';
import { createTestContext, eventsOfType, ISLAND_SEA, OPEN_SEA, stepsFor } from '../testing/fixtures';
import type { SimulationContext } from '../SimulationContext';
import { EnemyAiSystem } from './EnemyAiSystem';
import { MovementSystem } from './MovementSystem';
import { ProjectileSystem } from './ProjectileSystem';
import { ShipCollisionSystem } from './ShipCollisionSystem';
import type { SimulationSystem } from './SimulationSystem';
import { WeaponSystem } from './WeaponSystem';

function createPipeline(context: SimulationContext) {
  const systems: SimulationSystem[] = [
    new EnemyAiSystem(context.config),
    new WeaponSystem(),
    new MovementSystem(),
    new ShipCollisionSystem(),
    new ProjectileSystem(),
  ];
  return () => {
    for (const system of systems) system.update(context, 0);
  };
}

describe('Chaser behaviour', () => {
  it('reaches and rams the player in open water', () => {
    const context = createTestContext(OPEN_SEA);
    const runStep = createPipeline(context);
    const player = context.ships.createPlayer(new Vector2(1000, 400), 0);
    const chaser = context.ships.createChaser(new Vector2(100, 100), Math.PI);
    const isChaserAlive = () => chaser.isAlive;
    for (let step = 0; step < stepsFor(15) && isChaserAlive(); step++) runStep();
    expect(chaser.isAlive).toBe(false);
    expect(player.health).toBeLessThan(player.maxHealth);
  });

  it('sails around an island to reach the player without ever entering it', () => {
    const context = createTestContext(ISLAND_SEA);
    const runStep = createPipeline(context);
    const player = context.ships.createPlayer(new Vector2(1100, 384), 0);
    const chaser = context.ships.createChaser(new Vector2(200, 384), 0);
    const isChaserAlive = () => chaser.isAlive;
    for (let step = 0; step < stepsFor(20) && isChaserAlive(); step++) {
      runStep();
      if (isChaserAlive()) expect(context.hullPlacement.isBlocked(chaser, 0.01)).toBe(false);
    }
    expect(chaser.isAlive).toBe(false);
    expect(player.health).toBeLessThan(player.maxHealth);
  });
});

describe('Shooter behaviour', () => {
  it('approaches and only fires within attack range', () => {
    const context = createTestContext(OPEN_SEA);
    const runStep = createPipeline(context);
    const player = context.ships.createPlayer(new Vector2(1100, 400), 0);
    const shooter = context.ships.createShooter(new Vector2(100, 400), Math.PI);
    expect(shooter.position.distanceTo(player.position)).toBeGreaterThan(context.config.shooter.attackRange);
    let shotsFired = 0;
    for (let step = 0; step < stepsFor(15); step++) {
      runStep();
      for (const event of eventsOfType(context.events.drain(), 'weaponFired')) {
        if (event.shipId !== shooter.id) continue;
        shotsFired++;
        expect(shooter.position.distanceTo(player.position)).toBeLessThanOrEqual(
          context.config.shooter.attackRange + 1,
        );
      }
    }
    expect(shotsFired).toBeGreaterThan(2);
    expect(player.health).toBeLessThan(player.maxHealth);
  });

  it('keeps its distance instead of ramming', () => {
    const context = createTestContext(OPEN_SEA, undefined);
    const runStep = createPipeline(context);
    const player = context.ships.createPlayer(new Vector2(1100, 400), 0);
    const shooter = context.ships.createShooter(new Vector2(200, 400), 0);
    let closestDistance = Infinity;
    for (let step = 0; step < stepsFor(20) && player.isAlive; step++) {
      runStep();
      closestDistance = Math.min(closestDistance, shooter.position.distanceTo(player.position));
    }
    expect(closestDistance).toBeGreaterThan(context.config.shooter.preferredRange * 0.7);
  });

  it('holds fire without line of sight', () => {
    const context = createTestContext(ISLAND_SEA);
    const player = context.ships.createPlayer(new Vector2(900, 384), 0);
    const shooter = context.ships.createShooter(new Vector2(470, 384), 0);
    new EnemyAiSystem(context.config).update(context);
    expect(context.arena.hasLineOfSight(shooter.position, player.position)).toBe(false);
    expect(shooter.weapon('cannon')?.isTriggerHeld).toBe(false);
  });

  it('stops attacking once the player is destroyed', () => {
    const context = createTestContext(OPEN_SEA);
    const player = context.ships.createPlayer(new Vector2(500, 400), 0);
    const shooter = context.ships.createShooter(new Vector2(200, 400), 0);
    player.destroy();
    new EnemyAiSystem(context.config).update(context);
    expect(shooter.throttle).toBe(0);
    expect(shooter.weapon('cannon')?.isTriggerHeld).toBe(false);
  });
});
