import { clamp } from '@/game/core/math/numbers';
import { Vector2 } from '@/game/core/math/Vector2';

export interface ViewportLayout {
  /** Uniform world-to-screen scale (CSS pixels per world pixel). */
  readonly scale: number;
  /** Top-left corner of the world on screen (CSS pixels), centring it with letterbox bars. */
  readonly offsetX: number;
  readonly offsetY: number;
}

/** Highest device pixel ratio rendered; above it the extra pixels cost more than they show. */
export const MAX_RENDER_RESOLUTION = 2;

/**
 * Fits the fixed-size world into the available screen area while preserving its proportions
 * (letterboxing). The world size never changes, so resizing never alters the rules of a match.
 */
export class Viewport {
  private currentLayout: ViewportLayout = { scale: 1, offsetX: 0, offsetY: 0 };

  constructor(
    readonly worldWidth: number,
    readonly worldHeight: number,
  ) {}

  /** Recomputes the layout for a screen area in CSS pixels. */
  fit(screenWidth: number, screenHeight: number): ViewportLayout {
    const scale = Math.max(0.01, Math.min(screenWidth / this.worldWidth, screenHeight / this.worldHeight));
    this.currentLayout = {
      scale,
      offsetX: (screenWidth - this.worldWidth * scale) / 2,
      offsetY: (screenHeight - this.worldHeight * scale) / 2,
    };
    return this.currentLayout;
  }

  screenToWorld(screenX: number, screenY: number): Vector2 {
    const { scale, offsetX, offsetY } = this.currentLayout;
    return new Vector2((screenX - offsetX) / scale, (screenY - offsetY) / scale);
  }

  worldToScreen(world: Vector2): Vector2 {
    const { scale, offsetX, offsetY } = this.currentLayout;
    return new Vector2(world.x * scale + offsetX, world.y * scale + offsetY);
  }

  static renderResolutionFor(devicePixelRatio: number): number {
    return clamp(devicePixelRatio, 1, MAX_RENDER_RESOLUTION);
  }
}
