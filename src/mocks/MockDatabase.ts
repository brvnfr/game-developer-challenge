import { z } from 'zod';
import {
  matchRecordSchema,
  type MatchRecord,
  type Page,
  type PageRequest,
  type RankingConfigurations,
  type RankingEntry,
  type RegisterMatchRequest,
} from '@/api/contracts';
import { compareForHistory, compareForRanking, paginate } from '@/api/rankingRules';
import { createConfigKey } from '@/game/config/matchConfig';
import { LocalStore, type KeyValueStorage } from '@/storage/LocalStore';
import { createFixtureRecords } from './fixtures';

export const MOCK_DATABASE_KEY = 'pirate-battle.mock-server.v1';

export type RegisterOutcome =
  | { readonly kind: 'created'; readonly record: MatchRecord }
  | { readonly kind: 'existing'; readonly record: MatchRecord }
  | { readonly kind: 'conflict'; readonly record: MatchRecord };

const REGISTERED_FIELDS = ['playerId', 'score', 'durationMs', 'endReason', 'endedAt'] as const;

/**
 * The mock server's storage: fixtures of other captains plus every confirmed match, kept in localStorage so
 * confirmed records survive a refresh. Ranking and history are both derived from this single list, so the two
 * tabs can never disagree.
 */
export class MockDatabase {
  private readonly store: LocalStore<MatchRecord[]>;
  private records = new Map<string, MatchRecord>();

  constructor(
    storage: KeyValueStorage | null,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.store = new LocalStore(MOCK_DATABASE_KEY, z.array(matchRecordSchema), storage);
    this.load();
  }

  /**
   * Stores a completed match once. Sending the same match again returns the stored record (idempotent PUT);
   * a different match under an existing id is a conflict.
   */
  register(request: RegisterMatchRequest): RegisterOutcome {
    const existing = this.records.get(request.matchId);
    if (existing) {
      const isSameMatch = REGISTERED_FIELDS.every((field) => existing[field] === request[field]);
      return { kind: isSameMatch ? 'existing' : 'conflict', record: existing };
    }
    const record: MatchRecord = {
      ...request,
      configKey: createConfigKey(request.settings),
      recordedAt: this.now().toISOString(),
    };
    this.records.set(record.matchId, record);
    this.save();
    return { kind: 'created', record };
  }

  /** Matches played with one configuration, best first, with their 1-based rank. */
  ranking(configKey: string, pageRequest: PageRequest, extraRecords: readonly MatchRecord[] = []): Page<RankingEntry> {
    const ranked = [...this.records.values(), ...extraRecords]
      .filter((record) => record.configKey === configKey)
      .sort(compareForRanking)
      .map(
        (record, index): RankingEntry => ({
          rank: index + 1,
          matchId: record.matchId,
          playerId: record.playerId,
          playerName: record.playerName,
          score: record.score,
          durationMs: record.durationMs,
          endReason: record.endReason,
          endedAt: record.endedAt,
        }),
      );
    return paginate(ranked, pageRequest, this.now());
  }

  /** Configurations that have at least one match, the most played first. */
  configurations(): RankingConfigurations {
    const byKey = new Map<string, { settings: MatchRecord['settings']; matchCount: number }>();
    for (const record of this.records.values()) {
      const entry = byKey.get(record.configKey);
      if (entry) entry.matchCount++;
      else byKey.set(record.configKey, { settings: record.settings, matchCount: 1 });
    }
    const items = [...byKey.entries()]
      .map(([configKey, entry]) => ({ configKey, ...entry }))
      .sort((first, second) => second.matchCount - first.matchCount || first.configKey.localeCompare(second.configKey));
    return { items };
  }

  /** One player's matches, newest first. */
  history(playerId: string, pageRequest: PageRequest, extraRecords: readonly MatchRecord[] = []): Page<MatchRecord> {
    const matches = [...this.records.values(), ...extraRecords]
      .filter((record) => record.playerId === playerId)
      .sort(compareForHistory);
    return paginate(matches, pageRequest, this.now());
  }

  count(): number {
    return this.records.size;
  }

  /** Back to the fixtures only (the "Reset mock server" action and test setup). */
  reset(): void {
    this.records = new Map(createFixtureRecords().map((record) => [record.matchId, record]));
    this.save();
  }

  private load(): void {
    const saved = this.store.read();
    if (saved) this.records = new Map(saved.map((record) => [record.matchId, record]));
    else this.reset();
  }

  private save(): void {
    this.store.write([...this.records.values()]);
  }
}
