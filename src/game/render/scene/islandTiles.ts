import type { TileFrame } from '../assets/atlasFrames.generated';

/** Which orthogonal neighbours of a land tile are also land. */
export interface LandNeighbours {
  readonly north: boolean;
  readonly south: boolean;
  readonly east: boolean;
  readonly west: boolean;
}

/**
 * Sand-and-grass island tiles of the provided tile sheet (4 × 4 block, tiles 6–57): corners, edges and
 * centre. Variants are alternated by position so long coasts do not look repetitive.
 */
const ISLAND_TILES = {
  northWest: ['tile_6'],
  north: ['tile_7', 'tile_8'],
  northEast: ['tile_9'],
  west: ['tile_22', 'tile_38'],
  centre: ['tile_23', 'tile_39', 'tile_40', 'tile_24'],
  east: ['tile_25', 'tile_41'],
  southWest: ['tile_54'],
  south: ['tile_55', 'tile_56'],
  southEast: ['tile_57'],
} as const satisfies Record<string, readonly TileFrame[]>;

type IslandPiece = keyof typeof ISLAND_TILES;

function islandPieceFor({ north, south, east, west }: LandNeighbours): IslandPiece {
  if (!north && !west) return 'northWest';
  if (!north && !east) return 'northEast';
  if (!south && !west) return 'southWest';
  if (!south && !east) return 'southEast';
  if (!north) return 'north';
  if (!south) return 'south';
  if (!west) return 'west';
  if (!east) return 'east';
  return 'centre';
}

/**
 * Picks the tile art of a land tile from its neighbours. Islands must be at least two tiles thick
 * (see DEFAULT_ARENA); inner (concave) corners use the centre tile.
 */
export function islandTileFor(neighbours: LandNeighbours, column: number, row: number): TileFrame {
  const variants: readonly TileFrame[] = ISLAND_TILES[islandPieceFor(neighbours)];
  return variants[(column * 7 + row * 3) % variants.length] ?? variants[0] ?? 'tile_23';
}
