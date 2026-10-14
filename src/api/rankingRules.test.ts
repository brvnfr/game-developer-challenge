import { describe, expect, it } from 'vitest';
import type { MatchRecord } from './contracts';
import { compareForHistory, compareForRanking, paginate } from './rankingRules';

function match(overrides: Partial<MatchRecord>): MatchRecord {
  return {
    matchId: 'm',
    playerId: 'p',
    playerName: 'Captain',
    endedAt: '2026-10-14T10:00:00.000Z',
    score: 10,
    durationMs: 120_000,
    endReason: 'timeUp',
    settings: { sessionTimeSeconds: 120, spawnIntervalSeconds: 3 },
    configKey: 's120-i3',
    recordedAt: '2026-10-14T10:00:01.000Z',
    ...overrides,
  };
}

describe('ranking order', () => {
  it('puts more points first', () => {
    const sorted = [match({ matchId: 'a', score: 5 }), match({ matchId: 'b', score: 9 })].sort(compareForRanking);
    expect(sorted.map((entry) => entry.matchId)).toEqual(['b', 'a']);
  });

  it('breaks ties by shorter duration, then earlier end, then match id', () => {
    const sorted = [
      match({ matchId: 'd', durationMs: 90_000, endedAt: '2026-10-14T12:00:00.000Z' }),
      match({ matchId: 'c', durationMs: 90_000, endedAt: '2026-10-14T12:00:00.000Z' }),
      match({ matchId: 'b', durationMs: 90_000, endedAt: '2026-10-14T11:00:00.000Z' }),
      match({ matchId: 'a', durationMs: 120_000, endedAt: '2026-10-14T09:00:00.000Z' }),
    ].sort(compareForRanking);
    expect(sorted.map((entry) => entry.matchId)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('gives the same order whatever the input order', () => {
    const matches = Array.from({ length: 20 }, (_, index) =>
      match({ matchId: `m${index}`, score: index % 4, durationMs: 60_000 + (index % 3) * 1000 }),
    );
    const forward = [...matches].sort(compareForRanking).map((entry) => entry.matchId);
    const backward = [...matches]
      .reverse()
      .sort(compareForRanking)
      .map((entry) => entry.matchId);
    expect(backward).toEqual(forward);
  });
});

describe('history order', () => {
  it('shows the newest match first', () => {
    const sorted = [
      match({ matchId: 'old', endedAt: '2026-10-13T10:00:00.000Z' }),
      match({ matchId: 'new', endedAt: '2026-10-14T10:00:00.000Z' }),
    ].sort(compareForHistory);
    expect(sorted.map((entry) => entry.matchId)).toEqual(['new', 'old']);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 12 }, (_, index) => index + 1);
  const now = new Date('2026-10-14T10:00:00.000Z');

  it('returns the requested 1-based page with the totals', () => {
    expect(paginate(items, { page: 3, pageSize: 5 }, now)).toEqual({
      items: [11, 12],
      page: 3,
      pageSize: 5,
      totalItems: 12,
      totalPages: 3,
      generatedAt: '2026-10-14T10:00:00.000Z',
    });
  });

  it('returns an empty page past the end and zero pages for an empty list', () => {
    expect(paginate(items, { page: 9, pageSize: 5 }, now).items).toEqual([]);
    expect(paginate([], { page: 1, pageSize: 5 }, now)).toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
  });
});
