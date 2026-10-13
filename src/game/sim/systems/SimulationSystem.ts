import type { SimulationContext } from '../SimulationContext';

/** One stage of the fixed-step pipeline. Systems run in a fixed, explicit order inside MatchSession. */
export interface SimulationSystem {
  update(context: SimulationContext, step: number): void;
}
