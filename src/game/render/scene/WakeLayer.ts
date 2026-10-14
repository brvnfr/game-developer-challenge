import { Container, Sprite, Texture } from 'pixi.js';
import type { Vector2 } from '@/game/core/math/Vector2';

const PUFF_TEXTURE_SIZE = 32;
const PUFF_LIFETIME_SECONDS = 1.3;
const PUFF_START_ALPHA = 0.8;
/** Puffs grow from this fraction of their size to full size while they fade. */
const PUFF_START_SCALE = 0.35;
/** Older puffs are recycled beyond this many, which bounds the cost of crowded fights. */
const MAX_PUFFS = 360;

interface Puff {
  readonly sprite: Sprite;
  ageSeconds: number;
  size: number;
}

/** Soft white disc drawn once on a canvas; shared by every puff. */
function createPuffTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = PUFF_TEXTURE_SIZE;
  canvas.height = PUFF_TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (context) {
    const radius = PUFF_TEXTURE_SIZE / 2;
    const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.65)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, PUFF_TEXTURE_SIZE, PUFF_TEXTURE_SIZE);
  }
  return Texture.from(canvas);
}

/**
 * Foam left on the water behind moving ships: short-lived soft puffs that spread and fade. Sprites are pooled
 * and share one texture, so a crowded fight costs one batched draw and no allocations once warmed up.
 */
export class WakeLayer {
  readonly container = new Container({ label: 'wakes' });
  private readonly texture = createPuffTexture();
  private readonly active: Puff[] = [];
  private readonly idle: Puff[] = [];

  get activeCount(): number {
    return this.active.length;
  }

  emit(position: Vector2, size: number): void {
    const puff = this.idle.pop() ?? this.recycleOrCreate();
    puff.ageSeconds = 0;
    puff.size = size;
    puff.sprite.position.set(position.x, position.y);
    puff.sprite.visible = true;
    this.active.push(puff);
    this.render(puff);
  }

  /** `deltaSeconds` is presentation time (0 while paused: the foam stays where it is). */
  update(deltaSeconds: number): void {
    if (deltaSeconds <= 0) return;
    for (let index = this.active.length - 1; index >= 0; index--) {
      const puff = this.active[index];
      if (!puff) continue;
      puff.ageSeconds += deltaSeconds;
      if (puff.ageSeconds >= PUFF_LIFETIME_SECONDS) {
        puff.sprite.visible = false;
        this.active.splice(index, 1);
        this.idle.push(puff);
      } else {
        this.render(puff);
      }
    }
  }

  clear(): void {
    for (const puff of this.active) puff.sprite.visible = false;
    this.idle.push(...this.active);
    this.active.length = 0;
  }

  destroy(): void {
    this.active.length = 0;
    this.idle.length = 0;
    this.container.destroy({ children: true });
    this.texture.destroy(true);
  }

  private recycleOrCreate(): Puff {
    if (this.active.length >= MAX_PUFFS) {
      const oldest = this.active.shift();
      if (oldest) return oldest;
    }
    const sprite = new Sprite({ texture: this.texture, anchor: 0.5 });
    this.container.addChild(sprite);
    return { sprite, ageSeconds: 0, size: 0 };
  }

  private render(puff: Puff): void {
    const progress = puff.ageSeconds / PUFF_LIFETIME_SECONDS;
    const scale = (puff.size / PUFF_TEXTURE_SIZE) * (PUFF_START_SCALE + (1 - PUFF_START_SCALE) * Math.sqrt(progress));
    puff.sprite.scale.set(scale);
    puff.sprite.alpha = PUFF_START_ALPHA * (1 - progress) ** 1.5;
  }
}
