import type { MatchSnapshot } from '@/game/sim/match/types';
import { describeDuration } from './formatTime';

/** Remaining-time marks announced to screen readers. */
const TIME_MARKS_SECONDS = [60, 30, 10];
const MIN_SCORE_ANNOUNCEMENT_GAP_MS = 4000;

/**
 * Decides what to announce in the live region when the match changes. Only discrete, meaningful
 * moments are announced (pause, resume, end, time marks, low health, score at most every few seconds),
 * never every frame.
 */
export class MatchAnnouncer {
  private lastScoreAnnouncementMs = Number.NEGATIVE_INFINITY;
  private hasWarnedLowHealth = false;

  announcementFor(previous: MatchSnapshot | null, current: MatchSnapshot, nowMs: number): string | null {
    if (!previous) return null;
    if (current.status !== previous.status) return this.describeStatusChange(current);
    if (current.status !== 'running') return null;

    if (
      current.remainingSeconds !== previous.remainingSeconds &&
      TIME_MARKS_SECONDS.includes(current.remainingSeconds)
    ) {
      return `${describeDuration(current.remainingSeconds)} left.`;
    }
    const healthRatio = current.health / current.maxHealth;
    if (!this.hasWarnedLowHealth && healthRatio <= 0.25 && current.health < previous.health) {
      this.hasWarnedLowHealth = true;
      return `Low health: ${current.health} of ${current.maxHealth}.`;
    }
    if (current.score !== previous.score && nowMs - this.lastScoreAnnouncementMs >= MIN_SCORE_ANNOUNCEMENT_GAP_MS) {
      this.lastScoreAnnouncementMs = nowMs;
      return `Score ${current.score}.`;
    }
    return null;
  }

  private describeStatusChange(current: MatchSnapshot): string | null {
    switch (current.status) {
      case 'running':
        return 'Match running.';
      case 'paused':
        return current.pauseReason === 'manual' ? 'Match paused.' : 'Match paused because the game lost focus.';
      case 'ended':
        return current.endReason === 'timeUp'
          ? `Time's up. Final score ${current.score}.`
          : `Your ship was destroyed. Final score ${current.score}.`;
      default:
        return null;
    }
  }
}
