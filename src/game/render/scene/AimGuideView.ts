import { Container, Graphics } from 'pixi.js';
import type { Ship } from '@/game/sim/entities/Ship';
import { isBroadside, type Weapon } from '@/game/sim/entities/Weapon';
import type { WeaponSlot } from '@/game/sim/entities/types';

const GUIDE_COLOUR = 0xffffff;
/** Dark edge under the dashes so they read on bright water and on sand alike. */
const GUIDE_EDGE_COLOUR = 0x0b2233;
const GUIDE_DASH = 14;
const GUIDE_GAP = 10;
/** Guide opacity for a loaded weapon and for one still reloading. */
const GUIDE_ALPHA_READY = 0.55;
const GUIDE_ALPHA_RELOADING = 0.16;

/**
 * The player's aim lanes (a developer overlay, under the ships): dashed lanes to the range of the bow chaser
 * and of each broadside, drawn once in the ship's frame (x = bow, -y = port side) and moved with it; bright when
 * the weapon is loaded and faint while it reloads. Reloading itself is shown by the cannon buttons of the HUD.
 */
export class AimGuideView {
  readonly guide = new Container({ label: 'aim-guide' });
  private readonly guides = new Map<WeaponSlot, Graphics>();

  constructor(private readonly ship: Ship) {
    const bowDistance = ship.boundingRadius + 2;
    const sideDistance = ship.hullRadius * 0.8;
    for (const weapon of ship.weapons) {
      const lanes = this.lanesFor(weapon, bowDistance, sideDistance);
      if (lanes.length === 0) continue;
      const graphics = new Graphics();
      for (const lane of lanes) AimGuideView.dashedLine(graphics, lane);
      graphics.stroke({ width: 4, color: GUIDE_EDGE_COLOUR, alpha: 0.35, cap: 'round' });
      for (const lane of lanes) AimGuideView.dashedLine(graphics, lane);
      graphics.stroke({ width: 2, color: GUIDE_COLOUR, cap: 'round' });
      this.guides.set(weapon.slot, graphics);
      this.guide.addChild(graphics);
    }
  }

  update(interpolation: number): void {
    const { ship } = this;
    this.guide.visible = ship.isAlive;
    if (!ship.isAlive) return;
    const position = ship.previousPosition.lerp(ship.position, interpolation);
    this.guide.position.set(position.x, position.y);
    this.guide.rotation = ship.previousHeading + (ship.heading - ship.previousHeading) * interpolation;
    for (const weapon of ship.weapons) {
      const guide = this.guides.get(weapon.slot);
      if (guide) guide.alpha = weapon.isReady ? GUIDE_ALPHA_READY : GUIDE_ALPHA_RELOADING;
    }
  }

  destroy(): void {
    this.guide.destroy({ children: true });
  }

  private lanesFor(weapon: Weapon, bowDistance: number, sideDistance: number): Lane[] {
    const { range } = weapon.stats;
    if (weapon.slot === 'front') return [{ fromX: bowDistance, fromY: 0, toX: bowDistance + range, toY: 0 }];
    if ((weapon.slot !== 'left' && weapon.slot !== 'right') || !isBroadside(weapon.stats)) return [];
    const { projectileCount, projectileSpacing } = weapon.stats;
    const side = weapon.slot === 'left' ? -1 : 1;
    return Array.from({ length: projectileCount }, (_, index) => {
      const x = (index - (projectileCount - 1) / 2) * projectileSpacing;
      return { fromX: x, fromY: side * sideDistance, toX: x, toY: side * (sideDistance + range) };
    });
  }

  private static dashedLine(graphics: Graphics, lane: Lane): void {
    const length = Math.hypot(lane.toX - lane.fromX, lane.toY - lane.fromY);
    const unitX = (lane.toX - lane.fromX) / length;
    const unitY = (lane.toY - lane.fromY) / length;
    for (let distance = 0; distance < length; distance += GUIDE_DASH + GUIDE_GAP) {
      const dashEnd = Math.min(length, distance + GUIDE_DASH);
      graphics
        .moveTo(lane.fromX + unitX * distance, lane.fromY + unitY * distance)
        .lineTo(lane.fromX + unitX * dashEnd, lane.fromY + unitY * dashEnd);
    }
  }
}

interface Lane {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}
