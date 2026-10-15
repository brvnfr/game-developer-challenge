import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

test.describe('match start and movement', () => {
  test('starts a single match with a full HUD and a running clock', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 1, spawnSeconds: 10 });
    await game.startMatch();
    expect(await game.liveRuntimes()).toBe(1);
    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(game.hudTime()).toHaveText('2:00');
    await expect(page.getByTestId('hud-score')).toHaveText('0');
    await game.advance(1000);
    await expect(game.hudTime()).toHaveText('1:59');
    await expect(page.getByTestId('match-status-value')).toHaveText('running');
  });

  test('sails forward along the heading and turns both ways', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 1, spawnSeconds: 10 });
    await game.startMatch();
    const start = (await game.state()).player;

    await game.holdKeys(['KeyW'], 1500);
    const afterForward = (await game.state()).player;
    expect(afterForward.x).toBeGreaterThan(start.x + 50);
    expect(afterForward.y).toBeCloseTo(start.y, 0);

    await game.holdKeys(['KeyD'], 500);
    const afterRight = (await game.state()).player;
    expect(afterRight.heading).toBeGreaterThan(afterForward.heading + 0.5);

    // The rudder has momentum: the first part of the opposite turn only cancels the swing to the right.
    await game.holdKeys(['ArrowLeft'], 1500);
    const afterLeft = (await game.state()).player;
    expect(afterLeft.heading).toBeLessThan(afterRight.heading - 1);
  });

  test('keeps the ship inside the arena and out of the islands', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 1, spawnSeconds: 10 });
    await game.startMatch();
    // Heading east from the start, the central island is straight ahead.
    await page.keyboard.down('KeyW');
    for (let second = 0; second < 6; second++) {
      await game.advance(1000);
      expect(await game.isPlayerHullBlocked()).toBe(false);
    }
    const blockedByIsland = (await game.state()).player;
    expect(blockedByIsland.x).toBeLessThan(768);

    // Turn north and sail into the top edge.
    await page.keyboard.down('KeyA');
    await game.advance(600);
    await page.keyboard.up('KeyA');
    for (let second = 0; second < 6; second++) {
      await game.advance(1000);
      expect(await game.isPlayerHullBlocked()).toBe(false);
    }
    await page.keyboard.up('KeyW');
    const { player } = await game.state();
    expect(player.y).toBeGreaterThan(0);
  });

  test('allows sailing and firing at the same time', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 1, spawnSeconds: 10 });
    await game.startMatch();
    const start = (await game.state()).player;
    await page.keyboard.down('KeyW');
    await page.keyboard.down('Space');
    await game.advance(100);
    const state = await game.state();
    expect(state.projectiles.filter((projectile) => projectile.weaponSlot === 'front')).toHaveLength(1);
    await game.advance(600);
    expect((await game.state()).player.x).toBeGreaterThan(start.x);
  });
});

test.describe('viewport', () => {
  test('fits the canvas to the window on resize without changing the match', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Resizing is exercised on the desktop project');
    const game = new GamePage(page);
    await game.open({ seed: 1, spawnSeconds: 10 });
    await game.startMatch();
    await game.advance(500);
    const before = await game.state();

    for (const size of [
      { width: 900, height: 700 },
      { width: 1600, height: 600 },
    ]) {
      await page.setViewportSize(size);
      await expect
        .poll(async () => page.locator('canvas').evaluate((canvas) => [canvas.clientWidth, canvas.clientHeight]))
        .toEqual([size.width, size.height]);
      const after = await game.state();
      expect(after.arena).toEqual(before.arena);
      expect(after.player.x).toBe(before.player.x);
      expect(after.stepsSimulated).toBe(before.stepsSimulated);
    }
  });
});
