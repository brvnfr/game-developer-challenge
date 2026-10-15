import { Container, Sprite, Texture } from 'pixi.js';
import { clamp } from '@/game/core/math/numbers';
import type { Projectile } from '@/game/sim/entities/Projectile';
import type { GameTextures } from '../assets/GameTextures';
import { EFFECT_FRAMES } from '../spriteCatalog';

/** The streak behind a cannonball: as long as the distance it covers in this many seconds, within limits. */
const TRAIL_SECONDS = 0.05;
const TRAIL_LENGTH = { min: 10, max: 30 } as const;
const TRAIL_THICKNESS = 3.5;
const TRAIL_ALPHA = 0.45;

interface ProjectileView {
  readonly container: Container;
  readonly trail: Sprite;
}

/**
 * Cannonballs in flight, keyed by projectile id: the ball and a short streak pointing back along its flight, so
 * fast shots stay readable. Views are pooled and reused, so firing does not allocate display objects in combat.
 */
export class ProjectileViews {
  readonly container = new Container({ label: 'projectiles' });
  private readonly active = new Map<number, ProjectileView>();
  private readonly pool: ProjectileView[] = [];

  constructor(private readonly textures: GameTextures) {}

  get activeCount(): number {
    return this.active.size;
  }

  get pooledCount(): number {
    return this.pool.length;
  }

  sync(projectiles: readonly Projectile[], interpolation: number): void {
    const visibleIds = new Set<number>();
    for (const projectile of projectiles) {
      if (!projectile.isActive) continue;
      visibleIds.add(projectile.id);
      const view = this.active.get(projectile.id) ?? this.acquire(projectile.id);
      const position = projectile.previousPosition.lerp(projectile.position, interpolation);
      view.container.position.set(position.x, position.y);
      const { velocity } = projectile;
      view.trail.rotation = Math.atan2(velocity.y, velocity.x);
      view.trail.width = clamp(velocity.length * TRAIL_SECONDS, TRAIL_LENGTH.min, TRAIL_LENGTH.max);
    }
    for (const [id, view] of this.active) {
      if (!visibleIds.has(id)) this.release(id, view);
    }
  }

  clear(): void {
    for (const [id, view] of this.active) this.release(id, view);
  }

  destroy(): void {
    this.container.destroy({ children: true });
    this.active.clear();
    this.pool.length = 0;
  }

  private acquire(id: number): ProjectileView {
    const view = this.pool.pop() ?? this.createView();
    view.container.visible = true;
    this.container.addChild(view.container);
    this.active.set(id, view);
    return view;
  }

  private createView(): ProjectileView {
    const container = new Container({ label: 'projectile' });
    const trail = new Sprite({ texture: Texture.WHITE, anchor: { x: 1, y: 0.5 }, alpha: TRAIL_ALPHA });
    trail.height = TRAIL_THICKNESS;
    const ball = new Sprite({ texture: this.textures.ship(EFFECT_FRAMES.cannonBall), anchor: 0.5 });
    container.addChild(trail, ball);
    return { container, trail };
  }

  private release(id: number, view: ProjectileView): void {
    this.active.delete(id);
    view.container.visible = false;
    this.container.removeChild(view.container);
    this.pool.push(view);
  }
}
