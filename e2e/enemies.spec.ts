import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

const distance = (first: { x: number; y: number }, second: { x: number; y: number }) =>
  Math.hypot(first.x - second.x, first.y - second.y);

test.describe('enemies and spawning (E2E-05)', () => {
  test('a Chaser closes in, rams the player, explodes and does not score', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ setup: 'chaser-ahead', seed: 1, spawnSeconds: 10 });
    await game.startMatch();
    const config = await game.config();
    const start = await game.state();
    const startDistance = distance(start.player, start.enemies[0] ?? start.player);

    await game.advance(1_000);
    const approaching = await game.state();
    expect(distance(approaching.player, approaching.enemies[0] ?? approaching.player)).toBeLessThan(startDistance);

    const afterRam = await game.advanceUntil((state) => state.enemies.length === 0, 8_000, 100);
    expect(afterRam.player.health).toBe(afterRam.player.maxHealth - config.chaser.ramDamage);
    expect(afterRam.statistics.enemiesDestroyedByRam).toBe(1);
    expect(afterRam.score).toBe(0);
    await expect(page.getByTestId('hud-score')).toHaveText('0');
  });

  test('a Shooter approaches and only fires within its attack range', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ setup: 'shooter-far', seed: 1, spawnSeconds: 10 });
    await game.startMatch();
    const config = await game.config();
    const stepMargin = config.shooter.maxSpeed * 0.1 + 1; // the shooter moves between two samples

    let state = await game.state();
    const startDistance = distance(state.player, state.enemies[0] ?? state.player);
    expect(startDistance).toBeGreaterThan(config.shooter.attackRange);
    let shotsSeen = 0;
    let previousDistance = startDistance;
    for (let sample = 0; sample < 100 && state.statistics.enemyProjectilesFired < 2; sample++) {
      await game.advance(100, { shouldDraw: false });
      state = await game.state();
      const shooter = state.enemies[0];
      if (!shooter) break;
      const current = distance(state.player, shooter);
      if (state.statistics.enemyProjectilesFired > shotsSeen) {
        expect(Math.min(previousDistance, current)).toBeLessThanOrEqual(config.shooter.attackRange + stepMargin);
        shotsSeen = state.statistics.enemyProjectilesFired;
      }
      previousDistance = current;
    }
    expect(shotsSeen).toBeGreaterThanOrEqual(1);
    expect(previousDistance).toBeLessThan(startDistance);
  });

  test('waves spawn at the configured interval, far from the player and off the islands', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 3, sessionSeconds: 60, spawnSeconds: 2 });
    await game.startMatch();
    const config = await game.config();

    await game.advance(1_900);
    expect((await game.state()).enemiesSpawned).toBe(0);
    await game.advance(100);
    const firstWave = await game.state();
    expect(firstWave.enemiesSpawned).toBeGreaterThanOrEqual(1);

    await game.advance(1_900);
    expect((await game.state()).enemiesSpawned).toBe(firstWave.enemiesSpawned);
    await game.advance(100);
    const secondWave = await game.state();
    expect(secondWave.enemiesSpawned).toBeGreaterThan(firstWave.enemiesSpawned);

    for (const wave of [firstWave, secondWave]) {
      const newest = wave.enemies.at(-1);
      if (!newest) throw new Error('No enemy spawned');
      expect(distance(newest, wave.player)).toBeGreaterThanOrEqual(config.spawn.minDistanceFromPlayer - 1);
      const hullRadius = config[newest.kind === 'shooter' ? 'shooter' : 'chaser'].hullRadius;
      expect(
        await page.evaluate(([x, y, radius]) => window.__PIRATE_BATTLE__?.isCircleBlocked(x, y, radius), [
          newest.x,
          newest.y,
          hullRadius,
        ] as const),
      ).toBe(false);
    }
  });

  test('both enemy kinds appear in a default match', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 3 }); // default options: 120 s, a wave every 3 s
    await game.startMatch();
    const state = await game.advanceUntil(
      (current) =>
        current.statistics.enemiesSpawnedByKind.chaser > 0 && current.statistics.enemiesSpawnedByKind.shooter > 0,
      15_000,
      500,
    );
    expect(state.elapsedSeconds).toBeLessThanOrEqual(15);
  });
});
