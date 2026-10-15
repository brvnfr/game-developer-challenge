import { describe, expect, it } from 'vitest';
import { describeBattleSettings, formatDayMonth, formatTimeOfDay } from './formatDate';

describe('date formatting', () => {
  it('formats day, month and time in local time', () => {
    const local = new Date(2026, 8, 8, 21, 42).toISOString();
    expect(formatDayMonth(local)).toBe('08 SEP');
    expect(formatTimeOfDay(local)).toBe('21:42');
  });

  it('describes battle settings', () => {
    expect(describeBattleSettings({ sessionTimeSeconds: 120, spawnIntervalSeconds: 3 })).toBe(
      '120 second battles · 3 second spawn interval',
    );
  });
});
