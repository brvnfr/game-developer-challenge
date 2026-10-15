import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

test.describe('pause', () => {
  test('pauses manually, freezes the clock and resumes on request', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 2, spawnSeconds: 10 });
    await game.startMatch();
    await game.advance(2000);
    await page.keyboard.press('KeyP');
    await expect(game.pauseDialog()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume' })).toBeFocused();
    const paused = await game.state();
    await game.advance(5000);
    const stillPaused = await game.state();
    expect(stillPaused.status).toBe('paused');
    expect(stillPaused.remainingSeconds).toBe(paused.remainingSeconds);
    expect(stillPaused.stepsSimulated).toBe(paused.stepsSimulated);

    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(game.pauseDialog()).toHaveCount(0);
    await game.advance(1000);
    expect((await game.state()).remainingSeconds).toBeCloseTo(paused.remainingSeconds - 1, 5);
  });

  test('pauses automatically when the window loses focus or the tab is hidden', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 2, spawnSeconds: 10 });
    await game.startMatch();
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(game.pauseDialog()).toContainText('lost focus');
    await page.getByRole('button', { name: 'Resume' }).click();

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(game.pauseDialog()).toContainText('tab was hidden');
  });

  test('does not carry movement or shots held during the pause into the resume', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 2, spawnSeconds: 10 });
    await game.startMatch();
    await page.keyboard.press('KeyP');
    await page.keyboard.down('KeyW');
    await page.keyboard.down('Space');
    await game.advance(1000);
    await page.getByRole('button', { name: 'Resume' }).click();
    const resumed = await game.state();
    await game.advance(500);
    const after = await game.state();
    expect(after.player.x).toBeCloseTo(resumed.player.x, 5);
    expect(after.projectiles).toHaveLength(0);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('Space');
  });
});
