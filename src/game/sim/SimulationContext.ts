import type { MatchConfig } from '@/game/config/types';
import { SeededRandom } from '@/game/core/SeededRandom';
import type { Arena } from './arena/Arena';
import { DamageResolver } from './DamageResolver';
import { EventQueue } from './events/EventQueue';
import { HullPlacement } from './HullPlacement';
import { ShipFactory } from './ShipFactory';
import { World } from './World';

/** Everything a system needs to run one fixed step. */
export interface SimulationContext {
  readonly world: World;
  readonly arena: Arena;
  readonly config: MatchConfig;
  readonly events: EventQueue;
  readonly random: SeededRandom;
  readonly damage: DamageResolver;
  readonly ships: ShipFactory;
  readonly hullPlacement: HullPlacement;
  readonly stepSeconds: number;
}

/** Wires a fresh world, event queue and the services built on them (a match, or a unit test of one system). */
export function createSimulationContext(arena: Arena, config: MatchConfig, seed: number): SimulationContext {
  const world = new World();
  const events = new EventQueue();
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
