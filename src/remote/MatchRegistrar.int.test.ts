import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegisterMatchRequest } from '@/api/contracts';
import { createTestMockServer, TEST_API_BASE_URL } from '@/mocks/node';
import { MemoryStorage } from '@/storage/LocalStore';
import { MatchOutbox } from './MatchOutbox';
import { createQueryClient } from './queryClient';
import { remoteKeys } from './queryKeys';
import { createRemoteServices, type RemoteServices } from './RemoteServices';

const { mockServer, network } = createTestMockServer();
let saveRequests = 0;
network.events.on('request:start', ({ request }) => {
  if (request.method === 'PUT') saveRequests++;
});

const MATCH: RegisterMatchRequest = {
  matchId: 'match-registrar-1',
  playerId: 'player-registrar',
  playerName: 'Grace',
  endedAt: '2026-10-14T11:00:00.000Z',
  score: 7,
  durationMs: 61_000,
  endReason: 'playerDestroyed',
  settings: { sessionTimeSeconds: 120, spawnIntervalSeconds: 3 },
};

let storage: MemoryStorage;
let services: RemoteServices;

function createServices(): RemoteServices {
  return createRemoteServices({
    baseUrl: TEST_API_BASE_URL,
    timeoutMs: 200,
    storage,
    queryClient: createQueryClient({ retryDelay: () => 10 }),
    roundDelaysMs: [50, 50],
  });
}

function storedCopies(matchId: string): number {
  return mockServer.database
    .history(MATCH.playerId, { page: 1, pageSize: 50 })
    .items.filter((record) => record.matchId === matchId).length;
}

beforeAll(() => network.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  storage = new MemoryStorage();
  services = createServices();
  services.registrar.start();
  saveRequests = 0;
});
afterEach(() => {
  services.registrar.stop();
  services.queryClient.clear();
  mockServer.resetAll();
  mockServer.scenarios.select({ baseLatencyMs: 0 });
});
afterAll(() => network.close());

describe('MatchRegistrar (TanStack Query mutation + persistent outbox + MSW)', () => {
  it('stores the match, confirms it and invalidates the lists', async () => {
    const invalidate = vi.spyOn(services.queryClient, 'invalidateQueries');
    services.registrar.register(MATCH);
    expect(services.outbox.find(MATCH.matchId)).toBeDefined(); // written before the request completes
    await vi.waitFor(() => expect(services.outbox.isConfirmed(MATCH.matchId)).toBe(true));
    expect(services.outbox.getSnapshot().pending).toHaveLength(0);
    expect(storedCopies(MATCH.matchId)).toBe(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: remoteKeys.all });
  });

  it('keeps the match pending while the server is unavailable and saves it once it recovers', async () => {
    mockServer.scenarios.select({ scenarioId: 'unavailable-then-recover' });
    services.registrar.register(MATCH);
    await vi.waitFor(() => expect(services.outbox.find(MATCH.matchId)?.lastFailure?.isRetryable).toBe(true));
    await vi.waitFor(() => expect(services.outbox.isConfirmed(MATCH.matchId)).toBe(true));
    expect(storedCopies(MATCH.matchId)).toBe(1);
  });

  it('recovers from a timeout after the server stored the match, without a duplicate', async () => {
    mockServer.scenarios.select({ scenarioId: 'register-timeout-after-commit' });
    services.registrar.register(MATCH);
    await vi.waitFor(() => expect(services.outbox.isConfirmed(MATCH.matchId)).toBe(true));
    expect(saveRequests).toBeGreaterThanOrEqual(2);
    expect(storedCopies(MATCH.matchId)).toBe(1);
  });

  it('sends one request at a time however often Retry is pressed', async () => {
    mockServer.scenarios.select({ scenarioId: 'success', baseLatencyMs: 100 });
    services.registrar.register(MATCH);
    for (let press = 0; press < 5; press++) services.registrar.retry(MATCH.matchId);
    services.registrar.retryAll();
    await vi.waitFor(() => expect(services.outbox.isConfirmed(MATCH.matchId)).toBe(true));
    expect(saveRequests).toBe(1);
    services.registrar.register(MATCH); // the same match again after confirmation
    expect(saveRequests).toBe(1);
  });

  it('does not retry automatically after a client error, but Retry can still be pressed', async () => {
    mockServer.scenarios.select({ scenarioId: 'http-4xx' });
    services.registrar.register(MATCH);
    await vi.waitFor(() => expect(services.outbox.find(MATCH.matchId)?.lastFailure?.isRetryable).toBe(false));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(saveRequests).toBe(1);
    mockServer.scenarios.select({ scenarioId: 'success' });
    services.registrar.retry(MATCH.matchId);
    await vi.waitFor(() => expect(services.outbox.isConfirmed(MATCH.matchId)).toBe(true));
  });

  it('a pending match survives a refresh and is sent when the app starts again', async () => {
    mockServer.scenarios.select({ scenarioId: 'network-error' });
    services.registrar.register(MATCH);
    await vi.waitFor(() => expect(services.outbox.find(MATCH.matchId)?.attempts).toBe(1));
    services.registrar.stop();

    mockServer.scenarios.select({ scenarioId: 'success' });
    expect(new MatchOutbox(storage).find(MATCH.matchId)).toBeDefined();
    const afterRefresh = createServices();
    afterRefresh.registrar.start();
    await vi.waitFor(() => expect(afterRefresh.outbox.isConfirmed(MATCH.matchId)).toBe(true));
    afterRefresh.registrar.stop();
    expect(storedCopies(MATCH.matchId)).toBe(1);
  });
});
