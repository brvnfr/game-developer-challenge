import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

test.describe('navigation and lifecycle (E2E-09)', () => {
  test('repeatedly entering and leaving matches never leaks runtimes or canvases', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 3, spawnSeconds: 10 });
    for (let round = 0; round < 5; round++) {
      await game.startMatch();
      expect(await game.liveRuntimes()).toBe(1);
      await expect(page.locator('canvas')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Main Menu' }).click();
      await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
      expect(await game.liveRuntimes()).toBe(0);
      await expect(page.locator('canvas')).toHaveCount(0);
    }
  });

  test('game keys are not captured outside a match, so menus keep normal keyboard behaviour', async ({ page }) => {
    const game = new GamePage(page);
    await game.open();
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    for (const key of ['KeyW', 'KeyA', 'KeyQ', 'Space', 'KeyP']) await page.keyboard.press(key);
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    expect(await game.liveRuntimes()).toBe(0);

    // With the focus on Play, Space activates the button as usual: the game does not swallow it.
    await page.getByRole('button', { name: 'Play' }).focus();
    await page.keyboard.press('Space');
    await game.waitForMatch();
  });
});

test.describe('touch controls (E2E-09)', () => {
  test('on-screen buttons sail and fire at the same time', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch input runs on the mobile project');
    const game = new GamePage(page);
    await game.open({ seed: 3, spawnSeconds: 10 });
    await game.startMatch();
    await expect(page.getByTestId('touch-controls')).toBeVisible();

    const forward = await page.getByTestId('touch-sailForward').boundingBox();
    const fire = await page.getByTestId('touch-fireFront').boundingBox();
    if (!forward || !fire) throw new Error('Touch buttons are not laid out');
    const start = (await game.state()).player;
    const cdp = await page.context().newCDPSession(page);
    const center = (box: { x: number; y: number; width: number; height: number }) => ({
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...center(forward), id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { ...center(forward), id: 1 },
        { ...center(fire), id: 2 },
      ],
    });
    await game.advance(1000);
    const during = await game.state();
    expect(during.player.x).toBeGreaterThan(start.x + 20);
    expect(during.projectiles.some((projectile) => projectile.faction === 'player')).toBe(true);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const released = await game.state();
    await game.advance(1500);
    expect((await game.state()).player.speed).toBeLessThan(released.player.speed);
  });
});

test.describe('mobile orientation (E2E-09)', () => {
  test('portrait pauses the match behind a rotate notice; landscape needs an explicit resume', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Orientation applies to touch devices');
    const game = new GamePage(page);
    await game.open({ seed: 3, spawnSeconds: 10 });
    await game.startMatch();
    const landscape = page.viewportSize();
    if (!landscape) throw new Error('No viewport');

    await page.setViewportSize({ width: landscape.height, height: landscape.width });
    await expect(page.getByRole('dialog', { name: 'Rotate your device' })).toBeVisible();
    expect((await game.state()).status).toBe('paused');
    const pausedAt = (await game.state()).elapsedSeconds;
    await game.advance(3_000);
    expect((await game.state()).elapsedSeconds).toBe(pausedAt);

    await page.setViewportSize(landscape);
    await expect(game.pauseDialog()).toBeVisible();
    await expect(game.pauseDialog()).toContainText('portrait');
    await game.pauseDialog().getByRole('button', { name: 'Resume' }).click();
    expect((await game.state()).status).toBe('running');
  });
});
