import { z } from 'zod';
import { SeededRandom } from '@/game/core/SeededRandom';
import { LocalStore, type KeyValueStorage } from '@/storage/LocalStore';

export const NETWORK_SCENARIOS = [
  { id: 'success', label: 'Success', description: 'Every request works with a short, normal delay.' },
  { id: 'empty', label: 'Empty lists', description: 'Ranking and Match History come back empty.' },
  { id: 'many-pages', label: 'Many pages', description: 'Extra entries so both lists have several pages.' },
  { id: 'slow', label: 'Slow network', description: 'Every response takes about 2.5 seconds longer.' },
  { id: 'variable-latency', label: 'Variable latency', description: 'Delays vary between 0.1 and 2.5 seconds.' },
  {
    id: 'out-of-order',
    label: 'Out-of-order responses',
    description: 'Odd requests are slow and even ones fast, so older answers arrive after newer ones.',
  },
  { id: 'timeout', label: 'Timeout', description: 'The server never answers; requests time out.' },
  { id: 'network-error', label: 'Connection failure', description: 'Requests fail as if the network were down.' },
  { id: 'http-4xx', label: 'HTTP 400', description: 'The server rejects every request with 400 Bad Request.' },
  { id: 'http-5xx', label: 'HTTP 503', description: 'The server answers every request with 503 Unavailable.' },
  { id: 'ranking-fail', label: 'Ranking fails', description: 'Only the ranking request fails (500).' },
  { id: 'history-fail', label: 'History fails', description: 'Only the Match History request fails (500).' },
  {
    id: 'register-timeout-after-commit',
    label: 'Timeout after saving',
    description: 'The first save of each match is stored but its answer never arrives; a retry gets the stored record.',
  },
  {
    id: 'unavailable-then-recover',
    label: 'Unavailable, then recovers',
    description: 'The first three requests to each endpoint fail with 503, later ones work.',
  },
] as const;

export type NetworkScenarioId = (typeof NETWORK_SCENARIOS)[number]['id'];
export type MockEndpoint = 'ranking' | 'configurations' | 'history' | 'register';

export const DEFAULT_SCENARIO_ID: NetworkScenarioId = 'success';
export const DEFAULT_NETWORK_SEED = 1;
export const DEFAULT_BASE_LATENCY_MS = 300;

const SCENARIO_IDS = NETWORK_SCENARIOS.map((scenario) => scenario.id) as [NetworkScenarioId, ...NetworkScenarioId[]];
const scenarioIdSchema = z.enum(SCENARIO_IDS);

export function isNetworkScenarioId(value: unknown): value is NetworkScenarioId {
  return scenarioIdSchema.safeParse(value).success;
}

/** What the mock server should do with one request. */
export type MockFault =
  | { readonly kind: 'status'; readonly status: number; readonly code: string; readonly message: string }
  | { readonly kind: 'networkError' }
  | { readonly kind: 'noAnswer' };

export interface ResponsePlan {
  readonly delayMs: number;
  /** Applied after the delay; `null` answers normally. */
  readonly fault: MockFault | null;
  /** For a save: store the match first, then apply the fault (the "timeout after saving" case). */
  readonly appliesFaultAfterCommit: boolean;
  readonly listMode: 'normal' | 'empty' | 'many';
}

export interface ScenarioSettings {
  readonly scenarioId: NetworkScenarioId;
  /** Seeds the latency jitter, so a scenario behaves the same on every run. */
  readonly seed: number;
  /** Normal delay of a response; jitter of ±50 % is added. 0 in fast automated runs. */
  readonly baseLatencyMs: number;
}

export const DEFAULT_SCENARIO_SETTINGS: ScenarioSettings = {
  scenarioId: DEFAULT_SCENARIO_ID,
  seed: DEFAULT_NETWORK_SEED,
  baseLatencyMs: DEFAULT_BASE_LATENCY_MS,
};

const settingsSchema = z.object({
  scenarioId: scenarioIdSchema,
  seed: z.number().int(),
  baseLatencyMs: z.number().min(0).max(10_000),
});

export const SCENARIO_SETTINGS_KEY = 'pirate-battle.network.v1';

const SLOW_EXTRA_MS = 2_500;
const OUT_OF_ORDER_SLOW_MS = 2_000;
const OUT_OF_ORDER_FAST_MS = 150;
const RECOVERY_FAILURES = 3;

