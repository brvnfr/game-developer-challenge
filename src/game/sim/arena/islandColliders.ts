import type { BoundingBox } from '@/game/core/math/geometry';

interface TileRun {
  readonly firstColumn: number;
  readonly lastColumn: number;
  readonly firstRow: number;
  readonly lastRow: number;
}

function findRowRuns(isLand: readonly boolean[]): { firstColumn: number; lastColumn: number }[] {
  const runs: { firstColumn: number; lastColumn: number }[] = [];
  let runStart = -1;
  isLand.forEach((isLandTile, column) => {
    if (isLandTile && runStart < 0) runStart = column;
    const isRunEnd = !isLandTile || column === isLand.length - 1;
    if (isRunEnd && runStart >= 0) {
      runs.push({ firstColumn: runStart, lastColumn: isLandTile ? column : column - 1 });
      runStart = -1;
    }
  });
  return runs;
}

/**
 * Merges land tiles into a small set of rectangles: horizontal runs per row, then runs with exactly
 * the same span on consecutive rows are joined vertically.
 */
export function buildIslandColliders(landGrid: readonly (readonly boolean[])[], tileSize: number): BoundingBox[] {
  let openRuns: TileRun[] = [];
  const closedRuns: TileRun[] = [];

  landGrid.forEach((rowTiles, row) => {
    const nextOpenRuns: TileRun[] = [];
    for (const run of findRowRuns(rowTiles)) {
      const continued = openRuns.find(
        (open) => open.firstColumn === run.firstColumn && open.lastColumn === run.lastColumn,
      );
      if (continued) {
        openRuns = openRuns.filter((open) => open !== continued);
        nextOpenRuns.push({ ...continued, lastRow: row });
      } else {
        nextOpenRuns.push({ ...run, firstRow: row, lastRow: row });
      }
    }
    closedRuns.push(...openRuns);
    openRuns = nextOpenRuns;
  });
  closedRuns.push(...openRuns);

  return closedRuns.map((run) => ({
    minX: run.firstColumn * tileSize,
    minY: run.firstRow * tileSize,
    maxX: (run.lastColumn + 1) * tileSize,
    maxY: (run.lastRow + 1) * tileSize,
  }));
}
