import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createTestMockServer, TEST_API_BASE_URL } from '@/mocks/node';
import { MemoryStorage } from '@/storage/LocalStore';
import { useHistoryPage, useRankingPage, useSubmissionStatus } from './hooks';
import { createQueryClient } from './queryClient';
import { createRemoteServices, type RemoteServices } from './RemoteServices';
import { RemoteServicesProvider } from './RemoteServicesProvider';

const { mockServer, network } = createTestMockServer();

function setup() {
  const services = createRemoteServices({
    baseUrl: TEST_API_BASE_URL,
    timeoutMs: 3_000,
    storage: new MemoryStorage(),
    queryClient: createQueryClient({ retryDelay: () => 10 }),
    roundDelaysMs: [50],
  });
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <RemoteServicesProvider services={services}>{children}</RemoteServicesProvider>
  );
  return { services, wrapper };
}

let current: RemoteServices | null = null;
beforeAll(() => network.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  current?.queryClient.clear();
  mockServer.resetAll();
  mockServer.scenarios.select({ baseLatencyMs: 0 });
});
afterAll(() => network.close());

describe('ranking and history queries', () => {
  it('a late answer for page 1 never replaces page 2 on screen: the obsolete request is aborted', async () => {
    const { services, wrapper } = setup();
    current = services;
    mockServer.scenarios.select({ scenarioId: 'out-of-order' }); // request 1 slow, request 2 fast
    const { result, rerender } = renderHook(({ page }) => useRankingPage('s120-i3', page), {
      wrapper,
      initialProps: { page: 1 },
    });
    rerender({ page: 2 });
    await waitFor(() => expect(result.current.data?.page).toBe(2));
    expect(result.current.isPlaceholderData).toBe(false);
    // Page 1 lost its only observer, so its request was aborted (AbortSignal) and its late answer is dropped.
    await new Promise((resolve) => setTimeout(resolve, 2_300));
    expect(services.queryClient.getQueryData(['remote', 'ranking', 's120-i3', 1])).toBeUndefined();
    expect(result.current.data?.page).toBe(2);
    expect(result.current.data?.items[0]?.rank).toBe(6);
  });

  it('keeps the previous page visible while the next one loads', async () => {
    const { services, wrapper } = setup();
    current = services;
    const { result, rerender } = renderHook(({ page }) => useRankingPage('s120-i3', page), {
      wrapper,
      initialProps: { page: 1 },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    mockServer.scenarios.select({ scenarioId: 'slow', baseLatencyMs: 0 });
    rerender({ page: 2 });
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.page).toBe(1);
    await waitFor(() => expect(result.current.data?.page).toBe(2), { timeout: 5_000 });
  });

  it('retries a failing list and then reports the error', async () => {
    const { services, wrapper } = setup();
    current = services;
    mockServer.scenarios.select({ scenarioId: 'history-fail' });
    const { result } = renderHook(() => useHistoryPage('player-x', 1), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.failureCount).toBe(3);
  });

  it('registering a match refreshes the history on screen and reports Saved', async () => {
    const { services, wrapper } = setup();
    current = services;
    const { result } = renderHook(
      () => ({ history: useHistoryPage('player-y', 1), status: useSubmissionStatus('match-y') }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.history.data?.totalItems).toBe(0));
    expect(result.current.status.kind).toBe('unknown');
    act(() => {
      services.registrar.register({
        matchId: 'match-y',
        playerId: 'player-y',
        playerName: 'Yara',
        endedAt: '2026-10-14T10:00:00.000Z',
        score: 4,
        durationMs: 120_000,
        endReason: 'timeUp',
        settings: { sessionTimeSeconds: 120, spawnIntervalSeconds: 3 },
      });
    });
    await waitFor(() => expect(result.current.status.kind).toBe('saved'));
    await waitFor(() => expect(result.current.history.data?.totalItems).toBe(1));
  });
});
