import { describe, expect, it } from 'vitest';
import { Vector2 } from '@/game/core/math/Vector2';
import { createTestContext } from '@/game/sim/testing/fixtures';
import { WakeEmitter } from './WakeEmitter';
import type { WakeLayer } from './WakeLayer';

function setUp() {
  const ship = createTestContext().ships.createPlayer(new Vector2(400, 300), 0);
  const puffs: { position: Vector2; size: number }[] = [];
  const layer = { emit: (position: Vector2, size: number) => puffs.push({ position, size }) } as unknown as WakeLayer;
  return { ship, puffs, emitter: new WakeEmitter(ship, layer) };
}

/** Sails east at `speed` px/s for `seconds`, one 60 Hz frame at a time. */
function sail(emitter: WakeEmitter, speed: number, seconds: number, from = 400, frameSeconds = 1 / 60) {
  let x = from;
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += 1 / 60) {
    emitter.update(new Vector2(x, 300), 0, frameSeconds);
    x += speed / 60;
  }
  return x;
}

describe('WakeEmitter', () => {
  it('drops a pair of puffs behind the stern every few pixels sailed', () => {
    const { ship, puffs, emitter } = setUp();
    sail(emitter, 120, 1);
    expect(puffs.length).toBeGreaterThanOrEqual(16);
    expect(puffs.length % 2).toBe(0);
    const [port, starboard] = puffs;
    expect(port?.position.x).toBeLessThan(400); // behind a ship heading east
    expect(port?.position.y).toBeLessThan(300);
    expect(starboard?.position.y).toBeGreaterThan(300);
    expect(port?.size).toBeCloseTo(ship.hullRadius * 2.2);
  });

  it('leaves no wake when the ship is nearly still, paused or sunk', () => {
    const slow = setUp();
    sail(slow.emitter, 10, 2);
    expect(slow.puffs).toHaveLength(0);

    const paused = setUp();
    sail(paused.emitter, 120, 1, 400, 0);
    expect(paused.puffs).toHaveLength(0);

    const sunk = setUp();
    sunk.ship.destroy();
    sail(sunk.emitter, 120, 1);
    expect(sunk.puffs).toHaveLength(0);
  });
});
