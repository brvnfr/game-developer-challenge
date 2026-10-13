import type { ShipStats } from '@/game/config/types';
import { clamp } from '@/game/core/math/angles';
import { Vector2 } from '@/game/core/math/Vector2';
import type { NavigationState } from './NavigationState';
import { factionOf, type Faction, type ShipKind, type WeaponSlot } from './types';
import type { Weapon } from './Weapon';

export interface ShipOptions {
  readonly id: number;
  readonly kind: ShipKind;
  readonly stats: ShipStats;
  readonly position: Vector2;
  readonly heading: number;
  readonly weapons?: readonly Weapon[];
  readonly navigation?: NavigationState | null;
  /** Chaser only: damage dealt when ramming the player. */
  readonly ramDamage?: number;
  /** Difficulty multiplier applied to speed, acceleration and turn rate. */
  readonly speedMultiplier?: number;
}

export interface DamageOutcome {
  readonly applied: number;
  readonly wasDestroyed: boolean;
}

/** A ship of any kind. Position and heading are integrated by the MovementSystem; health is encapsulated. */
export class Ship {
  readonly id: number;
  readonly kind: ShipKind;
  readonly faction: Faction;
  readonly radius: number;
  readonly maxHealth: number;
  readonly maxSpeed: number;
  readonly acceleration: number;
  readonly deceleration: number;
  readonly turnSpeed: number;
  readonly ramDamage: number;
  readonly weapons: readonly Weapon[];
  readonly navigation: NavigationState | null;

  position: Vector2;
  /** State at the previous step, used by the renderer to interpolate between steps. */
  previousPosition: Vector2;
  /** Radians; 0 = +x, PI/2 = +y (down). */
  heading: number;
  previousHeading: number;
  /** Current forward speed (px/s). */
  speed = 0;
  /** Control inputs for the current step, set by player commands or AI. */
  private throttleInput = 0;
  private turnInputValue = 0;
  private currentHealth: number;
  private alive = true;

  constructor(options: ShipOptions) {
    const speedMultiplier = options.speedMultiplier ?? 1;
    this.id = options.id;
    this.kind = options.kind;
    this.faction = factionOf(options.kind);
    this.radius = options.stats.radius;
    this.maxHealth = options.stats.maxHealth;
    this.maxSpeed = options.stats.maxSpeed * speedMultiplier;
    this.acceleration = options.stats.acceleration * speedMultiplier;
    this.deceleration = options.stats.deceleration;
    this.turnSpeed = options.stats.turnSpeed * speedMultiplier;
    this.ramDamage = options.ramDamage ?? 0;
    this.weapons = options.weapons ?? [];
    this.navigation = options.navigation ?? null;
    this.position = options.position;
    this.previousPosition = options.position;
    this.heading = options.heading;
    this.previousHeading = options.heading;
    this.currentHealth = options.stats.maxHealth;
  }

  get health(): number {
    return this.currentHealth;
  }

  get isAlive(): boolean {
    return this.alive;
  }

  get throttle(): number {
    return this.throttleInput;
  }

  get turnInput(): number {
    return this.turnInputValue;
  }

  get forward(): Vector2 {
    return Vector2.fromAngle(this.heading);
  }

  weapon(slot: WeaponSlot): Weapon | undefined {
    return this.weapons.find((weapon) => weapon.slot === slot);
  }

  /** throttle in [0, 1] (no reverse), turn in [-1, 1] (negative = left). */
  setControls(throttle: number, turn: number): void {
    this.throttleInput = clamp(throttle, 0, 1);
    this.turnInputValue = clamp(turn, -1, 1);
  }

  /** Drops every control input and trigger (pause, end of match, destruction). */
  stopControls(): void {
    this.setControls(0, 0);
    for (const weapon of this.weapons) weapon.isTriggerHeld = false;
  }

  rememberPreviousState(): void {
    this.previousPosition = this.position;
    this.previousHeading = this.heading;
  }

  isEnemyOf(other: Ship): boolean {
    return this.faction !== other.faction;
  }

  overlaps(other: Ship): boolean {
    return this.position.distanceTo(other.position) < this.radius + other.radius;
  }

  /** Applies damage once; health never goes below zero. Destroyed ships ignore further damage. */
  takeDamage(amount: number): DamageOutcome {
    if (!this.alive || amount <= 0) return { applied: 0, wasDestroyed: false };
    const applied = Math.min(amount, this.currentHealth);
    this.currentHealth -= applied;
    if (this.currentHealth <= 0) this.destroy();
    return { applied, wasDestroyed: !this.alive };
  }

  destroy(): void {
    this.alive = false;
    this.currentHealth = 0;
    this.speed = 0;
    this.stopControls();
  }
}
