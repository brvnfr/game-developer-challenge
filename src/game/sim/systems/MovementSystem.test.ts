import { describe, expect, it } from 'vitest';
import { Vector2 } from '@/game/core/math/Vector2';
import { createTestContext, ISLAND_SEA, stepsFor } from '../testing/fixtures';
import { MovementSystem } from './MovementSystem';

const movement = new MovementSystem();

function simulate(context: ReturnType<typeof createTestContext>, seconds: number, onStep?: () => void) {
  for (let step = 0; step < stepsFor(seconds); step++) {
    movement.update(context);
    onStep?.();
  }
}

describe('MovementSystem', () => {
  it('sails forward along the heading, accelerating up to max speed', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(200, 300), 0);
    ship.setControls(1, 0);
    simulate(context, 2);
    expect(ship.speed).toBeCloseTo(context.config.player.maxSpeed);
    expect(ship.position.x).toBeGreaterThan(200);
    expect(ship.position.y).toBeCloseTo(300);
  });

  it('turns both ways, easing in and out of the configured turn speed', () => {
    const context = createTestContext();
    const { turnSpeed, turnAcceleration } = context.config.player;
    const rampSeconds = turnSpeed / turnAcceleration;
    const ship = context.ships.createPlayer(new Vector2(400, 300), 0);
    ship.setControls(0, 1);
    simulate(context, rampSeconds / 2);
    expect(ship.angularVelocity).toBeCloseTo(turnSpeed / 2, 1); // still speeding up
    simulate(context, 1 - rampSeconds / 2);
    expect(ship.angularVelocity).toBeCloseTo(turnSpeed, 5);
    expect(ship.heading).toBeCloseTo(turnSpeed * (1 - rampSeconds / 2), 1);

    ship.setControls(0, 0);
    simulate(context, rampSeconds / 2);
    expect(ship.angularVelocity).toBeGreaterThan(0); // keeps turning briefly after release
    simulate(context, rampSeconds);
    expect(ship.angularVelocity).toBe(0);

    ship.setControls(0, -1);
    simulate(context, 1);
    expect(ship.angularVelocity).toBeCloseTo(-turnSpeed, 5);
  });

  it('drifts sideways after a turn and the drift fades with the lateral grip', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(800, 500), 0);
    ship.velocity = new Vector2(context.config.player.maxSpeed, 0);
    ship.heading = Math.PI / 4; // the bow swung 45° but the momentum still points east
    movement.update(context);
    expect(Math.abs(ship.driftSpeed)).toBeGreaterThan(50);
    const drift = Math.abs(ship.driftSpeed);
    simulate(context, 1);
    expect(Math.abs(ship.driftSpeed)).toBeLessThan(drift * Math.exp(-context.config.player.lateralGrip) * 1.05);
  });

  it('never sails backwards: thrust is forward only', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(200, 300), 0);
    ship.setControls(1, 0);
    simulate(context, 1.5);
    expect(ship.speed).toBeGreaterThan(0);
    expect(ship.velocity.x).toBeGreaterThan(0);
  });

  it('glides to a stop without throttle and then stays still', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(400, 300), 0);
    ship.velocity = new Vector2(100, 0);
    simulate(context, 0.5);
    expect(ship.speed).toBeGreaterThan(0); // still gliding
    simulate(context, 1);
    expect(ship.speed).toBe(0);
    const stoppedPosition = ship.position;
    movement.update(context);
    expect(ship.position).toEqual(stoppedPosition);
  });

  it.each([0, 0.3, -0.3, Math.PI / 4, -Math.PI / 4])(
    'never enters an island when approaching at heading %f',
    (heading) => {
      const context = createTestContext(ISLAND_SEA);
      const ship = context.ships.createPlayer(new Vector2(300, 384), heading);
      ship.setControls(1, 0);
      simulate(context, 8, () => {
        expect(context.hullPlacement.isBlocked(ship, 0.01)).toBe(false);
      });
    },
  );

  it('stays inside the arena bounds', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(100, 100), Math.PI);
    ship.setControls(1, 0);
    simulate(context, 5);
    expect(ship.position.x).toBeCloseTo(ship.boundingRadius);
    ship.heading = -Math.PI / 2;
    ship.velocity = Vector2.ZERO;
    simulate(context, 5);
    expect(ship.position.y).toBeCloseTo(ship.boundingRadius);
  });

  it('keeps the bow out of the island when sailing straight at it', () => {
    const context = createTestContext(ISLAND_SEA);
    const ship = context.ships.createPlayer(new Vector2(300, 384), 0);
    ship.setControls(1, 0);
    simulate(context, 5);
    const bow = ship.hullCircleCenters().at(-1);
    expect((bow?.x ?? Infinity) + ship.hullRadius).toBeLessThanOrEqual(512 + 0.01);
    expect(ship.position.x).toBeCloseTo(512 - ship.boundingRadius, 0);
  });

  it('remembers the previous state for render interpolation', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(400, 300), 0);
    ship.setControls(1, 0);
    simulate(context, 2 / 60);
    expect(ship.previousPosition.x).toBeLessThan(ship.position.x);
  });

  it('slides along a coast instead of stopping dead', () => {
    const context = createTestContext(ISLAND_SEA);
    const ship = context.ships.createPlayer(new Vector2(380, 300), 0.35); // shallow angle towards the island
    ship.setControls(1, 0);
    simulate(context, 4);
    expect(ship.position.y).toBeGreaterThan(330); // pushed along the coast
    expect(ship.velocity.length).toBeGreaterThan(20);
  });
});
