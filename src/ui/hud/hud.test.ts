import { describe, expect, it } from 'vitest';
import type { MatchSnapshot } from '@/game/sim/match/types';
import { describeDuration, formatClock } from './formatTime';
import { MatchAnnouncer } from './MatchAnnouncer';

const running: MatchSnapshot = {
  status: 'running',
  pauseReason: null,
  score: 0,
  health: 100,
  maxHealth: 100,
  remainingSeconds: 120,
  durationSeconds: 120,
  enemiesAlive: 0,
  frontVolleys: 0,
  leftVolleys: 0,
  rightVolleys: 0,
  endReason: null,
};

describe('time formatting', () => {
  it.each([
    [120, '2:00'],
    [102, '1:42'],
    [9, '0:09'],
    [-3, '0:00'],
  ])('formats %i seconds as %s', (seconds, text) => {
    expect(formatClock(seconds)).toBe(text);
  });

  it('describes durations in words for screen readers', () => {
    expect(describeDuration(61)).toBe('1 minute 1 second');
    expect(describeDuration(120)).toBe('2 minutes');
    expect(describeDuration(0)).toBe('0 seconds');
  });
});

describe('MatchAnnouncer', () => {
  it('announces status changes', () => {
    const announcer = new MatchAnnouncer();
    expect(announcer.announcementFor(running, { ...running, status: 'paused', pauseReason: 'manual' }, 0)).toBe(
      'Match paused.',
    );
    expect(announcer.announcementFor(running, { ...running, status: 'paused', pauseReason: 'blur' }, 0)).toMatch(
      /lost focus/,
    );
    expect(announcer.announcementFor(running, { ...running, status: 'ended', endReason: 'timeUp', score: 7 }, 0)).toBe(
      "Time's up. Final score 7.",
    );
  });

  it('announces only the remaining-time marks, not every second', () => {
    const announcer = new MatchAnnouncer();
    const announcements: string[] = [];
    let previous = running;
    for (let seconds = 119; seconds >= 0; seconds--) {
      const current = { ...running, remainingSeconds: seconds };
      const message = announcer.announcementFor(previous, current, seconds);
      if (message) announcements.push(message);
      previous = current;
    }
    expect(announcements).toEqual(['1 minute left.', '30 seconds left.', '10 seconds left.']);
  });

  it('throttles score announcements and warns about low health once', () => {
    const announcer = new MatchAnnouncer();
    expect(announcer.announcementFor(running, { ...running, score: 1 }, 1000)).toBe('Score 1.');
    expect(announcer.announcementFor({ ...running, score: 1 }, { ...running, score: 2 }, 2000)).toBeNull();
    expect(announcer.announcementFor({ ...running, score: 2 }, { ...running, score: 3 }, 6000)).toBe('Score 3.');
    expect(announcer.announcementFor(running, { ...running, health: 20 }, 7000)).toMatch(/Low health/);
    expect(announcer.announcementFor({ ...running, health: 20 }, { ...running, health: 10 }, 8000)).toBeNull();
  });

  it('says nothing on the first snapshot', () => {
    expect(new MatchAnnouncer().announcementFor(null, running, 0)).toBeNull();
  });
});
