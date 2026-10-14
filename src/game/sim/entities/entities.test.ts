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

describe('Ship hull', () => {
  it('models the hull as three circles along the keel, covering bow to stern', () => {
    const ship = new Ship({
      id: 3,
      kind: 'player',
      stats: DEFAULT_GAME_CONFIG.player,
      position: new Vector2(100, 100),
      heading: 0,
    });
    const centers = ship.hullCircleCenters();
    expect(centers).toHaveLength(3);
    const bowTip = (centers.at(-1)?.x ?? 0) + ship.hullRadius;
    const sternTip = (centers[0]?.x ?? 0) - ship.hullRadius;
    expect(bowTip - sternTip).toBeCloseTo(ship.hullLength);
  });

  it('finds the deepest contact between two hulls', () => {
    const stats = DEFAULT_GAME_CONFIG.chaser;
    const first = new Ship({ id: 4, kind: 'chaser', stats, position: new Vector2(0, 0), heading: 0 });
    const second = new Ship({ id: 5, kind: 'chaser', stats, position: new Vector2(0, 30), heading: 0 });
    const contact = first.findContactWith(second);
    expect(contact?.normal.y).toBeCloseTo(1);
    expect(contact?.depth).toBeCloseTo(stats.hullRadius * 2 - 30);
    const far = new Ship({ id: 6, kind: 'chaser', stats, position: new Vector2(0, 100), heading: 0 });
    expect(first.findContactWith(far)).toBeNull();
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

  it('reports how far the reload has progressed', () => {
    const weapon = new Weapon('front', { ...DEFAULT_GAME_CONFIG.player.frontCannon, cooldownSeconds: 1 });
    expect(weapon.readiness).toBe(1);
    weapon.startCooldown();
    expect(weapon.readiness).toBe(0);
    weapon.tick(0.25);
    expect(weapon.readiness).toBeCloseTo(0.25);
    weapon.tick(1);
    expect(weapon.readiness).toBe(1);
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
