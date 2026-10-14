import { Container, Sprite } from 'pixi.js';
import type { Projectile } from '@/game/sim/entities/Projectile';
import type { GameTextures } from '../assets/GameTextures';
import { EFFECT_FRAMES } from '../spriteCatalog';

/**
 * Sprites of the projectiles in flight, keyed by projectile id. Sprites are pooled and reused,
 * so firing does not allocate display objects during combat.
 */
export class ProjectileViews {
  readonly container = new Container({ label: 'projectiles' });
  private readonly active = new Map<number, Sprite>();
  private readonly pool: Sprite[] = [];

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
      const sprite = this.active.get(projectile.id) ?? this.acquire(projectile.id);
      const position = projectile.previousPosition.lerp(projectile.position, interpolation);
      sprite.position.set(position.x, position.y);
    }
    for (const [id, sprite] of this.active) {
      if (!visibleIds.has(id)) this.release(id, sprite);
    }
  }

  clear(): void {
    for (const [id, sprite] of this.active) this.release(id, sprite);
  }

  destroy(): void {
    this.container.destroy({ children: true });
    this.active.clear();
    this.pool.length = 0;
  }

  private acquire(id: number): Sprite {
    const sprite =
      this.pool.pop() ?? new Sprite({ texture: this.textures.ship(EFFECT_FRAMES.cannonBall), anchor: 0.5 });
    sprite.visible = true;
    this.container.addChild(sprite);
    this.active.set(id, sprite);
    return sprite;
  }

  private release(id: number, sprite: Sprite): void {
    this.active.delete(id);
    sprite.visible = false;
    this.container.removeChild(sprite);
    this.pool.push(sprite);
  }
}
