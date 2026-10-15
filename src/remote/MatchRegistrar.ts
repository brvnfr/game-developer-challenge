import { MutationObserver, type QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/ApiError';
import type { MatchRecord, RegisterMatchRequest } from '@/api/contracts';
import type { PirateBattleApi } from '@/api/PirateBattleApi';
import type { MatchOutbox } from './MatchOutbox';
import { remoteKeys } from './queryKeys';

export interface RegistrarOptions {
  readonly api: PirateBattleApi;
  readonly queryClient: QueryClient;
  readonly outbox: MatchOutbox;
  /** Waits between automatic rounds after a round failed (the mutation itself already retries twice). */
  readonly roundDelaysMs?: readonly number[];
  readonly onlineEvents?: Pick<Window, 'addEventListener' | 'removeEventListener'> | null;
}

const DEFAULT_ROUND_DELAYS_MS = [3_000, 6_000, 12_000, 30_000];

/**
 * Sends completed matches to the server through a TanStack Query mutation, from the persistent outbox:
 * - every match is in the outbox before the first request, and leaves it only once confirmed;
 * - the request is idempotent (PUT by match id), so retrying after a timeout never duplicates it;
 * - only one request per match is in flight, however often Retry is pressed;
 * - failures are retried automatically (backoff rounds, coming back online, app start) and on demand;
 * - nothing here blocks the game: callers never wait for it.
 */
export class MatchRegistrar {
  private readonly inFlight = new Set<string>();
  private readonly retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly roundDelaysMs: readonly number[];
  private isStarted = false;

  constructor(private readonly options: RegistrarOptions) {
    this.roundDelaysMs = options.roundDelaysMs ?? DEFAULT_ROUND_DELAYS_MS;
  }

  /** Resumes the matches left pending by a failure or a refresh, and retries when the network comes back. */
  start(): void {
    if (this.isStarted) return;
    this.isStarted = true;
    this.options.onlineEvents?.addEventListener('online', this.retryAll);
    this.retryAll();
  }

  stop(): void {
    if (!this.isStarted) return;
    this.isStarted = false;
    this.options.onlineEvents?.removeEventListener('online', this.retryAll);
    for (const timer of this.retryTimers.values()) clearTimeout(timer);
    this.retryTimers.clear();
  }

  /** Records a completed match and starts sending it. */
  register(request: RegisterMatchRequest): void {
    this.options.outbox.add(request);
    void this.send(request.matchId);
  }

  /** Sends one pending match now (the Retry button). */
  retry(matchId: string): void {
    void this.send(matchId);
  }

  /** Sends every pending match now. */
  readonly retryAll = (): void => {
    for (const submission of this.options.outbox.getSnapshot().pending) void this.send(submission.request.matchId);
  };

  private async send(matchId: string): Promise<void> {
    const submission = this.options.outbox.find(matchId);
    if (!submission || this.inFlight.has(matchId)) return;
    this.inFlight.add(matchId);
    this.clearRetryTimer(matchId);
    const { api, queryClient, outbox } = this.options;
    const mutation = new MutationObserver<MatchRecord, unknown, RegisterMatchRequest>(queryClient, {
      mutationKey: remoteKeys.registerMatch(matchId),
      mutationFn: (request) => api.registerMatch(request),
      scope: { id: `register-${matchId}` },
    });
    try {
      await mutation.mutate(submission.request);
      outbox.confirm(matchId);
      void queryClient.invalidateQueries({ queryKey: remoteKeys.all });
    } catch (error) {
      const apiError = ApiError.from(error);
      const updated = outbox.recordFailure(matchId, {
        message: apiError.userMessage,
        isRetryable: apiError.isRetryable,
      });
      if (updated && apiError.isRetryable) this.scheduleRetry(matchId, updated.attempts);
    } finally {
      this.inFlight.delete(matchId);
      mutation.reset();
    }
  }

  private scheduleRetry(matchId: string, failedRounds: number): void {
    if (!this.isStarted) return;
    const delayMs = this.roundDelaysMs[Math.min(failedRounds, this.roundDelaysMs.length) - 1] ?? 30_000;
    this.clearRetryTimer(matchId);
    this.retryTimers.set(
      matchId,
      setTimeout(() => {
        this.retryTimers.delete(matchId);
        void this.send(matchId);
      }, delayMs),
    );
  }

  private clearRetryTimer(matchId: string): void {
    const timer = this.retryTimers.get(matchId);
    if (timer !== undefined) clearTimeout(timer);
    this.retryTimers.delete(matchId);
  }
}
