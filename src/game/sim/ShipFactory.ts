import type { EnemyKind, MatchConfig } from '@/game/config/types';
import type { Vector2 } from '@/game/core/math/Vector2';
import { NavigationState } from './entities/NavigationState';
import { Ship } from './entities/Ship';
import { Weapon } from './entities/Weapon';
import type { World } from './World';

export interface EnemyModifiers {
  readonly speedMultiplier: number;
  readonly shooterCooldownMultiplier: number;
  readonly preferredAvoidanceSide: 1 | -1;
}

const NEUTRAL_ENEMY_MODIFIERS: EnemyModifiers = {
  speedMultiplier: 1,
  shooterCooldownMultiplier: 1,
  preferredAvoidanceSide: 1,
};

/** Creates ships from the match configuration and registers them in the world. */
export class ShipFactory {
  constructor(
    private readonly world: World,
    private readonly config: MatchConfig,
  ) {}

  createPlayer(position: Vector2, heading: number): Ship {
    const stats = this.config.player;
    return this.world.addShip(
      new Ship({
        id: this.world.createEntityId(),
        kind: 'player',
        stats,
        position,
        heading,
        weapons: [
          new Weapon('front', stats.frontCannon),
          new Weapon('left', stats.broadside),
          new Weapon('right', stats.broadside),
        ],
      }),
    );
  }

  /**
   * Creates an enemy of either kind. Both steer with their own navigation memory and get the difficulty's speed;
   * a Chaser rams, a Shooter carries one cannon whose cooldown follows the difficulty.
   */
  createEnemy(
    kind: EnemyKind,
    position: Vector2,
    heading: number,
    modifiers: EnemyModifiers = NEUTRAL_ENEMY_MODIFIERS,
  ): Ship {
    const common = {
      id: this.world.createEntityId(),
      kind,
      position,
      heading,
      navigation: new NavigationState(modifiers.preferredAvoidanceSide, position),
      speedMultiplier: modifiers.speedMultiplier,
    };
    const ship =
      kind === 'chaser'
        ? new Ship({ ...common, stats: this.config.chaser, ramDamage: this.config.chaser.ramDamage })
        : new Ship({
            ...common,
            stats: this.config.shooter,
            weapons: [new Weapon('cannon', this.config.shooter.cannon, modifiers.shooterCooldownMultiplier)],
          });
    return this.world.addShip(ship);
  }
}
