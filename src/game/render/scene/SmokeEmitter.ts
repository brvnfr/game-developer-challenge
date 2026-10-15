import { Vector2 } from '@/game/core/math/Vector2';
import type { Ship } from '@/game/sim/entities/Ship';
import type { DamageStage } from '../spriteCatalog';
import type { PuffLayer } from './PuffLayer';

/** Seconds between two puffs at each damage stage (0 = intact: no smoke, 3 = wreck: handled by the sinking). */
const PUFF_INTERVAL: Readonly<Record<DamageStage, number>> = { 0: 0, 1: 0.16, 2: 0.07, 3: 0 };
const PUFF_SIZE: Readonly<Record<DamageStage, number>> = { 0: 0, 1: 3.2, 2: 4.4, 3: 0 };
/** Where along the hull (fraction of its length from the centre) and to which side the smoke comes out. */
const VENTS: readonly { readonly along: number; readonly side: number }[] = [
  { along: -0.12, side: 0.2 },
  { along: 0.18, side: -0.25 },
  { along: 0.02, side: 0.05 },
  { along: -0.28, side: -0.1 },
];

/**
 * Smoke from a damaged ship: thin wisps when it is damaged, a thick plume when it is heavily damaged. Together
 * with the hull art and the flames it makes a ship's condition readable at a glance.
 */
export class SmokeEmitter {
  private secondsUntilPuff = 0;
  private ventIndex = 0;

  constructor(
    private readonly ship: Ship,
    private readonly smoke: PuffLayer,
  ) {}

  /** Called with the drawn pose; `deltaSeconds` is presentation time (0 while paused). */
  update(position: Vector2, heading: number, stage: DamageStage, deltaSeconds: number): void {
    const interval = PUFF_INTERVAL[stage];
    if (interval <= 0 || deltaSeconds <= 0 || !this.ship.isAlive) return;
    this.secondsUntilPuff -= deltaSeconds;
    if (this.secondsUntilPuff > 0) return;
    this.secondsUntilPuff += interval;
    const vent = VENTS[this.ventIndex % VENTS.length] ?? { along: 0, side: 0 };
    this.ventIndex++;
    const forward = Vector2.fromAngle(heading);
    const origin = position
      .add(forward.scale(vent.along * this.ship.hullLength))
      .add(forward.leftPerpendicular().scale(vent.side * this.ship.hullRadius * 2));
    this.smoke.emit(origin, this.ship.hullRadius * PUFF_SIZE[stage]);
  }
}
