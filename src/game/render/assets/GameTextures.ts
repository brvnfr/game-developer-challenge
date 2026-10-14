import type { Spritesheet, Texture } from 'pixi.js';
import type { ShipFrame, TileFrame, UiFrame } from './atlasFrames.generated';

/** Typed access to the loaded atlases. Textures are shared by every match and never destroyed by scenes. */
export class GameTextures {
  constructor(
    private readonly ships: Spritesheet,
    private readonly tiles: Spritesheet,
    private readonly ui: Spritesheet,
    /** Standalone sea texture (not in an atlas) so it can repeat across the arena. */
    readonly water: Texture,
  ) {}

  ship(frame: ShipFrame): Texture {
    return GameTextures.frameOf(this.ships, frame);
  }

  tile(frame: TileFrame): Texture {
    return GameTextures.frameOf(this.tiles, frame);
  }

  uiElement(frame: UiFrame): Texture {
    return GameTextures.frameOf(this.ui, frame);
  }

  private static frameOf(sheet: Spritesheet, frame: string): Texture {
    const texture = sheet.textures[frame];
    if (!texture) throw new Error(`Missing texture "${frame}"`);
    return texture;
  }
}
