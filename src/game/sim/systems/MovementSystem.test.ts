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

  it('turns both ways at the configured turn speed', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(400, 300), 0);
    ship.setControls(0, 1);
    simulate(context, 1);
    expect(ship.heading).toBeCloseTo(context.config.player.turnSpeed, 5);
    ship.setControls(0, -1);
    simulate(context, 2);
    expect(ship.heading).toBeCloseTo(-context.config.player.turnSpeed, 5);
  });

  it('slows to a stop without throttle and then stays still', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(400, 300), 0);
    ship.speed = 100;
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
        expect(context.arena.isCircleBlocked(ship.position, ship.radius - 0.01)).toBe(false);
      });
    },
  );

  it('stays inside the arena bounds', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(100, 100), Math.PI);
    ship.setControls(1, 0);
    simulate(context, 5);
    expect(ship.position.x).toBe(ship.radius);
    ship.heading = -Math.PI / 2;
    simulate(context, 5);
    expect(ship.position.y).toBe(ship.radius);
  });

  it('remembers the previous state for render interpolation', () => {
    const context = createTestContext();
    const ship = context.ships.createPlayer(new Vector2(400, 300), 0);
    ship.setControls(1, 0);
    simulate(context, 2 / 60);
    expect(ship.previousPosition.x).toBeLessThan(ship.position.x);
  });
});
