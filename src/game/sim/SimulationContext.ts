import type { MatchConfig } from '@/game/config/types';
import type { SeededRandom } from '@/game/core/SeededRandom';
import type { Arena } from './arena/Arena';
import type { DamageResolver } from './DamageResolver';
import type { EventQueue } from './events/EventQueue';
import type { ShipFactory } from './ShipFactory';
import type { World } from './World';

/** Everything a system needs to run one fixed step. */
export interface SimulationContext {
  readonly world: World;
  readonly arena: Arena;
  readonly config: MatchConfig;
  readonly events: EventQueue;
  readonly random: SeededRandom;
  readonly damage: DamageResolver;
  readonly ships: ShipFactory;
  readonly stepSeconds: number;
}
