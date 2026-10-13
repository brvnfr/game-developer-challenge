import type { Vector2 } from '@/game/core/math/Vector2';
import type { Faction, WeaponSlot } from './types';

export interface ProjectileOptions {
  readonly id: number;
  readonly ownerId: number;
  readonly faction: Faction;
  readonly weaponSlot: WeaponSlot;
  readonly position: Vector2;
  readonly velocity: Vector2;
  readonly damage: number;
  readonly radius: number;
  readonly range: number;
}

/** A cannonball in flight. Deactivated once it hits something or expires; removed at the end of the step. */
export class Projectile {
  readonly id: number;
  readonly ownerId: number;
  readonly faction: Faction;
  readonly weaponSlot: WeaponSlot;
  readonly velocity: Vector2;
  readonly damage: number;
  readonly radius: number;
  position: Vector2;
  previousPosition: Vector2;
  private remainingRangeValue: number;
  private active = true;

  constructor(options: ProjectileOptions) {
    this.id = options.id;
    this.ownerId = options.ownerId;
    this.faction = options.faction;
    this.weaponSlot = options.weaponSlot;
    this.velocity = options.velocity;
    this.damage = options.damage;
    this.radius = options.radius;
    this.position = options.position;
    this.previousPosition = options.position;
    this.remainingRangeValue = options.range;
  }

  get isActive(): boolean {
    return this.active;
  }

  get remainingRange(): number {
    return this.remainingRangeValue;
  }

  get heading(): number {
    return Math.atan2(this.velocity.y, this.velocity.x);
  }

  /** Moves to `position`, consuming range by the distance travelled. */
  travelTo(position: Vector2): void {
    this.previousPosition = this.position;
    this.remainingRangeValue -= this.position.distanceTo(position);
    this.position = position;
  }

  /** Stops at `position` (impact point) and deactivates. */
  stopAt(position: Vector2): void {
    this.previousPosition = this.position;
    this.position = position;
    this.active = false;
  }

  deactivate(): void {
    this.active = false;
  }
}
