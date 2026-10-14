import { keepPreviousData, useIsMutating, useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/api/contracts';
import type { OutboxState, PendingSubmission } from './MatchOutbox';
import { remoteKeys } from './queryKeys';
import { useRemoteServices } from './remoteServicesContext';

/**
 * One ranking page. Each (configuration, page) has its own cache entry, so a late answer for another page can
 * never replace the page on screen; the previous page stays visible while the next one loads. Showing the tab
 * again always refreshes it in the background.
 */
export function useRankingPage(configKey: string, page: number) {
  const { api } = useRemoteServices();
  return useQuery({
    queryKey: remoteKeys.rankingPage(configKey, page),
    queryFn: ({ signal }) => api.getRanking(configKey, { page, pageSize: DEFAULT_PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}

export function useRankingConfigurations() {
  const { api } = useRemoteServices();
  return useQuery({
    queryKey: remoteKeys.rankingConfigurations(),
    queryFn: ({ signal }) => api.getRankingConfigurations(signal),
    refetchOnMount: 'always',
  });
}

/** One page of the player's match history (same caching rules as the ranking). */
export function useHistoryPage(playerId: string, page: number) {
  const { api } = useRemoteServices();
  return useQuery({
    queryKey: remoteKeys.historyPage(playerId, page),
    queryFn: ({ signal }) => api.getPlayerMatches(playerId, { page, pageSize: DEFAULT_PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}

export function useOutbox(): OutboxState {
  const { outbox } = useRemoteServices();
  return useSyncExternalStore(outbox.subscribe, outbox.getSnapshot);
}

export type SubmissionStatus =
  | { readonly kind: 'saved' }
  | { readonly kind: 'sending' }
  | { readonly kind: 'queued' }
  | { readonly kind: 'retrying'; readonly submission: PendingSubmission }
  | { readonly kind: 'failed'; readonly submission: PendingSubmission }
  | { readonly kind: 'unknown' };

/** Where a completed match is on its way to the Captain's Log. */
export function useSubmissionStatus(matchId: string): SubmissionStatus {
  const outbox = useOutbox();
  const sendingCount = useIsMutating({ mutationKey: remoteKeys.registerMatch(matchId) });
  if (outbox.confirmed.includes(matchId)) return { kind: 'saved' };
  const submission = outbox.pending.find((item) => item.request.matchId === matchId);
  if (!submission) return { kind: 'unknown' };
  if (sendingCount > 0) return { kind: 'sending' };
  if (!submission.lastFailure) return { kind: 'queued' };
  return submission.lastFailure.isRetryable ? { kind: 'retrying', submission } : { kind: 'failed', submission };
}
