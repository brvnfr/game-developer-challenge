import type { Ship } from '../entities/Ship';
import type { SimulationContext } from '../SimulationContext';

/** Decides the controls and triggers of one enemy for the current step. One implementation per enemy kind. */
export interface EnemyBehavior {
  decide(enemy: Ship, player: Ship, context: SimulationContext): void;
}
