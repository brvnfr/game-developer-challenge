import type { Vector2 } from '@/game/core/math/Vector2';
import type { ShipKind, WeaponSlot } from '../entities/types';

export type MatchEndReason = 'timeUp' | 'playerDestroyed';
export type PauseReason = 'manual' | 'blur' | 'hidden' | 'orientation';
export type DestructionCause = 'playerProjectile' | 'enemyProjectile' | 'ram';
export type ProjectileExpiryReason = 'rangeExhausted' | 'hitIsland' | 'leftArena' | 'ownerDestroyed';

/** Domain events emitted by the simulation; consumed by the renderer, audio and the UI bridge. */
export type GameEvent =
  | { readonly type: 'matchStarted' }
  | { readonly type: 'matchPaused'; readonly reason: PauseReason }
  | { readonly type: 'matchResumed' }
  | { readonly type: 'matchEnded'; readonly reason: MatchEndReason }
  | { readonly type: 'enemySpawned'; readonly shipId: number; readonly kind: ShipKind; readonly position: Vector2 }
  | {
      readonly type: 'weaponFired';
      readonly shipId: number;
      readonly weaponSlot: WeaponSlot;
      readonly projectileIds: readonly number[];
      readonly position: Vector2;
      readonly heading: number;
    }
  | {
      readonly type: 'projectileHit';
      readonly projectileId: number;
      readonly targetId: number;
      readonly damage: number;
      readonly position: Vector2;
    }
  | {
      readonly type: 'projectileExpired';
      readonly projectileId: number;
      readonly reason: ProjectileExpiryReason;
      readonly position: Vector2;
    }
  | {
      readonly type: 'shipDamaged';
      readonly shipId: number;
      readonly kind: ShipKind;
      readonly damage: number;
      readonly health: number;
      readonly maxHealth: number;
      readonly position: Vector2;
    }
  | {
      readonly type: 'shipDestroyed';
      readonly shipId: number;
      readonly kind: ShipKind;
      readonly cause: DestructionCause;
      readonly position: Vector2;
    }
  | { readonly type: 'scoreChanged'; readonly score: number };

export type GameEventType = GameEvent['type'];
export type GameEventOf<Type extends GameEventType> = Extract<GameEvent, { type: Type }>;
