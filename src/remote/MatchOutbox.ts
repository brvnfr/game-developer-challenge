import { z } from 'zod';
import { registerMatchRequestSchema, type RegisterMatchRequest } from '@/api/contracts';
import { LocalStore, type KeyValueStorage } from '@/storage/LocalStore';

export const OUTBOX_KEY = 'pirate-battle.outbox.v1';
const CONFIRMED_HISTORY_LIMIT = 50;

export interface SubmissionFailure {
  readonly message: string;
  /** False for errors that will not go away by themselves (e.g. 4xx): no automatic retry. */
  readonly isRetryable: boolean;
}

/** A completed match waiting to be stored by the server. */
export interface PendingSubmission {
  readonly request: RegisterMatchRequest;
  readonly attempts: number;
  readonly lastAttemptAt: string | null;
  readonly lastFailure: SubmissionFailure | null;
}

export interface OutboxState {
  readonly pending: readonly PendingSubmission[];
  /** Ids of matches the server confirmed (most recent last), to show "Saved" after a refresh. */
  readonly confirmed: readonly string[];
}

const stateSchema = z.object({
  pending: z.array(
    z.object({
      request: registerMatchRequestSchema,
      attempts: z.number().int().min(0),
      lastAttemptAt: z.string().nullable(),
      lastFailure: z.object({ message: z.string(), isRetryable: z.boolean() }).nullable(),
    }),
  ),
  confirmed: z.array(z.string()),
});

const EMPTY_STATE: OutboxState = { pending: [], confirmed: [] };

/**
 * Persistent outbox of completed matches. A match is written here before the first request, so a failure, a
 * timeout or a refresh never loses it; it leaves the outbox only when the server confirms it.
 * The state is immutable: each change creates a new snapshot (usable with useSyncExternalStore).
 */
export class MatchOutbox {
  private readonly store: LocalStore<OutboxState>;
  private state: OutboxState;
  private readonly listeners = new Set<() => void>();

  constructor(
    storage: KeyValueStorage | null,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.store = new LocalStore(OUTBOX_KEY, stateSchema, storage);
    this.state = this.store.read() ?? EMPTY_STATE;
  }

  readonly getSnapshot = (): OutboxState => this.state;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  find(matchId: string): PendingSubmission | undefined {
    return this.state.pending.find((submission) => submission.request.matchId === matchId);
  }

  isConfirmed(matchId: string): boolean {
    return this.state.confirmed.includes(matchId);
  }

  /** Adds a match once; adding it again (or after confirmation) changes nothing. */
  add(request: RegisterMatchRequest): void {
    if (this.find(request.matchId) || this.isConfirmed(request.matchId)) return;
    this.update({
      ...this.state,
      pending: [...this.state.pending, { request, attempts: 0, lastAttemptAt: null, lastFailure: null }],
    });
  }

  recordFailure(matchId: string, failure: SubmissionFailure): PendingSubmission | undefined {
    const submission = this.find(matchId);
    if (!submission) return undefined;
    const updated: PendingSubmission = {
      ...submission,
      attempts: submission.attempts + 1,
      lastAttemptAt: this.now().toISOString(),
      lastFailure: failure,
    };
    this.update({
      ...this.state,
      pending: this.state.pending.map((item) => (item.request.matchId === matchId ? updated : item)),
    });
    return updated;
  }

  confirm(matchId: string): void {
    const confirmed = [...this.state.confirmed.filter((id) => id !== matchId), matchId].slice(-CONFIRMED_HISTORY_LIMIT);
    this.update({
      pending: this.state.pending.filter((submission) => submission.request.matchId !== matchId),
      confirmed,
    });
  }

  private update(state: OutboxState): void {
    this.state = state;
    this.store.write(state);
    for (const listener of this.listeners) listener();
  }
}
