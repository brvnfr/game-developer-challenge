import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '@/game/config/defaults';
import { Vector2 } from '@/game/core/math/Vector2';
import { Projectile } from './Projectile';
import { Ship } from './Ship';
import { Weapon } from './Weapon';

const createShip = () =>
  new Ship({ id: 1, kind: 'chaser', stats: DEFAULT_GAME_CONFIG.chaser, position: Vector2.ZERO, heading: 0 });

describe('Ship', () => {
  it('takes damage once per call, never below zero, and is destroyed at zero health', () => {
    const ship = createShip();
    expect(ship.takeDamage(10)).toEqual({ applied: 10, wasDestroyed: false });
    expect(ship.takeDamage(100)).toEqual({ applied: 20, wasDestroyed: true });
    expect(ship.health).toBe(0);
    expect(ship.isAlive).toBe(false);
    expect(ship.takeDamage(10)).toEqual({ applied: 0, wasDestroyed: false });
  });

  it('clamps control inputs and drops them when stopped', () => {
    const ship = createShip();
    ship.setControls(2, -3);
    expect([ship.throttle, ship.turnInput]).toEqual([1, -1]);
    ship.stopControls();
    expect([ship.throttle, ship.turnInput]).toEqual([0, 0]);
  });

  it('applies the difficulty speed multiplier to speed and turn rate', () => {
    const stats = DEFAULT_GAME_CONFIG.chaser;
    const ship = new Ship({ id: 2, kind: 'chaser', stats, position: Vector2.ZERO, heading: 0, speedMultiplier: 1.5 });
    expect(ship.maxSpeed).toBeCloseTo(stats.maxSpeed * 1.5);
    expect(ship.turnSpeed).toBeCloseTo(stats.turnSpeed * 1.5);
    expect(ship.faction).toBe('enemy');
  });
});

describe('Weapon', () => {
  it('fires only when the trigger is held and the cooldown has elapsed', () => {
    const weapon = new Weapon('front', DEFAULT_GAME_CONFIG.player.frontCannon);
    expect(weapon.shouldFire).toBe(false);
    weapon.isTriggerHeld = true;
    expect(weapon.shouldFire).toBe(true);
    weapon.startCooldown();
    expect(weapon.shouldFire).toBe(false);
    weapon.tick(DEFAULT_GAME_CONFIG.player.frontCannon.cooldownSeconds);
    expect(weapon.shouldFire).toBe(true);
  });

  it('scales the cooldown by its multiplier', () => {
    const weapon = new Weapon('cannon', DEFAULT_GAME_CONFIG.shooter.cannon, 0.5);
    weapon.startCooldown();
    expect(weapon.cooldownRemaining).toBeCloseTo(DEFAULT_GAME_CONFIG.shooter.cannon.cooldownSeconds * 0.5);
  });
});

describe('Projectile', () => {
  it('consumes range while travelling and deactivates when stopped', () => {
    const projectile = new Projectile({
      id: 1,
      ownerId: 1,
      faction: 'player',
      weaponSlot: 'front',
      position: Vector2.ZERO,
      velocity: new Vector2(100, 0),
      damage: 10,
      radius: 5,
      range: 50,
    });
    projectile.travelTo(new Vector2(30, 0));
    expect(projectile.remainingRange).toBe(20);
    expect(projectile.previousPosition).toEqual(Vector2.ZERO);
    projectile.stopAt(new Vector2(35, 0));
    expect(projectile.isActive).toBe(false);
  });
});
