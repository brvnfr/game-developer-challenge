import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

test.describe('asset loading (E2E-02)', () => {
  test.use({ allowConsoleErrors: { patterns: [/Failed to load resource/, /net::ERR_FAILED/, /\[Assets\]/] } });

  test('shows progress while the atlases load', async ({ page }) => {
    await page.route('**/assets/game/tiles@*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    const game = new GamePage(page);
    await game.open();
    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('progressbar')).toBeVisible();
    await game.waitForMatch();
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('reports a failed download and starts the match after a retry', async ({ page }) => {
    await page.route('**/assets/game/ships.*', (route) => route.abort());
    const game = new GamePage(page);
    await game.open();
    await page.getByRole('button', { name: 'Play' }).click();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Could not load the game');
    await expect(page.getByTestId('game-canvas')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Retry' })).toBeFocused();

    await page.unroute('**/assets/game/ships.*');
    await page.getByRole('button', { name: 'Retry' }).click();
    await game.waitForMatch();
  });

  test('reuses the loaded textures for the next match', async ({ page }) => {
    const game = new GamePage(page);
    await game.open();
    await game.startMatch();
    const atlasRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/assets/game/')) atlasRequests.push(request.url());
    });
    await page.keyboard.press('KeyP');
    await page.getByRole('button', { name: 'Main Menu' }).click();
    await game.startMatch();
    expect(atlasRequests).toEqual([]);
  });
});
