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

export const NEUTRAL_ENEMY_MODIFIERS: EnemyModifiers = {
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

  createEnemy(
    kind: EnemyKind,
    position: Vector2,
    heading: number,
    modifiers: EnemyModifiers = NEUTRAL_ENEMY_MODIFIERS,
  ): Ship {
    return kind === 'chaser'
      ? this.createChaser(position, heading, modifiers)
      : this.createShooter(position, heading, modifiers);
  }

  createChaser(position: Vector2, heading: number, modifiers: EnemyModifiers = NEUTRAL_ENEMY_MODIFIERS): Ship {
    const stats = this.config.chaser;
    return this.world.addShip(
      new Ship({
        id: this.world.createEntityId(),
        kind: 'chaser',
        stats,
        position,
        heading,
        navigation: new NavigationState(modifiers.preferredAvoidanceSide, position),
        ramDamage: stats.ramDamage,
        speedMultiplier: modifiers.speedMultiplier,
      }),
    );
  }

  createShooter(position: Vector2, heading: number, modifiers: EnemyModifiers = NEUTRAL_ENEMY_MODIFIERS): Ship {
    const stats = this.config.shooter;
    return this.world.addShip(
      new Ship({
        id: this.world.createEntityId(),
        kind: 'shooter',
        stats,
        position,
        heading,
        weapons: [new Weapon('cannon', stats.cannon, modifiers.shooterCooldownMultiplier)],
        navigation: new NavigationState(modifiers.preferredAvoidanceSide, position),
        speedMultiplier: modifiers.speedMultiplier,
      }),
    );
  }
}
