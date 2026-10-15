import { expect, type Page } from '@playwright/test';
import type { MatchConfig } from '../../src/game/config/types';
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
  /** Network scenario of the mock API (see README > Network scenarios). Defaults to "success". */
  readonly scenario?: string;
  readonly networkSeed?: number;
  /** Base latency of the mock API in ms. Defaults to 0 so lists load immediately. */
  readonly latencyMs?: number;
  /** Client timeout of the API in ms (test mode only). */
  readonly apiTimeoutMs?: number;
  /** Named starting layout for combat tests (src/testing/combatSetups.ts). */
  readonly setup?: 'open-water' | 'chaser-ahead' | 'shooter-far';
}

export type LogTab = 'Ranking' | 'Match History';

export const STORAGE_KEYS = {
  settings: 'pirate-battle.settings.v1',
  player: 'pirate-battle.player.v1',
  lastResult: 'pirate-battle.last-result.v1',
  mockServer: 'pirate-battle.mock-server.v1',
  outbox: 'pirate-battle.outbox.v1',
  developerTools: 'pirate-battle.dev-tools.v2',
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
    if (options.setup !== undefined) params.set('setup', options.setup);
    if (options.scenario !== undefined) params.set('scenario', options.scenario);
    if (options.networkSeed !== undefined) params.set('networkSeed', String(options.networkSeed));
    params.set('latency', String(options.latencyMs ?? 0));
    if (options.apiTimeoutMs !== undefined) params.set('apiTimeout', String(options.apiTimeoutMs));
    await this.page.goto(`/?${params.toString()}`);
    await this.waitForApp();
  }

  /**
   * The app renders only after the mock API's service worker has started, which is after the page's load event.
   * Waiting for the first screen (and its initial focus) keeps tests from racing the bootstrap.
   */
  async waitForApp(): Promise<void> {
    await this.page.waitForFunction(() => (document.getElementById('root')?.childElementCount ?? 0) > 0);
    await this.page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    );
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

  /** Balancing values of the running match, so assertions follow the configuration instead of copies of it. */
  async config(): Promise<MatchConfig> {
    const config = await this.page.evaluate(() => window.__PIRATE_BATTLE__?.config() ?? null);
    if (!config) throw new Error('No match is running');
    return config;
  }

  /**
   * Advances the manual clock in small chunks until `isDone(state)` holds; returns that state.
   * Fails when it does not happen within `maximumMilliseconds` of game time.
   */
  async advanceUntil(
    isDone: (state: ObservedState) => boolean,
    maximumMilliseconds: number,
    chunkMilliseconds = 50,
  ): Promise<ObservedState> {
    for (let elapsed = 0; elapsed <= maximumMilliseconds; elapsed += chunkMilliseconds) {
      const state = await this.state();
      if (isDone(state)) {
        await this.advance(0); // draw the state the test is about to check
        return state;
      }
      await this.advance(chunkMilliseconds, { shouldDraw: false });
    }
    throw new Error(`Condition not reached within ${maximumMilliseconds} ms of game time`);
  }

  /**
   * Advances game time (manual clock). Rules, input sampling and scene updates run for real; the canvas is drawn
   * at the end. `shouldDraw: false` skips that draw for intermediate steps of long loops: the test browsers draw
   * WebGL in software, and hundreds of queued frames would stall the GPU process for seconds.
   */
  async advance(milliseconds: number, { shouldDraw = true }: { shouldDraw?: boolean } = {}): Promise<void> {
    await this.page.evaluate(([duration, draw]) => window.__PIRATE_BATTLE__?.advanceTime(duration, draw), [
      milliseconds,
      shouldDraw,
    ] as const);
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
    await this.waitForApp();
  }

  /** Advances the manual clock until the match ends (or the time budget runs out). */
  async advanceUntilEnded(maximumMilliseconds: number, chunkMilliseconds = 1_000): Promise<void> {
    for (let elapsed = 0; elapsed < maximumMilliseconds; elapsed += chunkMilliseconds) {
      const isRunning = await this.page.evaluate(() => window.__PIRATE_BATTLE__?.state()?.status === 'running');
      if (!isRunning) break;
      await this.advance(chunkMilliseconds, { shouldDraw: false });
    }
    await this.advance(0); // draw the final state once
  }

  /** Opens the Captain's Log from the main menu on the given tab. */
  async openCaptainsLog(tab: LogTab): Promise<void> {
    await this.page.getByRole('button', { name: tab, exact: true }).click();
    await expect(this.page.getByRole('heading', { name: "Captain's Log" })).toBeVisible();
  }

  rankingList() {
    return this.page.getByTestId('ranking-list');
  }

  historyList() {
    return this.page.getByTestId('history-list');
  }

  registration() {
    return this.page.getByTestId('registration');
  }

  /** Opens Developer tools from the gear button in the corner of the main menu. */
  async openDeveloperTools() {
    await this.page.getByRole('button', { name: 'Developer tools' }).click();
    const dialog = this.page.getByRole('dialog', { name: 'Developer tools' });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  /** Opens Developer tools › Network scenarios on the main menu. */
  async openNetworkScenarios() {
    const tools = await this.openDeveloperTools();
    await tools.getByRole('button', { name: 'Network scenarios' }).click();
    const dialog = this.page.getByRole('dialog', { name: 'Network scenarios' });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  /** Chooses a network scenario in Developer tools › Network scenarios (real UI), then closes both dialogs. */
  async selectNetworkScenario(label: string): Promise<void> {
    const dialog = await this.openNetworkScenarios();
    await dialog.getByLabel('Scenario').selectOption({ label });
    await dialog.getByRole('button', { name: 'Apply' }).click();
    await expect(dialog.getByRole('status')).toContainText('Scenario applied');
    await dialog.getByRole('button', { name: 'Close' }).click();
    await this.page.getByRole('dialog', { name: 'Developer tools' }).getByRole('button', { name: 'Close' }).click();
  }

  /** Matches stored by the mock server with this id (reads its localStorage; the API is not involved). */
  async storedCopiesOf(matchId: string): Promise<number> {
    return this.page.evaluate(
      ({ key, id }) => {
        const raw = window.localStorage.getItem(key);
        const records = raw === null ? [] : (JSON.parse(raw) as { matchId: string }[]);
        return records.filter((record) => record.matchId === id).length;
      },
      { key: STORAGE_KEYS.mockServer, id: matchId },
    );
  }

  async lastResultId(): Promise<string> {
    const id = await this.page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      return raw === null ? null : (JSON.parse(raw) as { matchId: string }).matchId;
    }, STORAGE_KEYS.lastResult);
    if (id === null) throw new Error('No completed match stored');
    return id;
  }

  /** Plays a seeded match where the idle player is sunk (seed 3, spawn 10 s), up to the result screen. */
  async playUntilSunk(): Promise<void> {
    await this.startMatch();
    await this.advanceUntilEnded(180_000);
    await this.advance(2_000);
    await this.waitForResult('Your ship sank');
  }

  hudTime() {
    return this.page.getByTestId('hud-time');
  }

  pauseDialog() {
    return this.page.getByRole('dialog', { name: 'Paused' });
  }
}
