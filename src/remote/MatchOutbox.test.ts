import { describe, expect, it } from 'vitest';
import type { RegisterMatchRequest } from '@/api/contracts';
import { MemoryStorage } from '@/storage/LocalStore';
import { MatchOutbox, OUTBOX_KEY } from './MatchOutbox';

const MATCH: RegisterMatchRequest = {
  matchId: 'm-1',
  playerId: 'p-1',
  playerName: 'Anne',
  endedAt: '2026-10-14T11:00:00.000Z',
  score: 3,
  durationMs: 60_000,
  endReason: 'timeUp',
  settings: { sessionTimeSeconds: 60, spawnIntervalSeconds: 3 },
};

describe('MatchOutbox', () => {
  it('adds a match once and persists it', () => {
    const storage = new MemoryStorage();
    const outbox = new MatchOutbox(storage);
    outbox.add(MATCH);
    outbox.add(MATCH);
    expect(outbox.getSnapshot().pending).toHaveLength(1);
    expect(new MatchOutbox(storage).find('m-1')?.request).toEqual(MATCH);
  });

  it('counts failed attempts and keeps the last failure', () => {
    const outbox = new MatchOutbox(new MemoryStorage(), () => new Date('2026-10-14T12:00:00.000Z'));
    outbox.add(MATCH);
    outbox.recordFailure('m-1', { message: 'Down', isRetryable: true });
    expect(outbox.recordFailure('m-1', { message: 'Bad', isRetryable: false })).toMatchObject({
      attempts: 2,
      lastAttemptAt: '2026-10-14T12:00:00.000Z',
      lastFailure: { message: 'Bad', isRetryable: false },
    });
  });

  it('moves a confirmed match out of the pending list and never re-adds it', () => {
    const outbox = new MatchOutbox(new MemoryStorage());
    outbox.add(MATCH);
    outbox.confirm('m-1');
    outbox.add(MATCH);
    expect(outbox.getSnapshot()).toEqual({ pending: [], confirmed: ['m-1'] });
  });

  it('notifies subscribers with a new snapshot on every change', () => {
    const outbox = new MatchOutbox(new MemoryStorage());
    const before = outbox.getSnapshot();
    let notifications = 0;
    outbox.subscribe(() => notifications++);
    outbox.add(MATCH);
    expect(notifications).toBe(1);
    expect(outbox.getSnapshot()).not.toBe(before);
  });

  it('ignores corrupted storage', () => {
    const storage = new MemoryStorage();
    storage.setItem(OUTBOX_KEY, '{"pending": "nope"}');
    expect(new MatchOutbox(storage).getSnapshot()).toEqual({ pending: [], confirmed: [] });
  });
});
