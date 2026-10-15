import { Vector2 } from '@/game/core/math/Vector2';
import type { Ship } from '@/game/sim/entities/Ship';
import type { PuffLayer } from './PuffLayer';

/** Distance sailed between two pairs of wake puffs (px). */
const PUFF_SPACING = 12;
/** Below this speed (px/s) a ship leaves no wake. */
const MIN_WAKE_SPEED = 20;

/** Leaves a V of foam behind one ship as it sails (two puffs on the stern quarters every few pixels). */
export class WakeEmitter {
  private lastPosition: Vector2 | null = null;
  private distanceSinceLastPuff = 0;

  constructor(
    private readonly ship: Ship,
    private readonly wakes: PuffLayer,
  ) {}

  /** Called with the drawn (interpolated) pose; `deltaSeconds` is presentation time (0 while paused). */
  update(position: Vector2, heading: number, deltaSeconds: number): void {
    const previous = this.lastPosition;
    this.lastPosition = position;
    if (!previous || deltaSeconds <= 0 || !this.ship.isAlive) return;
    const sailed = position.distanceTo(previous);
    if (sailed / deltaSeconds < MIN_WAKE_SPEED) return;
    this.distanceSinceLastPuff += sailed;
    if (this.distanceSinceLastPuff < PUFF_SPACING) return;
    this.distanceSinceLastPuff %= PUFF_SPACING;

    const forward = Vector2.fromAngle(heading);
    const side = forward.leftPerpendicular().scale(this.ship.hullRadius * 0.45);
    const stern = position.subtract(forward.scale(this.ship.hullLength / 2 - 8));
    const size = this.ship.hullRadius * 2.2;
    this.wakes.emit(stern.add(side), size);
    this.wakes.emit(stern.subtract(side), size);
  }
}
