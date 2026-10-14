import { Container, Sprite } from 'pixi.js';
import type { Arena } from '@/game/sim/arena/Arena';
import type { TileFrame } from '../assets/atlasFrames.generated';
import type { GameTextures } from '../assets/GameTextures';
import { WATER_TILE } from '../spriteCatalog';
import { islandTileFor } from './islandTiles';

/** Plants and rocks scattered on island interiors (chosen by a position hash, so always the same). */
const DECORATION_FRAMES: readonly TileFrame[] = ['tile_70', 'tile_72', 'tile_87', 'tile_88', 'tile_49', 'tile_71'];
const DECORATION_DENSITY = 3;

/**
 * Static terrain (water and islands) built from the same arena definition used by the simulation,
 * then cached as a single texture because it never changes during a match.
 */
export class TerrainView {
  readonly container = new Container({ label: 'terrain' });

  constructor(arena: Arena, textures: GameTextures) {
    const { tileSize } = arena;
    const isLand = (column: number, row: number) => arena.isLandTile(column, row);
    const place = (frame: TileFrame, column: number, row: number) => {
      const sprite = new Sprite(textures.tile(frame));
      sprite.position.set(column * tileSize, row * tileSize);
      sprite.setSize(tileSize, tileSize);
      this.container.addChild(sprite);
    };

    for (let row = 0; row < arena.rows; row++) {
      for (let column = 0; column < arena.columns; column++) {
        place(WATER_TILE, column, row);
        if (!isLand(column, row)) continue;
        const neighbours = {
          north: isLand(column, row - 1),
          south: isLand(column, row + 1),
          east: isLand(column + 1, row),
          west: isLand(column - 1, row),
        };
        place(islandTileFor(neighbours, column, row), column, row);
        const isInterior = neighbours.north && neighbours.south && neighbours.east && neighbours.west;
        const hash = column * 31 + row * 17;
        if (isInterior && hash % DECORATION_DENSITY === 0) {
          place(DECORATION_FRAMES[hash % DECORATION_FRAMES.length] ?? 'tile_70', column, row);
        }
      }
    }
    this.container.cacheAsTexture(true);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
