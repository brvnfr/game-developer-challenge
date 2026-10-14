import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ApiError } from '@/api/ApiError';
import type { RegisterMatchRequest } from '@/api/contracts';
import { PirateBattleApi } from '@/api/PirateBattleApi';
import { createTestMockServer, TEST_API_BASE_URL } from './node';

const { mockServer, network } = createTestMockServer();
const api = new PirateBattleApi({ baseUrl: TEST_API_BASE_URL, timeoutMs: 300 });

const MATCH: RegisterMatchRequest = {
  matchId: 'match-int-1',
  playerId: 'player-int',
  playerName: 'Mary Read',
  endedAt: '2026-10-14T11:59:00.000Z',
  score: 12,
  durationMs: 120_000,
  endReason: 'timeUp',
  settings: { sessionTimeSeconds: 120, spawnIntervalSeconds: 3 },
};

async function expectApiError(promise: Promise<unknown>): Promise<ApiError> {
  const error: unknown = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

beforeAll(() => network.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  mockServer.resetAll();
  mockServer.scenarios.select({ baseLatencyMs: 0 });
});
afterAll(() => network.close());

describe('API client against the mock server (Axios + MSW)', () => {
  it('reads paginated, validated ranking pages and the configurations', async () => {
    const firstPage = await api.getRanking('s120-i3', { page: 1, pageSize: 5 });
    const lastPage = await api.getRanking('s120-i3', { page: 3, pageSize: 5 });
    expect(firstPage).toMatchObject({ page: 1, totalPages: 3, totalItems: 13 });
    expect(lastPage.items.map((entry) => entry.rank)).toEqual([11, 12, 13]);
    const configurations = await api.getRankingConfigurations();
    expect(configurations.items.map((item) => item.configKey)).toContain('s60-i3');
  });

  it('registers a match idempotently and shows it in history and ranking', async () => {
    const created = await api.registerMatch(MATCH);
    const again = await api.registerMatch(MATCH);
    expect(again).toEqual(created);
    const history = await api.getPlayerMatches(MATCH.playerId, { page: 1, pageSize: 5 });
    expect(history.items.map((record) => record.matchId)).toEqual([MATCH.matchId]);
    const ranking = await api.getRanking('s120-i3', { page: 1, pageSize: 50 });
    expect(ranking.items.filter((entry) => entry.matchId === MATCH.matchId)).toHaveLength(1);
  });

  it('rejects invalid requests with 400 and conflicting matches with 409, without retry', async () => {
    const badPage = await expectApiError(api.getRanking('nonsense', { page: 1, pageSize: 5 }));
    expect(badPage).toMatchObject({ kind: 'http', status: 400 });
    await api.registerMatch(MATCH);
    const conflict = await expectApiError(api.registerMatch({ ...MATCH, score: 99 }));
    expect(conflict).toMatchObject({ kind: 'http', status: 409, code: 'conflict' });
    expect(conflict.isRetryable).toBe(false);
  });

  it.each([
    ['timeout', 'timeout', null],
    ['network-error', 'network', null],
    ['http-5xx', 'http', 503],
    ['http-4xx', 'http', 400],
  ] as const)('scenario %s fails requests as %s', async (scenarioId, kind, status) => {
    mockServer.scenarios.select({ scenarioId });
    const error = await expectApiError(api.getPlayerMatches('player-int', { page: 1, pageSize: 5 }));
    expect(error.kind).toBe(kind);
    expect(error.status).toBe(status);
  });

  it('empty and many-pages change the lists without touching the stored matches', async () => {
    mockServer.scenarios.select({ scenarioId: 'empty' });
    expect((await api.getRanking('s120-i3', { page: 1, pageSize: 5 })).totalItems).toBe(0);
    mockServer.scenarios.select({ scenarioId: 'many-pages' });
    expect((await api.getPlayerMatches('player-int', { page: 1, pageSize: 5 })).totalPages).toBeGreaterThan(3);
    expect((await api.getRanking('s120-i3', { page: 1, pageSize: 5 })).totalPages).toBeGreaterThan(8);
    mockServer.scenarios.select({ scenarioId: 'success' });
    expect((await api.getPlayerMatches('player-int', { page: 1, pageSize: 5 })).totalItems).toBe(0);
  });

  it('a timeout after saving is recovered by retrying, with exactly one stored record', async () => {
    mockServer.scenarios.select({ scenarioId: 'register-timeout-after-commit' });
    const countBefore = mockServer.database.count();
    const timedOut = await expectApiError(api.registerMatch(MATCH));
    expect(timedOut.kind).toBe('timeout');
    expect(mockServer.database.count()).toBe(countBefore + 1);
    const recovered = await api.registerMatch(MATCH);
    expect(recovered.matchId).toBe(MATCH.matchId);
    expect(mockServer.database.count()).toBe(countBefore + 1);
  });

  it('only the ranking fails in ranking-fail', async () => {
    mockServer.scenarios.select({ scenarioId: 'ranking-fail' });
    expect((await expectApiError(api.getRanking('s120-i3', { page: 1, pageSize: 5 }))).status).toBe(500);
    await expect(api.getPlayerMatches('player-int', { page: 1, pageSize: 5 })).resolves.toBeTruthy();
  });

  it('cancels a request through its AbortSignal', async () => {
    mockServer.scenarios.select({ scenarioId: 'slow' });
    const controller = new AbortController();
    const pending = api.getRanking('s120-i3', { page: 1, pageSize: 5 }, controller.signal);
    controller.abort();
    expect((await expectApiError(pending)).kind).toBe('cancelled');
  });
});
