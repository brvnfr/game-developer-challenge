import type { EnemyKind, MatchConfig } from '@/game/config/types';
import { ChaserBehavior } from '../ai/ChaserBehavior';
import type { EnemyBehavior } from '../ai/EnemyBehavior';
import { ShooterBehavior } from '../ai/ShooterBehavior';
import { SteeringNavigator } from '../ai/SteeringNavigator';
import type { SimulationContext } from '../SimulationContext';
import type { SimulationSystem } from './SimulationSystem';

/** Delegates each living enemy to the behaviour of its kind. New enemy kinds plug in a new behaviour. */
export class EnemyAiSystem implements SimulationSystem {
  private readonly behaviors: Readonly<Record<EnemyKind, EnemyBehavior>>;

  constructor(config: MatchConfig, navigator = new SteeringNavigator()) {
    this.behaviors = {
      chaser: new ChaserBehavior(navigator),
      shooter: new ShooterBehavior(navigator, config.shooter),
    };
  }

  update(context: SimulationContext): void {
    const player = context.world.player;
    for (const enemy of context.world.livingEnemies()) {
      if (enemy.kind === 'player') continue;
      if (!player?.isAlive) {
        enemy.stopControls();
        continue;
      }
      this.behaviors[enemy.kind].decide(enemy, player, context);
    }
  }
}
