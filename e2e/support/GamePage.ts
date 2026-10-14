import { expect, type Page } from '@playwright/test';
import type { ObservedState } from '../../src/testing/TestHarness';

export interface GameUrlOptions {
  readonly seed?: number;
  readonly sessionSeconds?: number;
  readonly spawnSeconds?: number;
  readonly manualTime?: boolean;
  readonly touch?: boolean;
}

/** Page object for the game: navigation, real input and read-only observation through the test harness. */
export class GamePage {
  constructor(readonly page: Page) {}

  async open(options: GameUrlOptions = {}): Promise<void> {
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

  hudTime() {
    return this.page.getByTestId('hud-time');
  }

  pauseDialog() {
    return this.page.getByRole('dialog', { name: 'Paused' });
  }
}
