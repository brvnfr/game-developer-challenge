/**
 * Shore autotiling shared by the island and shallow-water layers.
 *
 * A region is a set of grid cells (an island kind, or the shallow water around the islands). Each cell of the
 * region gets a piece of a 13-piece tile set: the centre, four straight shores, four outer corners and four
 * inner (concave) corners. Some shapes have no art (a strip one tile thick, two concave corners in one tile…);
 * `shapeOf` returns null for them and the layouts are checked by tests with `findUnrenderableCells`.
 */
export type TileShape =
  | 'centre'
  | 'north'
  | 'south'
  | 'west'
  | 'east'
  | 'northWest'
  | 'northEast'
  | 'southWest'
  | 'southEast'
  | 'innerNorthWest'
  | 'innerNorthEast'
  | 'innerSouthWest'
  | 'innerSouthEast';

export const TILE_SHAPES: readonly TileShape[] = [
  'centre',
  'north',
  'south',
  'west',
  'east',
  'northWest',
  'northEast',
  'southWest',
  'southEast',
  'innerNorthWest',
  'innerNorthEast',
  'innerSouthWest',
  'innerSouthEast',
];

/** Membership test of a region; must answer false outside the grid. */
export type RegionTest = (column: number, row: number) => boolean;

interface Neighbourhood {
  readonly north: boolean;
  readonly south: boolean;
  readonly east: boolean;
  readonly west: boolean;
  readonly northWest: boolean;
  readonly northEast: boolean;
  readonly southWest: boolean;
  readonly southEast: boolean;
}

function neighbourhoodOf(isInside: RegionTest, column: number, row: number): Neighbourhood {
  return {
    north: isInside(column, row - 1),
    south: isInside(column, row + 1),
    east: isInside(column + 1, row),
    west: isInside(column - 1, row),
    northWest: isInside(column - 1, row - 1),
    northEast: isInside(column + 1, row - 1),
    southWest: isInside(column - 1, row + 1),
    southEast: isInside(column + 1, row + 1),
  };
}

/** Outer corner: two shores meet; the opposite diagonal must be inside, or the region is a thin strip there. */
function outerCornerOf(cell: Neighbourhood): TileShape | null {
  if (!cell.north && !cell.west) return cell.southEast ? 'northWest' : null;
  if (!cell.north && !cell.east) return cell.southWest ? 'northEast' : null;
  if (!cell.south && !cell.west) return cell.northEast ? 'southWest' : null;
  return cell.northWest ? 'southEast' : null;
}

/** Straight shore: both diagonals on the inland side must be inside (no concave corner on a shore tile). */
function straightShoreOf(cell: Neighbourhood): TileShape | null {
  if (!cell.north) return cell.southWest && cell.southEast ? 'north' : null;
  if (!cell.south) return cell.northWest && cell.northEast ? 'south' : null;
  if (!cell.west) return cell.northEast && cell.southEast ? 'west' : null;
  return cell.northWest && cell.southWest ? 'east' : null;
}

/** Interior tile: full centre, or an inner corner when exactly one diagonal is outside. */
function interiorOf(cell: Neighbourhood): TileShape | null {
  const outsideDiagonals: TileShape[] = [];
  if (!cell.northWest) outsideDiagonals.push('innerNorthWest');
  if (!cell.northEast) outsideDiagonals.push('innerNorthEast');
  if (!cell.southWest) outsideDiagonals.push('innerSouthWest');
  if (!cell.southEast) outsideDiagonals.push('innerSouthEast');
  if (outsideDiagonals.length > 1) return null;
  return outsideDiagonals[0] ?? 'centre';
}

/** Piece of the tile set for a cell inside the region, or null when the shape has no art. */
export function shapeOf(isInside: RegionTest, column: number, row: number): TileShape | null {
  const cell = neighbourhoodOf(isInside, column, row);
  if ((!cell.north && !cell.south) || (!cell.east && !cell.west)) return null;
  const outsideSides = [cell.north, cell.south, cell.east, cell.west].filter((inside) => !inside).length;
  if (outsideSides === 2) return outerCornerOf(cell);
  if (outsideSides === 1) return straightShoreOf(cell);
  return interiorOf(cell);
}

/** Cells of the region that `shapeOf` cannot draw (used by tests to validate arena layouts). */
export function findUnrenderableCells(
  columns: number,
  rows: number,
  isInside: RegionTest,
): { column: number; row: number }[] {
  const cells: { column: number; row: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (isInside(column, row) && shapeOf(isInside, column, row) === null) cells.push({ column, row });
    }
  }
  return cells;
}

/** The region grown by one tile in every direction (diagonals included): the shallow water around islands. */
export function growRegion(isInside: RegionTest, columns: number, rows: number): RegionTest {
  return (column, row) => {
    if (column < 0 || row < 0 || column >= columns || row >= rows) return false;
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
        if (isInside(column + columnOffset, row + rowOffset)) return true;
      }
    }
    return false;
  };
}

export interface GridCell {
  readonly column: number;
  readonly row: number;
}

/** Connected parts of a region (cells touching by a side or a corner), e.g. one per island and its shallows. */
export function findConnectedParts(columns: number, rows: number, isInside: RegionTest): GridCell[][] {
  const visited = new Set<number>();
  const parts: GridCell[][] = [];
  const keyOf = (column: number, row: number) => row * columns + column;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (!isInside(column, row) || visited.has(keyOf(column, row))) continue;
      const part: GridCell[] = [];
      const pending: GridCell[] = [{ column, row }];
      visited.add(keyOf(column, row));
      for (let cell = pending.pop(); cell; cell = pending.pop()) {
        part.push(cell);
        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
          for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
            const next = { column: cell.column + columnOffset, row: cell.row + rowOffset };
            const isInGrid = next.column >= 0 && next.row >= 0 && next.column < columns && next.row < rows;
            if (!isInGrid || visited.has(keyOf(next.column, next.row)) || !isInside(next.column, next.row)) continue;
            visited.add(keyOf(next.column, next.row));
            pending.push(next);
          }
        }
      }
      parts.push(part);
    }
  }
  return parts;
}
