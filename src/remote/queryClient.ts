import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/ApiError';

/** Attempts after the first one, for retryable failures only (timeouts, network, 5xx). 4xx is never retried. */
export const RETRY_LIMIT = 2;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < RETRY_LIMIT && ApiError.from(error).isRetryable;
}

/** Exponential backoff: 0.5 s, 1 s, 2 s … capped at 4 s. */
export function retryDelayMs(attemptIndex: number): number {
  return Math.min(500 * 2 ** attemptIndex, 4_000);
}

interface QueryClientOptions {
  readonly retryDelay?: (attemptIndex: number) => number;
}

/**
 * Remote-state policy of the ranking and history:
 * - data is fresh for 15 s and kept in cache for 5 min;
 * - retryable errors are retried twice with backoff;
 * - lists refetch when the window regains focus or the network comes back.
 */
export function createQueryClient(options: QueryClientOptions = {}): QueryClient {
  const retryDelay = options.retryDelay ?? retryDelayMs;
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        retryDelay,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: { retry: shouldRetry, retryDelay },
    },
  });
}
