import type { Spritesheet, Texture } from 'pixi.js';
import type { ShipFrame, TerrainFrame, TileFrame, UiFrame } from './atlasFrames.generated';

export interface GameAtlases {
  readonly ships: Spritesheet;
  readonly tiles: Spritesheet;
  /** Whole island blocks of the tile sheet, drawn as nine-slices. */
  readonly terrain: Spritesheet;
  readonly ui: Spritesheet;
  /** Standalone sea texture (not in an atlas) so it can repeat across the arena. */
  readonly water: Texture;
}

/** Typed access to the loaded atlases. Textures are shared by every match and never destroyed by scenes. */
export class GameTextures {
  readonly water: Texture;

  constructor(private readonly atlases: GameAtlases) {
    this.water = atlases.water;
  }

  ship(frame: ShipFrame): Texture {
    return GameTextures.frameOf(this.atlases.ships, frame);
  }

  tile(frame: TileFrame): Texture {
    return GameTextures.frameOf(this.atlases.tiles, frame);
  }

  terrain(frame: TerrainFrame): Texture {
    return GameTextures.frameOf(this.atlases.terrain, frame);
  }

  uiElement(frame: UiFrame): Texture {
    return GameTextures.frameOf(this.atlases.ui, frame);
  }

  private static frameOf(sheet: Spritesheet, frame: string): Texture {
    const texture = sheet.textures[frame];
    if (!texture) throw new Error(`Missing texture "${frame}"`);
    return texture;
  }
}