const SERVER_ERROR: MockFault = {
  kind: 'status',
  status: 500,
  code: 'internal_error',
  message: 'Internal server error.',
};
const UNAVAILABLE: MockFault = {
  kind: 'status',
  status: 503,
  code: 'unavailable',
  message: 'The service is temporarily unavailable.',
};
const BAD_REQUEST: MockFault = { kind: 'status', status: 400, code: 'bad_request', message: 'The request is invalid.' };

/**
 * The selected network scenario and its reproducible behaviour (seeded jitter, per-endpoint request counters).
 * Selecting a scenario, or resetting, restarts the counters and the random sequence.
 */
export class ScenarioController {
  private readonly store: LocalStore<ScenarioSettings>;
  private current: ScenarioSettings;
  private random: SeededRandom;
  private requestCounts = new Map<MockEndpoint, number>();
  private readonly firstSaveAttempts = new Set<string>();

  constructor(storage: KeyValueStorage | null, overrides: Partial<ScenarioSettings> = {}) {
    this.store = new LocalStore(SCENARIO_SETTINGS_KEY, settingsSchema, storage);
    this.current = { ...DEFAULT_SCENARIO_SETTINGS, ...(this.store.read() ?? {}), ...overrides };
    if (Object.keys(overrides).length > 0) this.store.write(this.current);
    this.random = new SeededRandom(this.current.seed);
  }

  get settings(): ScenarioSettings {
    return this.current;
  }

  select(changes: Partial<ScenarioSettings>): void {
    this.current = { ...this.current, ...changes };
    this.store.write(this.current);
    this.restart();
  }

  /** Back to the default scenario. */
  reset(): void {
    this.current = DEFAULT_SCENARIO_SETTINGS;
    this.store.write(this.current);
    this.restart();
  }

  /** Decides delay and outcome of one request. `matchId` identifies saves. */
  plan(endpoint: MockEndpoint, matchId?: string): ResponsePlan {
    const requestNumber = (this.requestCounts.get(endpoint) ?? 0) + 1;
    this.requestCounts.set(endpoint, requestNumber);
    const normalDelay = this.jitter(this.current.baseLatencyMs);
    const isList = endpoint === 'ranking' || endpoint === 'history';
    const plan = (delayMs: number, fault: MockFault | null = null, overrides: Partial<ResponsePlan> = {}) => ({
      delayMs,
      fault,
      appliesFaultAfterCommit: false,
      listMode: 'normal' as const,
      ...overrides,
    });

    switch (this.current.scenarioId) {
      case 'success':
        return plan(normalDelay);
      case 'empty':
        return plan(normalDelay, null, { listMode: isList ? 'empty' : 'normal' });
      case 'many-pages':
        return plan(normalDelay, null, { listMode: isList ? 'many' : 'normal' });
      case 'slow':
        return plan(normalDelay + SLOW_EXTRA_MS);
      case 'variable-latency':
        return plan(Math.round(this.random.between(100, 2_500)));
      case 'out-of-order':
        return plan(requestNumber % 2 === 1 ? OUT_OF_ORDER_SLOW_MS : OUT_OF_ORDER_FAST_MS);
      case 'timeout':
        return plan(normalDelay, { kind: 'noAnswer' });
      case 'network-error':
        return plan(normalDelay, { kind: 'networkError' });
      case 'http-4xx':
        return plan(normalDelay, BAD_REQUEST);
      case 'http-5xx':
        return plan(normalDelay, UNAVAILABLE);
      case 'ranking-fail':
        return plan(normalDelay, endpoint === 'ranking' ? SERVER_ERROR : null);
      case 'history-fail':
        return plan(normalDelay, endpoint === 'history' ? SERVER_ERROR : null);
      case 'register-timeout-after-commit': {
        if (endpoint !== 'register' || matchId === undefined || this.firstSaveAttempts.has(matchId)) {
          return plan(normalDelay);
        }
        this.firstSaveAttempts.add(matchId);
        return plan(normalDelay, { kind: 'noAnswer' }, { appliesFaultAfterCommit: true });
      }
      case 'unavailable-then-recover':
        return plan(normalDelay, requestNumber <= RECOVERY_FAILURES ? UNAVAILABLE : null);
    }
  }

  private jitter(baseMs: number): number {
    return Math.round(baseMs * this.random.between(0.5, 1.5));
  }

  private restart(): void {
    this.random = new SeededRandom(this.current.seed);
    this.requestCounts = new Map();
    this.firstSaveAttempts.clear();
  }
}
