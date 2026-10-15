import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

/**
 * Seeded scenarios (manual clock, real input):
 * - seed 11, 60 s, spawn 10 s, sailing in circles while firing every cannon → survives until time runs out;
 * - seed 3, spawn 10 s, idle player → sunk by the enemies.
 */
const FIGHTING_KEYS = ['KeyW', 'KeyA', 'Space', 'KeyQ', 'KeyE'] as const;

test.describe('end of the match and restart (E2E-06)', () => {
  test('time running out ends the match, freezes the simulation and shows the result', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 11, sessionSeconds: 60, spawnSeconds: 10 });
    await game.startMatch();
    for (const key of FIGHTING_KEYS) await page.keyboard.down(key);
    await game.advanceUntilEnded(65_000);
    for (const key of FIGHTING_KEYS) await page.keyboard.up(key);

    const ended = await game.state();
    expect(ended.status).toBe('ended');
    expect(ended.remainingSeconds).toBe(0);
    expect(ended.player.isAlive).toBe(true);
    await expect(game.hudTime()).toHaveText('0:00');

    // While the last effects play, nothing moves, scores or takes damage any more.
    await game.advance(500);
    const frozen = await game.state();
    expect(frozen.stepsSimulated).toBe(ended.stepsSimulated);
    expect(frozen.score).toBe(ended.score);
    expect(frozen.player).toEqual(ended.player);
    expect(frozen.enemies).toEqual(ended.enemies);

    await game.advance(1_500);
    await game.waitForResult('Battle complete');
    await expect(page.getByTestId('result-score')).toHaveText(String(ended.score));
    await expect(page.getByTestId('result-time')).toHaveText('1:00');
    await expect(page.getByTestId('result-reason')).toHaveText('Time up');
    await expect(page.getByRole('button', { name: 'Play Again' })).toBeFocused();
    expect(await game.liveRuntimes()).toBe(0);
  });

  test('losing all health ends the match as destroyed, without points for the enemies', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 3, sessionSeconds: 180, spawnSeconds: 10 });
    await game.startMatch();
    await game.advanceUntilEnded(180_000);

    const ended = await game.state();
    expect(ended.status).toBe('ended');
    expect(ended.player.isAlive).toBe(false);
    expect(ended.player.health).toBe(0);
    expect(ended.remainingSeconds).toBeGreaterThan(0);

    await game.advance(2_000);
    await game.waitForResult('Your ship sank');
    await expect(page.getByTestId('result-score')).toHaveText('0');
    await expect(page.getByTestId('result-reason')).toHaveText('Ship destroyed');
    const playedSeconds = Math.round(ended.elapsedSeconds);
    await expect(page.getByTestId('result-time')).toHaveText(
      `${Math.floor(playedSeconds / 60)}:${String(playedSeconds % 60).padStart(2, '0')}`,
    );
    // The idle captain fired nothing and took a full hull of damage.
    await expect(page.getByTestId('highlight-fired')).toHaveText('0');
    await expect(page.getByTestId('highlight-accuracy')).toHaveText('0%');
    const damageTaken = Number(await page.getByTestId('highlight-taken').textContent());
    expect(damageTaken).toBeGreaterThanOrEqual(ended.player.maxHealth);
  });

  test('Play Again starts a clean match: health, score, timer and entities are restored', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 3, sessionSeconds: 180, spawnSeconds: 10 });
    await game.startMatch();
    await game.advanceUntilEnded(180_000);
    await game.advance(2_000);
    await page.getByRole('button', { name: 'Play Again' }).click();
    await game.waitForMatch();

    const fresh = await game.state();
    expect(fresh.score).toBe(0);
    expect(fresh.player.health).toBe(fresh.player.maxHealth);
    expect(fresh.remainingSeconds).toBe(180);
    expect(fresh.elapsedSeconds).toBe(0);
    expect(fresh.enemies).toHaveLength(0);
    expect(fresh.projectiles).toHaveLength(0);
    expect(fresh.enemiesSpawned).toBe(0);
    expect(await game.liveRuntimes()).toBe(1);
    await expect(game.hudTime()).toHaveText('3:00');
  });

  test('Restart from the pause menu resets the match in place', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 11, sessionSeconds: 60, spawnSeconds: 10 });
    await game.startMatch();
    await game.holdKeys(FIGHTING_KEYS, 15_000);
    const before = await game.state();
    expect(before.elapsedSeconds).toBeGreaterThan(14);
    expect(before.enemiesSpawned).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
    await game.pauseDialog().getByRole('button', { name: 'Restart' }).click();
    await expect(game.pauseDialog()).toBeHidden();
    const restarted = await game.state();
    expect(restarted.status).toBe('running');
    expect(restarted.elapsedSeconds).toBe(0);
    expect(restarted.score).toBe(0);
    expect(restarted.player.health).toBe(restarted.player.maxHealth);
    expect(restarted.enemies).toHaveLength(0);
    expect(restarted.projectiles).toHaveLength(0);
    expect(await game.liveRuntimes()).toBe(1);
    await expect(page.locator('canvas')).toHaveCount(1);
  });
});
