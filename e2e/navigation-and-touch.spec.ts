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
  test('the helm joystick steers and sails while a cannon button fires', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch input runs on the mobile project');
    const game = new GamePage(page);
    await game.open({ seed: 3, spawnSeconds: 10 });
    await game.startMatch();
    await expect(page.getByTestId('game-controls')).toHaveAttribute('data-mode', 'touch');

    const helm = await page.getByTestId('control-joystick').boundingBox();
    const fire = await page.getByTestId('control-fireFront').boundingBox();
    if (!helm || !fire) throw new Error('Touch controls are not laid out');
    const helmCentre = { x: helm.x + helm.width / 2, y: helm.y + helm.height / 2 };
    const push = (dx: number, dy: number) => ({
      x: helmCentre.x + dx * helm.width,
      y: helmCentre.y + dy * helm.height,
    });
    const fireCentre = { x: fire.x + fire.width / 2, y: fire.y + fire.height / 2 };
    const start = (await game.state()).player;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: { x: number; y: number }[]) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((point, id) => ({ ...point, id })) });

    // Full push to the east (the way the ship already points) while holding the bow cannon.
    await touch('touchStart', [helmCentre]);
    await touch('touchMove', [push(0.45, 0)]);
    await touch('touchStart', [push(0.45, 0), fireCentre]);
    await game.advance(1000);
    const during = await game.state();
    expect(during.player.x).toBeGreaterThan(start.x + 20);
    expect(Math.abs(during.player.heading)).toBeLessThan(0.1);
    expect(during.projectiles.some((projectile) => projectile.faction === 'player')).toBe(true);

    // Swing the knob to the south: the ship turns to follow it.
    await touch('touchMove', [push(0, 0.45), fireCentre]);
    await game.advance(1500);
    expect((await game.state()).player.heading).toBeGreaterThan(1.2);

    await touch('touchEnd', []);
    const released = await game.state();
    await game.advance(1500);
    expect((await game.state()).player.speed).toBeLessThan(released.player.speed);
  });
});

test.describe('mobile orientation (E2E-09)', () => {
  test('portrait pauses the match behind a "turn your phone" notice; landscape needs an explicit resume', async ({
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
    const notice = page.getByRole('dialog', { name: 'Turn your phone sideways' });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole('button', { name: 'Main Menu' })).toBeFocused();
    // Only the notice is on screen: no HUD, no controls behind it.
    await expect(page.getByTestId('game-controls')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Pause' })).toHaveCount(0);
    expect((await game.state()).status).toBe('paused');
    const pausedAt = (await game.state()).elapsedSeconds;
    await game.advance(3_000);
    expect((await game.state()).elapsedSeconds).toBe(pausedAt);

    await page.setViewportSize(landscape);
    await expect(game.pauseDialog()).toBeVisible();
    await expect(game.pauseDialog()).toContainText('upright');
    await game.pauseDialog().getByRole('button', { name: 'Resume' }).click();
    expect((await game.state()).status).toBe('running');
  });

  test('the compact HUD keeps the arena clear: one ribbon, the pause button, sound in the pause dialog', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'The compact HUD is for phones in landscape');
    const game = new GamePage(page);
    await game.open({ seed: 3, spawnSeconds: 10 });
    await game.startMatch();
    await expect(page.getByRole('button', { name: 'Sound' })).toBeHidden();
    const ribbon = await page.locator('.hud__status').boundingBox();
    const viewport = page.viewportSize();
    if (!ribbon || !viewport) throw new Error('No HUD');
    expect(ribbon.height).toBeLessThan(44);
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(game.pauseDialog().getByRole('button', { name: /Sound: (on|off)/ })).toBeVisible();
  });
});

test.describe('on-screen controls with a keyboard (E2E-09)', () => {
  test('each control lights up while its key is held, and the mouse can use them too', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard controls run on the desktop project');
    const game = new GamePage(page);
    await game.open({ seed: 3, spawnSeconds: 10 });
    await game.startMatch();
    const controls = page.getByTestId('game-controls');
    await expect(controls).toHaveAttribute('data-mode', 'keyboard');
    await expect(page.getByTestId('control-sailForward')).toContainText('W');
    await expect(page.getByTestId('control-fireFront')).toContainText('Space');

    await page.keyboard.down('KeyW');
    await page.keyboard.down('KeyA');
    await expect(page.getByTestId('control-sailForward')).toHaveAttribute('data-held', 'true');
    await expect(page.getByTestId('control-turnLeft')).toHaveAttribute('data-held', 'true');
    await expect(page.getByTestId('control-turnRight')).toHaveAttribute('data-held', 'false');
    await game.advance(500);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('KeyA');
    await expect(page.getByTestId('control-sailForward')).toHaveAttribute('data-held', 'false');

    // Holding the left broadside button with the mouse fires it, exactly like Q.
    const before = (await game.state()).statistics.playerVolleys.left;
    const button = page.getByTestId('control-fireLeft');
    await button.hover();
    await page.mouse.down();
    await expect(button).toHaveAttribute('data-held', 'true');
    await game.advance(200);
    await page.mouse.up();
    await expect(button).toHaveAttribute('data-held', 'false');
    expect((await game.state()).statistics.playerVolleys.left).toBe(before + 1);
    await expect(page.getByTestId('reload-fireLeft')).toBeVisible();
  });
});
