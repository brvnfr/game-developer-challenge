import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

/** Angle difference folded into [0, π]. */
const angleBetween = (first: number, second: number) =>
  Math.abs(Math.atan2(Math.sin(first - second), Math.cos(first - second)));

test.describe('player weapons, damage and score (E2E-04)', () => {
  test('the front cannon fires one cannonball straight ahead', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ setup: 'open-water', seed: 1, spawnSeconds: 10 });
    await game.startMatch();
    await game.holdKeys(['Space'], 100);

    const state = await game.state();
    const shots = state.projectiles.filter((projectile) => projectile.faction === 'player');
    expect(state.statistics.playerVolleys.front).toBe(1);
    expect(shots).toHaveLength(1);
    expect(angleBetween(shots[0]?.heading ?? NaN, state.player.heading)).toBeLessThan(0.01);
    expect(shots[0]?.x).toBeGreaterThan(state.player.x); // facing east: ahead is +x
  });

  test('each broadside fires three parallel cannonballs from its own side', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ setup: 'open-water', seed: 1, spawnSeconds: 10 });
    await game.startMatch();

    await game.holdKeys(['KeyQ'], 100); // left (port) = north when facing east
    let state = await game.state();
    const left = state.projectiles.filter((projectile) => projectile.weaponSlot === 'left');
    expect(left).toHaveLength(3);
    for (const shot of left) {
      expect(angleBetween(shot.heading, state.player.heading - Math.PI / 2)).toBeLessThan(0.01);
      expect(shot.y).toBeLessThan(state.player.y);
    }
    const leftOffsets = left.map((shot) => Math.round(shot.x - state.player.x)).sort((first, second) => first - second);
    expect(new Set(leftOffsets).size).toBe(3); // three parallel lines along the hull

    await game.advance(2_000); // let them fly away
    await game.holdKeys(['KeyE'], 100); // right (starboard) = south
    state = await game.state();
    const right = state.projectiles.filter((projectile) => projectile.weaponSlot === 'right');
    expect(right).toHaveLength(3);
    for (const shot of right) {
      expect(angleBetween(shot.heading, state.player.heading + Math.PI / 2)).toBeLessThan(0.01);
      expect(shot.y).toBeGreaterThan(state.player.y);
    }
    expect(state.statistics.playerVolleys).toEqual({ front: 0, left: 1, right: 1 });
  });

  test('holding a trigger fires once per cooldown', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ setup: 'open-water', seed: 1, spawnSeconds: 10 });
    await game.startMatch();
    const config = await game.config();

    await game.holdKeys(['Space'], 2_000);
    const expectedFront = Math.floor(2 / config.player.frontCannon.cooldownSeconds) + 1;
    expect((await game.state()).statistics.playerVolleys.front).toBe(expectedFront);

    await game.holdKeys(['KeyQ'], 3_000);
    const expectedLeft = Math.floor(3 / config.player.broadside.cooldownSeconds) + 1;
    const { statistics } = await game.state();
    expect(statistics.playerVolleys.left).toBe(expectedLeft);
    expect(statistics.playerProjectilesFired).toBe(
      expectedFront + expectedLeft * config.player.broadside.projectileCount,
    );
  });

  test('a hit damages the enemy once and removes the cannonball; a kill scores exactly one point', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ setup: 'chaser-ahead', seed: 1, spawnSeconds: 10 });
    await game.startMatch();
    const config = await game.config();
    const maxHealth = config.chaser.maxHealth;

    await game.holdKeys(['Space'], 50);
    const afterHit = await game.advanceUntil((state) => state.statistics.hitsOnEnemies === 1, 1_500);
    const chaser = afterHit.enemies[0];
    expect(chaser?.health).toBe(maxHealth - config.player.frontCannon.damage);
    expect(afterHit.projectiles.filter((projectile) => projectile.faction === 'player')).toHaveLength(0);

    await game.advance(300);
    expect((await game.state()).enemies[0]?.health).toBe(maxHealth - config.player.frontCannon.damage);

    await game.holdKeys(['Space'], 50);
    const afterKill = await game.advanceUntil((state) => state.enemies.length === 0, 1_500);
    expect(afterKill.score).toBe(1);
    expect(afterKill.statistics.enemiesDestroyedByPlayer).toBe(1);
    expect(afterKill.statistics.hitsOnEnemies).toBe(2);
    await expect(page.getByTestId('hud-score')).toHaveText('1');

    await game.advance(1_000);
    expect((await game.state()).score).toBe(1);
  });
});
