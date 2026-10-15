import type { Projectile } from '../entities/Projectile';
import type { GameEvent, GameEventOf, GameEventType, ProjectileExpiryReason } from './GameEvent';

/** Events produced by the simulation since the last drain. */
export class EventQueue {
  private pending: GameEvent[] = [];

  push(event: GameEvent): void {
    this.pending.push(event);
  }

  /** Returns the pending events and clears the queue. */
  drain(): GameEvent[] {
    const drained = this.pending;
    this.pending = [];
    return drained;
  }

  /** Pending events of one type pushed since `index`, without consuming them. */
  ofTypeSince<Type extends GameEventType>(type: Type, index: number): GameEventOf<Type>[] {
    return this.pending.slice(index).filter((event): event is GameEventOf<Type> => event.type === type);
  }

  get size(): number {
    return this.pending.length;
  }

  /** Reports a projectile that left play without hitting a ship (it must already be inactive). */
  pushProjectileExpired(projectile: Projectile, reason: ProjectileExpiryReason): void {
    this.push({ type: 'projectileExpired', projectileId: projectile.id, reason, position: projectile.position });
  }
}
