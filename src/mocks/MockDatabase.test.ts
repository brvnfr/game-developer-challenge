import { describe, expect, it } from 'vitest';
import type { RegisterMatchRequest } from '@/api/contracts';
import { MemoryStorage } from '@/storage/LocalStore';
import { createFixtureRecords } from './fixtures';
import { MockDatabase } from './MockDatabase';

const NOW = () => new Date('2026-10-14T12:00:00.000Z');

function request(overrides: Partial<RegisterMatchRequest> = {}): RegisterMatchRequest {
  return {
    matchId: 'match-1',
    playerId: 'player-1',
    playerName: 'Anne Bonny',
    endedAt: '2026-10-14T11:59:00.000Z',
    score: 40,
    durationMs: 120_000,
    endReason: 'timeUp',
    settings: { sessionTimeSeconds: 120, spawnIntervalSeconds: 3 },
    ...overrides,
  };
}

describe('fixtures', () => {
  it('are deterministic and spread over several configurations', () => {
    expect(createFixtureRecords()).toEqual(createFixtureRecords());
    const keys = new Set(createFixtureRecords().map((record) => record.configKey));
    expect([...keys].sort()).toEqual(['s120-i3', 's180-i2', 's60-i3', 's90-i5']);
  });
});

describe('MockDatabase', () => {
  it('starts with the fixtures: three pages of five for the default configuration', () => {
    const database = new MockDatabase(new MemoryStorage(), NOW);
    const page = database.ranking('s120-i3', { page: 1, pageSize: 5 });
    expect(page).toMatchObject({ page: 1, totalItems: 13, totalPages: 3 });
    expect(page.items.map((entry) => entry.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(database.configurations().items[0]?.configKey).toBe('s120-i3');
  });

  it('stores a match once: the same match again returns the stored record', () => {
    const database = new MockDatabase(new MemoryStorage(), NOW);
    const before = database.count();
    const first = database.register(request());
    const again = database.register(request());
    expect(first.kind).toBe('created');
    expect(again).toEqual({ kind: 'existing', record: first.record });
    expect(database.count()).toBe(before + 1);
    expect(first.record).toMatchObject({ configKey: 's120-i3', recordedAt: '2026-10-14T12:00:00.000Z' });
  });

  it('rejects a different match under an existing id', () => {
    const database = new MockDatabase(new MemoryStorage(), NOW);
    database.register(request());
    expect(database.register(request({ score: 1 })).kind).toBe('conflict');
  });

  it('shows a confirmed match in both the ranking and the player history', () => {
    const database = new MockDatabase(new MemoryStorage(), NOW);
    database.register(request({ score: 999 }));
    expect(database.ranking('s120-i3', { page: 1, pageSize: 5 }).items[0]).toMatchObject({
      rank: 1,
      matchId: 'match-1',
      playerName: 'Anne Bonny',
    });
    expect(database.history('player-1', { page: 1, pageSize: 5 }).items.map((record) => record.matchId)).toEqual([
      'match-1',
    ]);
  });

  it('keeps confirmed matches across instances (refresh) and reset restores the fixtures', () => {
    const storage = new MemoryStorage();
    new MockDatabase(storage, NOW).register(request());
    const reloaded = new MockDatabase(storage, NOW);
    expect(reloaded.history('player-1', { page: 1, pageSize: 5 }).totalItems).toBe(1);
    reloaded.reset();
    expect(reloaded.history('player-1', { page: 1, pageSize: 5 }).totalItems).toBe(0);
    expect(new MockDatabase(storage, NOW).count()).toBe(createFixtureRecords().length);
  });
});
