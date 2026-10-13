import type { UserSettings } from '@/game/config/types';
import type { MatchEndReason, PauseReason } from '../events/GameEvent';

export type MatchStatus = 'ready' | 'running' | 'paused' | 'ended';

/** Outcome of a completed match. Abandoned matches never produce one. */
export interface MatchResult {
  readonly matchId: string;
  readonly score: number;
  /** Effective active play time; pauses are excluded. */
  readonly durationMs: number;
  readonly endReason: MatchEndReason;
  /** ISO-8601 timestamp of the end of the match. */
  readonly endedAt: string;
  readonly settings: UserSettings;
  readonly seed: number;
}

/** Discrete, UI-facing view of the match. Changes at most a few times per second. */
export interface MatchSnapshot {
  readonly status: MatchStatus;
  readonly pauseReason: PauseReason | null;
  readonly score: number;
  readonly health: number;
  readonly maxHealth: number;
  /** Whole seconds left (rounded up), as shown by the HUD. */
  readonly remainingSeconds: number;
  readonly durationSeconds: number;
  readonly enemiesAlive: number;
  readonly endReason: MatchEndReason | null;
}
