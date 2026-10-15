import { describe, expect, it } from 'vitest';
import { describeDuration, formatClock, formatMatchDuration } from './formatTime';

describe('time formatting', () => {
  it.each([
    [120, '2:00'],
    [102, '1:42'],
    [9, '0:09'],
    [-3, '0:00'],
  ])('formats %i seconds as %s', (seconds, text) => {
    expect(formatClock(seconds)).toBe(text);
  });

  it('formats match durations as mm:ss, rounded to the second', () => {
    expect(formatMatchDuration(120_000)).toBe('02:00');
    expect(formatMatchDuration(102_400)).toBe('01:42');
    expect(formatMatchDuration(0)).toBe('00:00');
  });

  it('describes durations in words for screen readers', () => {
    expect(describeDuration(61)).toBe('1 minute 1 second');
    expect(describeDuration(120)).toBe('2 minutes');
    expect(describeDuration(0)).toBe('0 seconds');
  });
});
