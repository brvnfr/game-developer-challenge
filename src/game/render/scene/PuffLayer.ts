import { Container, Sprite, Texture } from 'pixi.js';
import type { Vector2 } from '@/game/core/math/Vector2';

const PUFF_TEXTURE_SIZE = 32;

/** How the puffs of one layer look and move. */
export interface PuffStyle {
  readonly label: string;
  readonly lifetimeSeconds: number;
  /** Peak opacity, reached after `fadeInFraction` of the lifetime. */
  readonly startAlpha: number;
  /** Part of the lifetime spent fading in (0: puffs appear at full opacity, like foam). */
  readonly fadeInFraction: number;
  /** Puffs grow from this fraction of their size to full size while they fade. */
  readonly startScale: number;
  readonly tint: number;
  /** Opacity of the puff halfway to its rim (the centre is opaque, the rim clear): low for foam, high for smoke. */
  readonly bodyOpacity: number;
  /** Drift of every puff (world px/s), e.g. smoke carried by the wind. */
  readonly drift: { readonly x: number; readonly y: number };
  /** Older puffs are recycled beyond this many, which bounds the cost of crowded fights. */
  readonly maxPuffs: number;
}

/** Foam left on the water behind moving ships (under the ships). */
export const WAKE_STYLE: PuffStyle = {
  label: 'wakes',
  lifetimeSeconds: 1.3,
  startAlpha: 0.8,
  fadeInFraction: 0,
  startScale: 0.35,
  tint: 0xffffff,
  bodyOpacity: 0.65,
  drift: { x: 0, y: 0 },
  maxPuffs: 360,
};

/** Smoke rising from damaged ships (above the ships), carried by a light wind. */
export const SMOKE_STYLE: PuffStyle = {
  label: 'smoke',
  lifetimeSeconds: 2.2,
  startAlpha: 1,
  // Smoke thickens as it leaves the deck, so it trails the ship instead of greying the hull.
  fadeInFraction: 0.25,
  startScale: 0.35,
  tint: 0x5a5550,
  bodyOpacity: 0.95,
  drift: { x: 22, y: -38 },
  maxPuffs: 240,
};

interface Puff {
  readonly sprite: Sprite;
  ageSeconds: number;
  size: number;
  originX: number;
  originY: number;
}

/** Soft white disc drawn once on a canvas; each layer tints it. */
function createPuffTexture(bodyOpacity: number): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = PUFF_TEXTURE_SIZE;
  canvas.height = PUFF_TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (context) {
    const radius = PUFF_TEXTURE_SIZE / 2;
    const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.55, `rgba(255,255,255,${bodyOpacity})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, PUFF_TEXTURE_SIZE, PUFF_TEXTURE_SIZE);
  }
  return Texture.from(canvas);
}

/**
 * Short-lived soft puffs that spread, drift and fade: ship wakes and the smoke of damaged ships. Sprites are
 * pooled and share one texture, so a crowded fight costs one batched draw and no allocations once warmed up.
 */
export class PuffLayer {
  readonly container: Container;
  private readonly texture: Texture;
  private readonly active: Puff[] = [];
  private readonly idle: Puff[] = [];

  constructor(private readonly style: PuffStyle) {
    this.container = new Container({ label: style.label });
    this.texture = createPuffTexture(style.bodyOpacity);
  }

  get activeCount(): number {
    return this.active.length;
  }

  emit(position: Vector2, size: number): void {
    const puff = this.idle.pop() ?? this.recycleOrCreate();
    puff.ageSeconds = 0;
    puff.size = size;
    puff.originX = position.x;
    puff.originY = position.y;
    puff.sprite.visible = true;
    this.active.push(puff);
    this.render(puff);
  }

  /** `deltaSeconds` is presentation time (0 while paused: the puffs stay where they are). */
  update(deltaSeconds: number): void {
    if (deltaSeconds <= 0) return;
    for (let index = this.active.length - 1; index >= 0; index--) {
      const puff = this.active[index];
      if (!puff) continue;
      puff.ageSeconds += deltaSeconds;
      if (puff.ageSeconds >= this.style.lifetimeSeconds) {
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
    if (this.active.length >= this.style.maxPuffs) {
      const oldest = this.active.shift();
      if (oldest) return oldest;
    }
    const sprite = new Sprite({ texture: this.texture, anchor: 0.5, tint: this.style.tint });
    this.container.addChild(sprite);
    return { sprite, ageSeconds: 0, size: 0, originX: 0, originY: 0 };
  }

  private render(puff: Puff): void {
    const { lifetimeSeconds, startScale, startAlpha, fadeInFraction, drift } = this.style;
    const progress = puff.ageSeconds / lifetimeSeconds;
    const scale = (puff.size / PUFF_TEXTURE_SIZE) * (startScale + (1 - startScale) * Math.sqrt(progress));
    puff.sprite.scale.set(scale);
    const fadeIn = fadeInFraction > 0 ? Math.min(1, progress / fadeInFraction) : 1;
    puff.sprite.alpha = startAlpha * fadeIn * (1 - progress) ** 1.5;
    puff.sprite.position.set(puff.originX + drift.x * puff.ageSeconds, puff.originY + drift.y * puff.ageSeconds);
  }
}
