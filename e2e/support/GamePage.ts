import { expect, type Page } from '@playwright/test';
import type { ObservedState } from '../../src/testing/TestHarness';

export interface GameUrlOptions {
  readonly seed?: number;
  readonly sessionSeconds?: number;
  readonly spawnSeconds?: number;
  readonly manualTime?: boolean;
  readonly touch?: boolean;
  /**
   * Captain name stored before the app loads, so Play starts the match directly. `null` keeps a first-time
   * player (Play then asks for a name). Defaults to "Test Captain".
   */
  readonly captainName?: string | null;
}

export const STORAGE_KEYS = {
  settings: 'pirate-battle.settings.v1',
  player: 'pirate-battle.player.v1',
  lastResult: 'pirate-battle.last-result.v1',
} as const;

/** Page object for the game: navigation, real input and read-only observation through the test harness. */
export class GamePage {
  private isProfileSeeded = false;

  constructor(readonly page: Page) {}

  async open(options: GameUrlOptions = {}): Promise<void> {
    const captainName = options.captainName === undefined ? 'Test Captain' : options.captainName;
    if (captainName !== null && !this.isProfileSeeded) {
      this.isProfileSeeded = true;
      // Runs before every page load but only fills an empty slot, so later renames and refreshes are kept.
      await this.page.addInitScript(
        ({ key, name }) => {
          if (window.localStorage.getItem(key) === null) {
            window.localStorage.setItem(key, JSON.stringify({ playerId: 'player-test', name, hasChosenName: true }));
          }
        },
        { key: STORAGE_KEYS.player, name: captainName },
      );
    }
    const params = new URLSearchParams({ test: '1' });
    if (options.seed !== undefined) params.set('seed', String(options.seed));
    if (options.sessionSeconds !== undefined) params.set('session', String(options.sessionSeconds));
    if (options.spawnSeconds !== undefined) params.set('spawn', String(options.spawnSeconds));
    if (options.manualTime ?? true) params.set('time', 'manual');
    if (options.touch) params.set('touch', '1');
    await this.page.goto(`/?${params.toString()}`);
  }

  async startMatch(): Promise<void> {
    await this.page.getByRole('button', { name: 'Play' }).click();
    await this.waitForMatch();
  }

  async waitForMatch(): Promise<void> {
    // Starting WebGL in software can take a while on slow or busy machines.
    await expect(this.page.getByTestId('game-canvas')).toBeVisible({ timeout: 20_000 });
    await this.page.waitForFunction(() => window.__PIRATE_BATTLE__?.state()?.status === 'running');
  }

  async state(): Promise<ObservedState> {
    const state = await this.page.evaluate(() => window.__PIRATE_BATTLE__?.state() ?? null);
    if (!state) throw new Error('No match is running');
    return state;
  }

  /** Advances game time (manual clock). Rendering, input sampling and rules run for real. */
  async advance(milliseconds: number): Promise<void> {
    await this.page.evaluate((duration) => window.__PIRATE_BATTLE__?.advanceTime(duration), milliseconds);
  }

  async holdKeys(keys: readonly string[], milliseconds: number): Promise<void> {
    for (const key of keys) await this.page.keyboard.down(key);
    await this.advance(milliseconds);
    for (const key of keys) await this.page.keyboard.up(key);
  }

  async liveRuntimes(): Promise<number> {
    return this.page.evaluate(() => window.__PIRATE_BATTLE__?.liveRuntimes() ?? 0);
  }

  async isPlayerHullBlocked(): Promise<boolean> {
    return this.page.evaluate(() => window.__PIRATE_BATTLE__?.isPlayerHullBlocked() ?? false);
  }

  /**
   * Waits for the result screen. Leaving the match tears down the WebGL context first, which can take a few
   * seconds when WebGL runs in software on a busy machine.
   */
  async waitForResult(title: 'Battle complete' | 'Your ship sank'): Promise<void> {
    await expect(this.page.getByRole('heading', { name: title })).toBeVisible({ timeout: 20_000 });
  }

  /** Reloads the page keeping the same URL (and therefore the same test-mode options). */
  async reload(): Promise<void> {
    await this.page.reload();
  }

  /** Advances the manual clock until the match ends (or the time budget runs out). */
  async advanceUntilEnded(maximumMilliseconds: number, chunkMilliseconds = 1_000): Promise<void> {
    for (let elapsed = 0; elapsed < maximumMilliseconds; elapsed += chunkMilliseconds) {
      const isRunning = await this.page.evaluate(() => window.__PIRATE_BATTLE__?.state()?.status === 'running');
      if (!isRunning) return;
      await this.advance(chunkMilliseconds);
    }
  }

  hudTime() {
    return this.page.getByTestId('hud-time');
  }

  pauseDialog() {
    return this.page.getByRole('dialog', { name: 'Paused' });
  }
}
