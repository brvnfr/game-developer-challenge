import type { MatchRecord, MatchSettings } from '@/api/contracts';
import type { KeyValueStorage } from '@/storage/LocalStore';
import { createDemoHistory, createDemoRanking } from './fixtures';
import { MockDatabase } from './MockDatabase';
import { ScenarioController, type ScenarioSettings } from './scenarios';

export interface MockServerOptions {
  readonly storage: KeyValueStorage | null;
  /** Scenario settings forced at start (URL parameters, tests). */
  readonly scenarioOverrides?: Partial<ScenarioSettings>;
  readonly now?: () => Date;
  /** How long a request "with no answer" stays open; longer than any client timeout. */
  readonly noAnswerDelayMs?: number;
}

const DEMO_HISTORY_COUNT = 24;
const DEMO_RANKING_COUNT = 40;

/** State of the simulated backend: the stored matches and the selected network scenario. */
export class MockServer {
  readonly database: MockDatabase;
  readonly scenarios: ScenarioController;
  readonly noAnswerDelayMs: number;

  constructor(options: MockServerOptions) {
    this.database = new MockDatabase(options.storage, options.now);
    this.scenarios = new ScenarioController(options.storage, options.scenarioOverrides);
    this.noAnswerDelayMs = options.noAnswerDelayMs ?? 60_000;
  }

  /** Restores the initial state: fixtures only and the default scenario. */
  resetAll(): void {
    this.database.reset();
    this.scenarios.reset();
  }

  /** Extra matches shown by the "many pages" scenario (never stored). */
  demoHistory(playerId: string, playerName: string): MatchRecord[] {
    return createDemoHistory({ playerId, playerName }, DEMO_HISTORY_COUNT, this.scenarios.settings.seed);
  }

  demoRanking(settings: MatchSettings): MatchRecord[] {
    return createDemoRanking(settings, DEMO_RANKING_COUNT, this.scenarios.settings.seed);
  }
}
