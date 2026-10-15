import { describe, expect, it } from 'vitest';
import { Vector2 } from '@/game/core/math/Vector2';
import { createTestContext } from '@/game/sim/testing/fixtures';
import type { DamageStage } from '../spriteCatalog';
import type { PuffLayer } from './PuffLayer';
import { SmokeEmitter } from './SmokeEmitter';

function setUp() {
  const ship = createTestContext().ships.createPlayer(new Vector2(400, 300), 0);
  const puffs: { position: Vector2; size: number }[] = [];
  const layer = { emit: (position: Vector2, size: number) => puffs.push({ position, size }) } as unknown as PuffLayer;
  return { ship, puffs, emitter: new SmokeEmitter(ship, layer) };
}

function burn(emitter: SmokeEmitter, stage: DamageStage, seconds: number, frameSeconds = 1 / 60): void {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += 1 / 60) {
    emitter.update(new Vector2(400, 300), 0, stage, frameSeconds);
  }
}

describe('SmokeEmitter', () => {
  it('gives off no smoke while the ship is intact', () => {
    const { puffs, emitter } = setUp();
    burn(emitter, 0, 2);
    expect(puffs).toHaveLength(0);
  });

  it('smokes more, and in larger puffs, the worse the damage', () => {
    const damaged = setUp();
    burn(damaged.emitter, 1, 2);
    const heavilyDamaged = setUp();
    burn(heavilyDamaged.emitter, 2, 2);

    expect(damaged.puffs.length).toBeGreaterThan(5);
    expect(heavilyDamaged.puffs.length).toBeGreaterThan(damaged.puffs.length * 2);
    expect(heavilyDamaged.puffs[0]?.size).toBeGreaterThan(damaged.puffs[0]?.size ?? Infinity);
    // Puffs come from the deck, not from somewhere off the ship.
    for (const puff of heavilyDamaged.puffs) {
      expect(puff.position.distanceTo(new Vector2(400, 300))).toBeLessThan(heavilyDamaged.ship.hullLength / 2);
    }
  });

  it('stops while paused and once the ship has sunk', () => {
    const paused = setUp();
    burn(paused.emitter, 2, 2, 0);
    expect(paused.puffs).toHaveLength(0);

    const sunk = setUp();
    sunk.ship.destroy();
    burn(sunk.emitter, 2, 2);
    expect(sunk.puffs).toHaveLength(0);
  });
});
