import type { TileFrame } from '../../assets/atlasFrames.generated';
import type { TileShape } from './autotile';

/**
 * Art of one 13-piece tile set (see `autotile.ts`). A piece may list variants: two for a straight shore
 * (alternating along it), four for the centre (a 2 × 2 pattern). The provided sheet draws the grass island as
 * a 4 × 4 block whose variants sit side by side, so alternating them by tile parity keeps the joins seamless.
 */
export type TileSetArt = Readonly<Record<TileShape, readonly TileFrame[]>>;

/** Grass island with a sand beach (tiles 6–57); the inner corners are tiles 36/37/52/53. */
export const GRASS_ISLAND_TILES: TileSetArt = {
  centre: ['tile_23', 'tile_24', 'tile_39', 'tile_40'],
  north: ['tile_7', 'tile_8'],
  south: ['tile_55', 'tile_56'],
  west: ['tile_22', 'tile_38'],
  east: ['tile_25', 'tile_41'],
  northWest: ['tile_6'],
  northEast: ['tile_9'],
  southWest: ['tile_54'],
  southEast: ['tile_57'],
  innerNorthWest: ['tile_53'],
  innerNorthEast: ['tile_52'],
  innerSouthWest: ['tile_37'],
  innerSouthEast: ['tile_36'],
};

/** Sand islet (tiles 1–35). The sheet has no concave sand corner: plain sand gives a crisp inner corner. */
export const SAND_ISLAND_TILES: TileSetArt = {
  centre: ['tile_18'],
  north: ['tile_2'],
  south: ['tile_34'],
  west: ['tile_17'],
  east: ['tile_19'],
  northWest: ['tile_1'],
  northEast: ['tile_3'],
  southWest: ['tile_33'],
  southEast: ['tile_35'],
  innerNorthWest: ['tile_18'],
  innerNorthEast: ['tile_18'],
  innerSouthWest: ['tile_18'],
  innerSouthEast: ['tile_18'],
};

/** Translucent shallow water around the islands (tiles 10–44, inner corners 58/59/74/75). */
export const SHALLOW_WATER_TILES: TileSetArt = {
  centre: ['tile_27'],
  north: ['tile_11'],
  south: ['tile_43'],
  west: ['tile_26'],
  east: ['tile_28'],
  northWest: ['tile_10'],
  northEast: ['tile_12'],
  southWest: ['tile_42'],
  southEast: ['tile_44'],
  innerNorthWest: ['tile_75'],
  innerNorthEast: ['tile_74'],
  innerSouthWest: ['tile_59'],
  innerSouthEast: ['tile_58'],
};

const isOdd = (value: number) => Math.abs(value % 2) === 1;

/** Picks the variant of a piece for a cell: by column along north/south shores, by row along west/east ones. */
export function tileFrameFor(art: TileSetArt, shape: TileShape, column: number, row: number): TileFrame {
  const variants = art[shape];
  const columnIndex = isOdd(column) ? 0 : 1;
  const rowIndex = isOdd(row) ? 0 : 1;
  let index = 0;
  if (variants.length === 4) index = rowIndex * 2 + columnIndex;
  else if (variants.length === 2) index = shape === 'north' || shape === 'south' ? columnIndex : rowIndex;
  const frame = variants[index] ?? variants[0];
  if (!frame) throw new Error(`Tile set has no art for "${shape}"`);
  return frame;
}
