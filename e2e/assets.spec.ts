import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

test.describe('asset loading (E2E-02)', () => {
  test.use({ allowConsoleErrors: { patterns: [/Failed to load resource/, /net::ERR_FAILED/, /\[Assets\]/] } });
  // page.route() does not see requests that pass through a service worker, and the mock API runs in one.
  // These tests do not use the API, so service workers are blocked and the app runs without mocks.
  test.use({ serviceWorkers: 'block' });

  test('the page opens on a loading screen until the menu art is ready, then shows the complete menu', async ({
    page,
  }) => {
    let releaseTitle: () => void = () => undefined;
    const titleHeld = new Promise<void>((resolve) => {
      releaseTitle = resolve;
    });
    await page.route('**/title_pirate_battle*.png', async (route) => {
      await titleHeld;
      await route.continue();
    });
    await page.goto('/?test=1', { waitUntil: 'domcontentloaded' });
    const splash = page.getByRole('progressbar', { name: 'Loading Pirate Battle' });
    await expect(splash).toBeVisible();
    await expect.poll(async () => Number(await splash.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    expect(Number(await splash.getAttribute('aria-valuenow'))).toBeLessThan(100);
    await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0);

    releaseTitle();
    await expect(splash).toHaveCount(0);
    const title = page.getByRole('img', { name: 'Pirate Battle' });
    await expect(title).toBeVisible();
    expect(await title.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  });

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
