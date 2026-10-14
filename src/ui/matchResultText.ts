import type { MatchResult } from '@/game/sim/match/types';
import { formatClock } from './hud/formatTime';

/** Short reason shown next to the score (result screen, last battle, Match History). */
export const END_REASON_LABELS: Readonly<Record<MatchResult['endReason'], string>> = {
  timeUp: 'Time up',
  playerDestroyed: 'Ship destroyed',
};

/** Heading of the result screen. */
export const RESULT_TITLES: Readonly<Record<MatchResult['endReason'], string>> = {
  timeUp: 'Battle complete',
  playerDestroyed: 'Your ship sank',
};

/** Seconds of active play, rounded to the nearest second. */
export function playedSecondsOf(result: Pick<MatchResult, 'durationMs'>): number {
  return Math.round(result.durationMs / 1000);
}

/** ISO 8601 duration for `<time dateTime>` (e.g. 102 s → "PT102S"). */
export function isoDuration(totalSeconds: number): string {
  return `PT${Math.max(0, Math.round(totalSeconds))}S`;
}

/** One-line summary such as "12 points · 2:00 · Time up". */
export function summarizeResult(result: MatchResult): string {
  const points = result.score === 1 ? 'point' : 'points';
  return `${result.score} ${points} · ${formatClock(playedSecondsOf(result))} · ${END_REASON_LABELS[result.endReason]}`;
}
