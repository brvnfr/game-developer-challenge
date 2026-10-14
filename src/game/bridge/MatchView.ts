import type { MatchResult, MatchSnapshot } from '@/game/sim/match/types';

/** What the React UI knows about the running match. Only discrete values; no per-frame data. */
export interface MatchView extends MatchSnapshot {
  readonly result: MatchResult | null;
}
