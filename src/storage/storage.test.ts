import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DEFAULT_USER_SETTINGS } from '@/game/config/defaults';
import type { MatchResult } from '@/game/sim/match/types';
import { suggestPlayerName, validatePlayerName } from '@/profile/playerName';
import { LocalStore, MemoryStorage, type KeyValueStorage } from './LocalStore';
import {
  DEFAULT_DEVELOPER_TOOLS,
  DeveloperToolsRepository,
  LastResultRepository,
  PlayerProfileRepository,
  ScreenMemory,
  SettingsRepository,
} from './repositories';

const RESULT: MatchResult = {
  matchId: 'match-1',
  score: 7,
  durationMs: 120_000,
  endReason: 'timeUp',
  endedAt: '2026-10-20T12:00:00.000Z',
  settings: { sessionTimeSeconds: 120, spawnIntervalSeconds: 3 },
  seed: 1,
};

const throwingStorage: KeyValueStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('LocalStore', () => {
  it('round-trips valid values and discards corrupted ones', () => {
    const storage = new MemoryStorage();
    const store = new LocalStore('key', z.object({ count: z.number() }), storage);
    expect(store.write({ count: 2 })).toBe(true);
    expect(store.read()).toEqual({ count: 2 });
    storage.setItem('key', '{not json');
    expect(store.read()).toBeNull();
    expect(storage.getItem('key')).toBeNull();
    storage.setItem('key', JSON.stringify({ count: 'two' }));
    expect(store.read()).toBeNull();
  });

  it('behaves as empty when the storage is unavailable or throws', () => {
    expect(new LocalStore('key', z.string(), null).read()).toBeNull();
    const failing = new LocalStore('key', z.string(), throwingStorage);
    expect(failing.read()).toBeNull();
    expect(failing.write('value')).toBe(false);
  });
});

describe('SettingsRepository', () => {
  it('returns defaults first, then the saved settings', () => {
    const storage = new MemoryStorage();
    const repository = new SettingsRepository(storage);
    expect(repository.load()).toEqual(DEFAULT_USER_SETTINGS);
    repository.save({ sessionTimeSeconds: 90, spawnIntervalSeconds: 2.5 });
    expect(new SettingsRepository(storage).load()).toEqual({ sessionTimeSeconds: 90, spawnIntervalSeconds: 2.5 });
  });

  it('ignores stored settings outside the documented limits', () => {
    const storage = new MemoryStorage();
    storage.setItem('pirate-battle.settings.v1', JSON.stringify({ sessionTimeSeconds: 999, spawnIntervalSeconds: 3 }));
    expect(new SettingsRepository(storage).load()).toEqual(DEFAULT_USER_SETTINGS);
  });
});

describe('PlayerProfileRepository', () => {
  it('creates a persistent profile with a suggested name on first use', () => {
    const storage = new MemoryStorage();
    const first = new PlayerProfileRepository(storage, () => 'player-1').load();
    expect(first).toMatchObject({ playerId: 'player-1', hasChosenName: false });
    expect(first.name).toMatch(/^Captain \d{4}$/);
    expect(new PlayerProfileRepository(storage, () => 'other').load()).toEqual(first);
  });

  it('renames with validation and remembers that a name was chosen', () => {
    const storage = new MemoryStorage();
    const repository = new PlayerProfileRepository(storage, () => 'player-1');
    expect(repository.rename('   ')).toEqual({ error: 'Captain name is required.' });
    expect(repository.rename('  Anne   Bonny ')).toEqual({
      profile: { playerId: 'player-1', name: 'Anne Bonny', hasChosenName: true },
    });
    expect(repository.load().name).toBe('Anne Bonny');
  });
});

describe('player names', () => {
  it.each([
    ['Jack', true],
    ['Zé Pirata', true],
    ["O'Malley-2", true],
    ['-dash', false],
    ['<script>', false],
    ['A'.repeat(21), false],
  ])('validates %s → %s', (name, isValid) => {
    expect(validatePlayerName(name).isValid).toBe(isValid);
  });

  it('suggests valid names', () => {
    expect(validatePlayerName(suggestPlayerName(() => 0.5)).isValid).toBe(true);
  });
});

describe('LastResultRepository and ScreenMemory', () => {
  it('persists the last completed result', () => {
    const storage = new MemoryStorage();
    new LastResultRepository(storage).save(RESULT);
    expect(new LastResultRepository(storage).load()).toEqual(RESULT);
  });

  it('remembers whether the result screen was open in this tab', () => {
    const memory = new ScreenMemory(new MemoryStorage());
    expect(memory.isResultOpen()).toBe(false);
    memory.rememberResultOpen();
    expect(memory.isResultOpen()).toBe(true);
    memory.forget();
    expect(memory.isResultOpen()).toBe(false);
  });
});

describe('DeveloperToolsRepository', () => {
  it('starts with every overlay off, then keeps what was saved', () => {
    const storage = new MemoryStorage();
    expect(new DeveloperToolsRepository(storage).load()).toEqual(DEFAULT_DEVELOPER_TOOLS);
    expect(DEFAULT_DEVELOPER_TOOLS).toEqual({ showAimLanes: false, showHitboxes: false });
    new DeveloperToolsRepository(storage).save({ showAimLanes: true, showHitboxes: false });
    expect(new DeveloperToolsRepository(storage).load()).toEqual({ showAimLanes: true, showHitboxes: false });
  });

  it('falls back to the defaults when the stored value is malformed', () => {
    const storage = new MemoryStorage();
    storage.setItem('pirate-battle.dev-tools.v2', JSON.stringify({ showAimLanes: 'yes' }));
    expect(new DeveloperToolsRepository(storage).load()).toEqual(DEFAULT_DEVELOPER_TOOLS);
  });
});
