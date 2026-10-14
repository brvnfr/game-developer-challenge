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
  /** Difficulty multiplier applied to speed, acceleration, turn rate and turn acceleration. */
  readonly speedMultiplier?: number;
}

export interface HullContact {
  /** Unit vector pointing from this ship towards the other one at the deepest contact. */
  readonly normal: Vector2;
  readonly depth: number;
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
  /** Half the hull width; every hull circle has this radius. */
  readonly hullRadius: number;
  readonly hullLength: number;
  /** Radius of a circle enclosing the whole hull (half its length). */
  readonly boundingRadius: number;
  readonly maxHealth: number;
  readonly maxSpeed: number;
  readonly acceleration: number;
  readonly deceleration: number;
  readonly turnSpeed: number;
  readonly turnAcceleration: number;
  readonly lateralGrip: number;
  readonly ramDamage: number;
  readonly weapons: readonly Weapon[];
  readonly navigation: NavigationState | null;

  position: Vector2;
  /** State at the previous step, used by the renderer to interpolate between steps. */
  previousPosition: Vector2;
  /** Radians; 0 = +x, PI/2 = +y (down). */
  heading: number;
  previousHeading: number;
  /** World-space velocity (px/s). Thrust is forward only; sideways components come from drift in turns. */
  velocity: Vector2 = Vector2.ZERO;
  /** Current rotation speed (rad/s); eases towards `turnInput × turnSpeed`. */
  angularVelocity = 0;
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
    this.hullRadius = options.stats.hullRadius;
    this.hullLength = options.stats.hullLength;
    this.boundingRadius = options.stats.hullLength / 2;
    this.maxHealth = options.stats.maxHealth;
    this.maxSpeed = options.stats.maxSpeed * speedMultiplier;
    this.acceleration = options.stats.acceleration * speedMultiplier;
    this.deceleration = options.stats.deceleration;
    this.turnSpeed = options.stats.turnSpeed * speedMultiplier;
    this.turnAcceleration = options.stats.turnAcceleration * speedMultiplier;
    this.lateralGrip = options.stats.lateralGrip;
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

  /** Speed along the heading (px/s). */
  get speed(): number {
    return this.velocity.dot(this.forward);
  }

  /** Sideways drift (px/s), positive towards the ship's left. */
  get driftSpeed(): number {
    return this.velocity.dot(this.forward.leftPerpendicular());
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

  /**
   * Centres of the three circles that model the hull (stern, midship, bow) for a given pose.
   * Together they cover the hull from bow to stern, matching the ship art.
   */
  hullCircleCenters(position: Vector2 = this.position, heading: number = this.heading): Vector2[] {
    const keelOffset = Math.max(0, this.hullLength / 2 - this.hullRadius);
    const forward = Vector2.fromAngle(heading);
    return [position.subtract(forward.scale(keelOffset)), position, position.add(forward.scale(keelOffset))];
  }

  /** Deepest overlap between the two hulls, or null when they do not touch. */
  findContactWith(other: Ship): HullContact | null {
    const contactDistance = this.hullRadius + other.hullRadius;
    let deepest: HullContact | null = null;
    for (const ownCenter of this.hullCircleCenters()) {
      for (const otherCenter of other.hullCircleCenters()) {
        const offset = otherCenter.subtract(ownCenter);
        const depth = contactDistance - offset.length;
        if (depth > 0 && (deepest === null || depth > deepest.depth)) {
          deepest = { normal: offset.length > 1e-6 ? offset.normalized() : this.forward, depth };
        }
      }
    }
    return deepest;
  }

  overlaps(other: Ship): boolean {
    return this.findContactWith(other) !== null;
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
    this.velocity = Vector2.ZERO;
    this.angularVelocity = 0;
    this.stopControls();
  }
}
