import { existsSync } from 'node:fs';
import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { GamePage, STORAGE_KEYS } from './support/GamePage';

/**
 * Visual regression of the menu, the arena in a stable state and the result screen (README §8).
 * Baselines live in e2e/__screenshots__/<project>/<name>-<platform>.png. Fonts and anti-aliasing differ between
 * operating systems, so each platform has its own baselines; the Linux ones are versioned as the reference.
 * On a platform without baselines the checks are skipped with instructions instead of failing:
 * create them with `npm run test:e2e:visual:update` (or run in Docker: `npm run test:e2e:docker`).
 */
function skipWithoutBaseline(testInfo: TestInfo, name: string): void {
  const baseline = testInfo.snapshotPath(name, { kind: 'screenshot' });
  const isUpdating = testInfo.config.updateSnapshots === 'all' || testInfo.config.updateSnapshots === 'changed';
  test.skip(
    !existsSync(baseline) && !isUpdating,
    `No ${process.platform} baseline for ${name}. Run "npm run test:e2e:visual:update" to create it.`,
  );
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter((image) => !image.complete).map((image) => image.decode()));
  });
}

const FINISHED_MATCH = {
  matchId: 'visual-result',
  score: 24,
  durationMs: 120_000,
  endReason: 'timeUp',
  endedAt: '2026-10-14T12:00:00.000Z',
  settings: { sessionTimeSeconds: 120, spawnIntervalSeconds: 3 },
  seed: 1,
  highlights: { cannonballsFired: 96, hits: 41, damageDealt: 655, damageTaken: 60 },
};

test.describe('visual regression @visual', () => {
  test('main menu', async ({ page }, testInfo) => {
    skipWithoutBaseline(testInfo, 'main-menu.png');
    const game = new GamePage(page);
    await game.open();
    await settle(page);
    await expect(page).toHaveScreenshot('main-menu.png', { fullPage: true });
  });

  test('arena in a stable state', async ({ page }, testInfo) => {
    skipWithoutBaseline(testInfo, 'arena.png');
    const game = new GamePage(page);
    await game.open({ setup: 'chaser-ahead', seed: 1, spawnSeconds: 10 });
    await game.startMatch();
    // Fixed seed and manual clock: the same frame on every run (past the 2 s "Battle stations!" banner).
    await game.advance(2_500);
    await settle(page);
    await expect(page).toHaveScreenshot('arena.png', { maxDiffPixelRatio: 0.01 });
  });

  test('result screen', async ({ page }, testInfo) => {
    skipWithoutBaseline(testInfo, 'result.png');
    await page.addInitScript(
      ({ resultKey, result }) => {
        window.localStorage.setItem(resultKey, JSON.stringify(result));
        window.sessionStorage.setItem('pirate-battle.screen.v1', JSON.stringify('result'));
      },
      { resultKey: STORAGE_KEYS.lastResult, result: FINISHED_MATCH },
    );
    const game = new GamePage(page);
    await game.open();
    await game.waitForResult('Battle complete');
    await settle(page);
    await expect(page).toHaveScreenshot('result.png', { fullPage: true });
  });
});
