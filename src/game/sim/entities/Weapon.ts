import type { BroadsideStats, WeaponStats } from '@/game/config/types';
import type { WeaponSlot } from './types';

export function isBroadside(stats: WeaponStats | BroadsideStats): stats is BroadsideStats {
  return 'projectileCount' in stats;
}

/** A ship weapon: its stats, cooldown (in simulation time) and trigger state. */
export class Weapon {
  /** Set each step by player input or AI: "fire as soon as ready". */
  isTriggerHeld = false;
  private cooldownRemainingSeconds = 0;

  constructor(
    readonly slot: WeaponSlot,
    readonly stats: WeaponStats | BroadsideStats,
    /** Fixed at spawn by the difficulty curve; below 1 fires faster. */
    private readonly cooldownMultiplier = 1,
  ) {}

  get cooldownRemaining(): number {
    return this.cooldownRemainingSeconds;
  }

  get isReady(): boolean {
    return this.cooldownRemainingSeconds <= 0;
  }

  get shouldFire(): boolean {
    return this.isTriggerHeld && this.isReady;
  }

  /** Advances the cooldown. Never called while paused, so cooldowns freeze with the match. */
  tick(deltaSeconds: number): void {
    this.cooldownRemainingSeconds = Math.max(0, this.cooldownRemainingSeconds - deltaSeconds);
  }

  startCooldown(): void {
    this.cooldownRemainingSeconds = this.stats.cooldownSeconds * this.cooldownMultiplier;
  }
}
