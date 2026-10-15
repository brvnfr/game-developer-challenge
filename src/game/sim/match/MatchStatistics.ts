import type { ShipKind, WeaponSlot } from '../entities/types';
import type { EventQueue } from '../events/EventQueue';

export interface MatchStatisticsSnapshot {
  /** Player volleys per weapon (a broadside volley counts once). */
  readonly playerVolleys: Readonly<Record<Exclude<WeaponSlot, 'cannon'>, number>>;
  readonly playerProjectilesFired: number;
  readonly enemyProjectilesFired: number;
  readonly hitsOnEnemies: number;
  readonly hitsOnPlayer: number;
  readonly damageTakenByPlayer: number;
  /** Damage the player's cannonballs dealt to enemies. */
  readonly damageDealtByPlayer: number;
  readonly enemiesDestroyedByPlayer: number;
  /** Chasers that exploded against the player (they never score). */
  readonly enemiesDestroyedByRam: number;
  readonly enemiesSpawnedByKind: Readonly<Record<Exclude<ShipKind, 'player'>, number>>;
}

/**
 * Read-only counters of what happened in a match, collected from the domain events of each step. Used by the
 * result screen, the HUD (reload indicators), the test instrumentation and profiling; the rules never read them.
 */
export class MatchStatistics {
  private readonly playerVolleys = { front: 0, left: 0, right: 0 };
  private readonly enemiesSpawnedByKind = { chaser: 0, shooter: 0 };
  private playerProjectilesFired = 0;
  private enemyProjectilesFired = 0;
  private hitsOnEnemies = 0;
  private hitsOnPlayer = 0;
  private damageTakenByPlayer = 0;
  private damageDealtByPlayer = 0;
  private enemiesDestroyedByPlayer = 0;
  private enemiesDestroyedByRam = 0;

  constructor(private readonly playerId: number) {}

  collect(events: EventQueue, firstEventIndex: number): void {
    for (const fired of events.ofTypeSince('weaponFired', firstEventIndex)) {
      if (fired.shipId === this.playerId && fired.weaponSlot !== 'cannon') {
        this.playerVolleys[fired.weaponSlot]++;
        this.playerProjectilesFired += fired.projectileIds.length;
      } else {
        this.enemyProjectilesFired += fired.projectileIds.length;
      }
    }
    for (const hit of events.ofTypeSince('projectileHit', firstEventIndex)) {
      if (hit.targetId === this.playerId) {
        this.hitsOnPlayer++;
      } else {
        this.hitsOnEnemies++;
        this.damageDealtByPlayer += hit.damage;
      }
    }
    for (const damaged of events.ofTypeSince('shipDamaged', firstEventIndex)) {
      if (damaged.shipId === this.playerId) this.damageTakenByPlayer += damaged.damage;
    }
    for (const destroyed of events.ofTypeSince('shipDestroyed', firstEventIndex)) {
      if (destroyed.kind === 'player') continue;
      if (destroyed.cause === 'playerProjectile') this.enemiesDestroyedByPlayer++;
      else if (destroyed.cause === 'ram') this.enemiesDestroyedByRam++;
    }
    for (const spawned of events.ofTypeSince('enemySpawned', firstEventIndex)) {
      if (spawned.kind !== 'player') this.enemiesSpawnedByKind[spawned.kind]++;
    }
  }

  snapshot(): MatchStatisticsSnapshot {
    return {
      playerVolleys: { ...this.playerVolleys },
      playerProjectilesFired: this.playerProjectilesFired,
      enemyProjectilesFired: this.enemyProjectilesFired,
      hitsOnEnemies: this.hitsOnEnemies,
      hitsOnPlayer: this.hitsOnPlayer,
      damageTakenByPlayer: this.damageTakenByPlayer,
      damageDealtByPlayer: this.damageDealtByPlayer,
      enemiesDestroyedByPlayer: this.enemiesDestroyedByPlayer,
      enemiesDestroyedByRam: this.enemiesDestroyedByRam,
      enemiesSpawnedByKind: { ...this.enemiesSpawnedByKind },
    };
  }
}
