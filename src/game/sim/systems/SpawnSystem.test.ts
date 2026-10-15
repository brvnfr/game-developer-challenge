import { describe, expect, it } from 'vitest';
import { DEFAULT_ARENA } from '../arena/defaultArena';
import { createTestConfig, createTestContext, eventsOfType } from '../testing/fixtures';
import { SpawnSystem } from './SpawnSystem';

function setUp(spawnIntervalSeconds: number) {
  const config = createTestConfig(undefined, { spawnIntervalSeconds });
  const context = createTestContext(DEFAULT_ARENA, config, 3);
  const player = context.ships.createPlayer(context.arena.playerStart, 0);
  const spawner = new SpawnSystem(config);
  const runSteps = (fromStep: number, toStep: number, beforeEachStep?: () => void) => {
    for (let step = fromStep; step <= toStep; step++) {
      beforeEachStep?.();
      spawner.update(context, step);
    }
  };
  return { context, player, spawner, runSteps };
}

describe('SpawnSystem', () => {
  it('spawns exactly at every configured interval', () => {
    const { context, spawner } = setUp(2);
    const wavesAtStep: number[] = [];
    for (let step = 1; step <= 600; step++) {
      spawner.update(context, step);
      if (eventsOfType(context.events.drain(), 'enemySpawned').length > 0) wavesAtStep.push(step);
    }
    expect(wavesAtStep).toEqual([120, 240, 360, 480, 600]);
  });

  it('opens with a Chaser and then a Shooter, so both kinds always appear', () => {
    const { context, runSteps } = setUp(1);
    runSteps(1, 120);
    expect(
      eventsOfType(context.events.drain(), 'enemySpawned')
        .slice(0, 2)
        .map((event) => event.kind),
    ).toEqual(['chaser', 'shooter']);
  });

  it('only spawns on free water, far enough from the player', () => {
    const { context, player, runSteps } = setUp(1);
    runSteps(1, 60 * 30);
    const enemies = context.world.livingEnemies();
    expect(enemies.length).toBeGreaterThan(3);
    for (const enemy of enemies) {
      expect(enemy.position.distanceTo(player.position)).toBeGreaterThanOrEqual(
        context.config.spawn.minDistanceFromPlayer,
      );
      expect(context.hullPlacement.isBlocked(enemy)).toBe(false);
    }
  });

  it('respects the alive cap of the difficulty curve', () => {
    const { context, runSteps } = setUp(1);
    runSteps(1, 60 * 20);
    expect(context.world.livingEnemies().length).toBeLessThanOrEqual(5);
  });

  it('only sends waves of two in the last stretch of a long match', () => {
    const { context, runSteps } = setUp(5);
    const clearArena = () => {
      for (const enemy of context.world.livingEnemies()) enemy.destroy();
      context.world.removeInactive();
    };
    const waves: { atSeconds: number; size: number }[] = [];
    // The events drained before a step were emitted by the step before it.
    let previousStep = 0;
    runSteps(1, 60 * 180 + 1, () => {
      const spawned = eventsOfType(context.events.drain(), 'enemySpawned').length;
      if (spawned > 0) waves.push({ atSeconds: previousStep / 60, size: spawned });
      previousStep++;
      clearArena();
    });
    expect(waves[0]?.size).toBe(1);
    expect(Math.max(...waves.map((wave) => wave.size))).toBe(2);
    const firstPair = waves.find((wave) => wave.size === 2);
    expect(firstPair?.atSeconds).toBeGreaterThanOrEqual(150);
  });

  it('turns new enemies towards the player', () => {
    const { context, player, spawner } = setUp(1);
    spawner.update(context, 60);
    const [enemy] = context.world.livingEnemies();
    if (!enemy) throw new Error('No enemy spawned');
    expect(enemy.heading).toBeCloseTo(enemy.position.angleTo(player.position));
  });
});
