import { expect, test } from './fixtures/test';
import { GamePage, STORAGE_KEYS } from './support/GamePage';

interface SceneOverlays {
  readonly aimLanes: boolean;
  readonly hitboxes: boolean;
}

async function sceneOverlays(game: GamePage): Promise<SceneOverlays> {
  const state = (await game.state()) as unknown as { scene: { overlays: SceneOverlays } | null };
  if (!state.scene) throw new Error('No scene on screen');
  return state.scene.overlays;
}

test.describe('developer tools', () => {
  test('sit behind a small gear button; every match overlay is off by default', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 1, spawnSeconds: 10 });
    await expect(page.getByRole('button', { name: 'Developer tools' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Network scenarios' })).toHaveCount(0);
    await game.startMatch();
    expect(await sceneOverlays(game)).toEqual({ aimLanes: false, hitboxes: false });
  });

  test('overlays apply to the next match and are remembered after a refresh', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 1, spawnSeconds: 10 });
    const tools = await game.openDeveloperTools();
    await tools.getByRole('checkbox', { name: 'Aim lanes' }).check();
    await tools.getByRole('checkbox', { name: 'Hitboxes' }).check();
    await tools.getByRole('button', { name: 'Close' }).click();
    await game.startMatch();
    expect(await sceneOverlays(game)).toEqual({ aimLanes: true, hitboxes: true });

    await page.reload();
    await game.waitForApp();
    const stored = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEYS.developerTools);
    expect(JSON.parse(stored ?? '{}')).toEqual({ showAimLanes: true, showHitboxes: true });
  });

  test('the gear button works with touch', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch runs on the mobile project');
    const game = new GamePage(page);
    await game.open();
    await page.getByRole('button', { name: 'Developer tools' }).tap();
    await expect(page.getByRole('dialog', { name: 'Developer tools' })).toBeVisible();
  });

  test('"Turn overlays off" switches the overlays off', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 1, spawnSeconds: 10 });
    const tools = await game.openDeveloperTools();
    await tools.getByRole('checkbox', { name: 'Hitboxes' }).check();
    await tools.getByRole('button', { name: 'Turn overlays off' }).click();
    await expect(tools.getByRole('checkbox', { name: 'Hitboxes' })).not.toBeChecked();
    await tools.getByRole('button', { name: 'Close' }).click();
    await game.startMatch();
    expect(await sceneOverlays(game)).toEqual({ aimLanes: false, hitboxes: false });
  });
});
