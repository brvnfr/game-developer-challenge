/* Builders for simulation unit tests. Not used by production code. */
import { DEFAULT_GAME_CONFIG } from '@/game/config/defaults';
import { createMatchConfig } from '@/game/config/matchConfig';
import type { GameConfig, MatchConfig, UserSettings } from '@/game/config/types';
import { SeededRandom } from '@/game/core/SeededRandom';
import { Arena } from '../arena/Arena';
import type { ArenaDefinition } from '../arena/ArenaDefinition';
import { DamageResolver } from '../DamageResolver';
import { EventQueue } from '../events/EventQueue';
import { HullPlacement } from '../HullPlacement';
import type { GameEvent, GameEventOf, GameEventType } from '../events/GameEvent';
import { ShipFactory } from '../ShipFactory';
import type { SimulationContext } from '../SimulationContext';
import { World } from '../World';

const OPEN_SEA_COLUMNS = 20;
const OPEN_SEA_ROWS = 12;

/** 20 × 12 tiles of open water (1280 × 768 px). */
export const OPEN_SEA: ArenaDefinition = {
  id: 'open-sea',
  tileSize: 64,
  tiles: Array.from({ length: OPEN_SEA_ROWS }, () => '.'.repeat(OPEN_SEA_COLUMNS)),
  playerStart: { column: 10, row: 6 },
  playerStartHeading: 0,
};

/** Open sea with a 4 × 4 island in the middle (columns 8–11, rows 4–7 → x 512–768, y 256–512). */
export const ISLAND_SEA: ArenaDefinition = {
  ...OPEN_SEA,
  id: 'island-sea',
  tiles: OPEN_SEA.tiles.map((row, rowIndex) => (rowIndex >= 4 && rowIndex <= 7 ? '........####........' : row)),
  playerStart: { column: 3, row: 6 },
};

export function createTestConfig(
  adjustBalance: (base: GameConfig) => GameConfig = (base) => base,
  settings: Partial<UserSettings> = {},
): MatchConfig {
  return createMatchConfig(
    { sessionTimeSeconds: 120, spawnIntervalSeconds: 3, ...settings },
    adjustBalance(structuredClone(DEFAULT_GAME_CONFIG)),
  );
}

export function createTestContext(
  definition: ArenaDefinition = OPEN_SEA,
  config: MatchConfig = createTestConfig(),
  seed = 1,
): SimulationContext {
  const world = new World();
  const events = new EventQueue();
  const arena = new Arena(definition);
  return {
    world,
    arena,
    config,
    events,
    random: new SeededRandom(seed),
    damage: new DamageResolver(world, events),
    ships: new ShipFactory(world, config),
    hullPlacement: new HullPlacement(arena),
    stepSeconds: config.match.stepSeconds,
  };
}

export const stepsFor = (seconds: number, stepSeconds = 1 / 60): number => Math.round(seconds / stepSeconds);

export function eventsOfType<Type extends GameEventType>(
  events: readonly GameEvent[],
  type: Type,
): GameEventOf<Type>[] {
  return events.filter((event): event is GameEventOf<Type> => event.type === type);
}
