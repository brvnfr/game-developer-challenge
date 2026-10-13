import type { Ship } from '../entities/Ship';
import type { SimulationContext } from '../SimulationContext';
import type { EnemyBehavior } from './EnemyBehavior';
import type { SteeringNavigator } from './SteeringNavigator';

/** Chaser: sails at full speed towards the player, around islands, to ram it. */
export class ChaserBehavior implements EnemyBehavior {
  constructor(private readonly navigator: SteeringNavigator) {}

  decide(enemy: Ship, player: Ship, context: SimulationContext): void {
    this.navigator.steerTowards(enemy, player.position, context);
  }
}
