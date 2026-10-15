import { Container, Graphics } from 'pixi.js';
import type { Arena } from '@/game/sim/arena/Arena';
import type { World } from '@/game/sim/World';

const ISLAND_COLOUR = 0xffd75a;
const PLAYER_COLOUR = 0x5cff8a;
const ENEMY_COLOUR = 0xff5c5c;
const PROJECTILE_COLOUR = 0xffffff;

/**
 * Developer overlay (Developer tools › Hitboxes): the shapes the rules actually collide — island rectangles, the
 * three hull circles of every living ship and each projectile's radius. Islands are drawn once; ships and
 * projectiles are redrawn every frame from the current simulation state (debug only, off by default).
 */
export class HitboxOverlayView {
  readonly container = new Container({ label: 'hitboxes' });
  private readonly dynamicShapes = new Graphics();

  constructor(arena: Arena) {
    const islands = new Graphics();
    for (const box of arena.islandColliders) {
      islands.rect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
    }
    islands.stroke({ width: 2, color: ISLAND_COLOUR, alpha: 0.9 });
    this.container.addChild(islands, this.dynamicShapes);
  }

  update(world: World): void {
    const shapes = this.dynamicShapes.clear();
    for (const ship of world.ships) {
      if (!ship.isAlive) continue;
      for (const centre of ship.hullCircleCenters()) shapes.circle(centre.x, centre.y, ship.hullRadius);
      shapes.stroke({ width: 2, color: ship.kind === 'player' ? PLAYER_COLOUR : ENEMY_COLOUR, alpha: 0.9 });
    }
    for (const projectile of world.projectiles) {
      shapes.circle(projectile.position.x, projectile.position.y, projectile.radius);
    }
    shapes.stroke({ width: 1.5, color: PROJECTILE_COLOUR, alpha: 0.9 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
