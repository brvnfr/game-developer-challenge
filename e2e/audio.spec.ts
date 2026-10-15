import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

const playedSounds = (page: Page) => page.evaluate(() => window.__PIRATE_BATTLE__?.audio().played ?? []);

test.describe('sound', () => {
  test('sounds follow the game, stop when muted, and the choice is remembered', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ setup: 'open-water', seed: 1, spawnSeconds: 10 });
    expect(await page.evaluate(() => window.__PIRATE_BATTLE__?.audio().isUnlocked)).toBe(false); // no autoplay

    await game.startMatch(); // the click on Play is the gesture that unlocks audio
    await page.evaluate(() => window.__PIRATE_BATTLE__?.whenAudioLoaded());
    expect((await page.evaluate(() => window.__PIRATE_BATTLE__?.audio()))?.loadedSounds).toBeGreaterThan(20);

    await game.holdKeys(['Space'], 100);
    await game.advance(100);
    let played = await playedSounds(page);
    expect(played.some((sound) => sound.startsWith('cannon_fire_'))).toBe(true);
    expect(played).toContain('ocean_ambience_loop');

    // The pause dialog has the sound toggle on every screen (compact HUDs leave the round HUD toggle out).
    await page.keyboard.press('Escape');
    await game.pauseDialog().getByRole('button', { name: 'Sound: on' }).click();
    await expect(game.pauseDialog().getByRole('button', { name: 'Sound: off' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await game.pauseDialog().getByRole('button', { name: 'Resume' }).click();
    const countWhenMuted = (await playedSounds(page)).length;
    await game.holdKeys(['Space', 'KeyQ'], 1_000);
    played = await playedSounds(page);
    expect(played.length).toBe(countWhenMuted);

    await game.reload();
    await page.getByRole('button', { name: 'Options' }).click();
    await expect(page.getByRole('button', { name: 'Sound: off' })).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Sound: off' }).click();
    await expect(page.getByRole('button', { name: 'Sound: on' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('pausing silences the loops until the player resumes', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ setup: 'open-water', seed: 1, spawnSeconds: 10 });
    await game.startMatch();
    await page.evaluate(() => window.__PIRATE_BATTLE__?.whenAudioLoaded());
    await game.advance(200);
    await page.keyboard.press('Escape');
    await game.advance(200);
    const afterPause = await playedSounds(page);
    expect(afterPause.at(-1)).toBe('game_pause');
    await game.pauseDialog().getByRole('button', { name: 'Resume' }).click();
    await game.advance(200);
    const afterResume = await playedSounds(page);
    expect(afterResume.slice(afterPause.length)).toEqual(
      expect.arrayContaining(['game_resume', 'ocean_ambience_loop']),
    );
  });
});
