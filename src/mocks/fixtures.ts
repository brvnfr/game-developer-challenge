import type { MatchRecord, MatchSettings } from '@/api/contracts';
import { createConfigKey } from '@/game/config/matchConfig';
import { SeededRandom } from '@/game/core/SeededRandom';

/** Seed of the fixture generator: every install and every test starts from exactly the same records. */
export const FIXTURE_SEED = 2026;

/** Fixtures end before this instant, so dates never depend on when the app runs. */
const FIXTURE_LATEST_END = Date.parse('2026-10-12T21:42:00.000Z');

/** Other captains in the ranking. Their ids are stable so tests can refer to them. */
export const FIXTURE_CAPTAINS = [
  'Captain Flint',
  'Red Sparrow',
  'Storm Rider',
  'Sea Wolf',
  'Iron Hook',
  'Salt Annie',
  'Black Gull',
  'Coral Queen',
  'Grey Kraken',
  'Rum Runner',
  'Silver Fin',
  'Tide Breaker',
] as const;

interface FixtureGroup {
  readonly settings: MatchSettings;
  readonly matchCount: number;
}

/** The default options get three pages of five entries, like the reference screen; other options get fewer. */
const FIXTURE_GROUPS: readonly FixtureGroup[] = [
  { settings: { sessionTimeSeconds: 120, spawnIntervalSeconds: 3 }, matchCount: 13 },
  { settings: { sessionTimeSeconds: 60, spawnIntervalSeconds: 3 }, matchCount: 6 },
  { settings: { sessionTimeSeconds: 180, spawnIntervalSeconds: 2 }, matchCount: 7 },
  { settings: { sessionTimeSeconds: 90, spawnIntervalSeconds: 5 }, matchCount: 4 },
];

export function fixturePlayerId(captainIndex: number): string {
  return `fixture-captain-${String(captainIndex + 1).padStart(2, '0')}`;
}

/** Builds one plausible completed match: longer matches and faster spawns give more points. */
function createFixtureMatch(
  random: SeededRandom,
  settings: MatchSettings,
  matchId: string,
  player: { readonly playerId: string; readonly playerName: string },
  endedAtMs: number,
): MatchRecord {
  const survived = random.chance(0.55);
  const durationSeconds = survived
    ? settings.sessionTimeSeconds
    : random.integerBetween(Math.round(settings.sessionTimeSeconds * 0.3), settings.sessionTimeSeconds - 1);
  const enemiesMet = durationSeconds / settings.spawnIntervalSeconds;
  const score = Math.max(0, Math.round(enemiesMet * random.between(0.15, 0.6)));
  const endedAt = new Date(endedAtMs).toISOString();
  return {
    matchId,
    ...player,
    endedAt,
    score,
    durationMs: durationSeconds * 1000,
    endReason: survived ? 'timeUp' : 'playerDestroyed',
    settings,
    configKey: createConfigKey(settings),
    recordedAt: new Date(endedAtMs + 400).toISOString(),
  };
}

/** Matches of the other captains (seeded, deterministic). */
export function createFixtureRecords(seed: number = FIXTURE_SEED): MatchRecord[] {
  const random = new SeededRandom(seed);
  const records: MatchRecord[] = [];
  let endedAtMs = FIXTURE_LATEST_END;
  for (const group of FIXTURE_GROUPS) {
    for (let index = 0; index < group.matchCount; index++) {
      const captainIndex = random.integerBetween(0, FIXTURE_CAPTAINS.length - 1);
      const player = {
        playerId: fixturePlayerId(captainIndex),
        playerName: FIXTURE_CAPTAINS[captainIndex] ?? 'Captain',
      };
      const matchId = `fixture-${createConfigKey(group.settings)}-${String(index + 1).padStart(2, '0')}`;
      records.push(createFixtureMatch(random, group.settings, matchId, player, endedAtMs));
      endedAtMs -= random.integerBetween(20, 90) * 60_000;
    }
  }
  return records;
}

/**
 * Extra past matches for one player, used by the "many pages" scenario so Match History has several pages
 * without touching the stored records.
 */
export function createDemoHistory(
  player: { readonly playerId: string; readonly playerName: string },
  count: number,
  seed: number,
): MatchRecord[] {
  const random = new SeededRandom(seed);
  const settings: MatchSettings = { sessionTimeSeconds: 120, spawnIntervalSeconds: 3 };
  return Array.from({ length: count }, (_, index) =>
    createFixtureMatch(
      random,
      settings,
      `demo-${player.playerId}-${String(index + 1).padStart(2, '0')}`,
      player,
      FIXTURE_LATEST_END - (index + 1) * 3_600_000,
    ),
  );
}

/** Extra ranking entries for any configuration, used by the "many pages" scenario. */
export function createDemoRanking(settings: MatchSettings, count: number, seed: number): MatchRecord[] {
  const random = new SeededRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const captainIndex = index % FIXTURE_CAPTAINS.length;
    return createFixtureMatch(
      random,
      settings,
      `demo-${createConfigKey(settings)}-${String(index + 1).padStart(3, '0')}`,
      { playerId: fixturePlayerId(captainIndex), playerName: FIXTURE_CAPTAINS[captainIndex] ?? 'Captain' },
      FIXTURE_LATEST_END - (index + 1) * 1_800_000,
    );
  });
}
