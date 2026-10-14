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

const RELOAD_READY_COLOUR = 0xffd75a;
const RELOAD_FILL_COLOUR = 0xffffff;
const RELOAD_TRACK_COLOUR = 0x0b2233;
/** Readiness is redrawn in steps of 1/RELOAD_STEPS so the arcs are not rebuilt every frame for nothing. */
const RELOAD_STEPS = 48;

interface ReloadArc {
  readonly slot: WeaponSlot;
  readonly radius: number;
  readonly centreAngle: number;
  readonly halfSpread: number;
}

/**
 * The player's gunnery aids, drawn in the ship's frame (x = bow, -y = port side) and moved with it:
 * - aim guide (under the ships): dashed lanes to the range of the bow chaser and of each broadside, bright
 *   when the weapon is loaded and faint while it reloads;
 * - reload arcs (above the ships): one arc per weapon around the hull that fills up as it reloads.
 * Only the arcs are redrawn, and only when a weapon's readiness changes.
 */
export class PlayerGunneryView {
  readonly guide = new Container({ label: 'aim-guide' });
  readonly reloadIndicator = new Graphics({ label: 'reload-indicator' });
  private readonly guides = new Map<WeaponSlot, Graphics>();
  private readonly arcs: readonly ReloadArc[];
  private shownReadiness = '';

  constructor(private readonly ship: Ship) {
    const bowDistance = ship.boundingRadius + 2;
    const sideDistance = ship.hullRadius * 0.8;
    this.arcs = [
      { slot: 'front', radius: bowDistance + 10, centreAngle: 0, halfSpread: 0.3 },
      { slot: 'left', radius: ship.hullRadius + 16, centreAngle: -Math.PI / 2, halfSpread: 0.75 },
      { slot: 'right', radius: ship.hullRadius + 16, centreAngle: Math.PI / 2, halfSpread: 0.75 },
    ];
    for (const weapon of ship.weapons) {
      const lanes = this.lanesFor(weapon, bowDistance, sideDistance);
      if (lanes.length === 0) continue;
      const graphics = new Graphics();
      for (const lane of lanes) PlayerGunneryView.dashedLine(graphics, lane);
      graphics.stroke({ width: 4, color: GUIDE_EDGE_COLOUR, alpha: 0.35, cap: 'round' });
      for (const lane of lanes) PlayerGunneryView.dashedLine(graphics, lane);
      graphics.stroke({ width: 2, color: GUIDE_COLOUR, cap: 'round' });
      this.guides.set(weapon.slot, graphics);
      this.guide.addChild(graphics);
    }
  }

  update(interpolation: number): void {
    const { ship } = this;
    const isVisible = ship.isAlive;
    this.guide.visible = isVisible;
    this.reloadIndicator.visible = isVisible;
    if (!isVisible) return;
    const position = ship.previousPosition.lerp(ship.position, interpolation);
    const heading = ship.previousHeading + (ship.heading - ship.previousHeading) * interpolation;
    for (const view of [this.guide, this.reloadIndicator]) {
      view.position.set(position.x, position.y);
      view.rotation = heading;
    }
    for (const weapon of ship.weapons) {
      const guide = this.guides.get(weapon.slot);
      if (guide) guide.alpha = weapon.isReady ? GUIDE_ALPHA_READY : GUIDE_ALPHA_RELOADING;
    }
    this.drawReloadArcs();
  }

  destroy(): void {
    this.guide.destroy({ children: true });
    this.reloadIndicator.destroy();
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

  private drawReloadArcs(): void {
    const readiness = this.arcs.map(({ slot }) => {
      const weapon = this.ship.weapon(slot);
      return weapon ? Math.round(weapon.readiness * RELOAD_STEPS) / RELOAD_STEPS : 1;
    });
    const key = readiness.join(',');
    if (key === this.shownReadiness) return;
    this.shownReadiness = key;
    const graphics = this.reloadIndicator.clear();
    this.arcs.forEach((arc, index) => {
      const ready = readiness[index] ?? 1;
      const start = arc.centreAngle - arc.halfSpread;
      const end = arc.centreAngle + arc.halfSpread;
      PlayerGunneryView.arc(graphics, arc.radius, start, end).stroke({
        width: 6,
        color: RELOAD_TRACK_COLOUR,
        alpha: 0.4,
        cap: 'round',
      });
      if (ready >= 1) {
        PlayerGunneryView.arc(graphics, arc.radius, start, end).stroke({
          width: 3,
          color: RELOAD_READY_COLOUR,
          alpha: 0.9,
          cap: 'round',
        });
        return;
      }
      if (ready > 0) {
        PlayerGunneryView.arc(graphics, arc.radius, start, start + (end - start) * ready).stroke({
          width: 3,
          color: RELOAD_FILL_COLOUR,
          alpha: 0.9,
          cap: 'round',
        });
      }
    });
  }

  private static arc(graphics: Graphics, radius: number, start: number, end: number): Graphics {
    return graphics.moveTo(Math.cos(start) * radius, Math.sin(start) * radius).arc(0, 0, radius, start, end);
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
