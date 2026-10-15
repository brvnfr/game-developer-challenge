import { circleBoxSeparation, circleOverlapsBox, segmentBoxEntry, type BoundingBox } from '@/game/core/math/geometry';
import { Vector2 } from '@/game/core/math/Vector2';
import { isLand, isObstacle, terrainKindOf, type ArenaDefinition, type TerrainKind } from './ArenaDefinition';
import { buildIslandColliders } from './islandColliders';

export interface CircleResolution {
  readonly position: Vector2;
  readonly touchedIsland: boolean;
  readonly touchedBounds: boolean;
}

const MAX_SEPARATION_PASSES = 4;
/** A reef rock's collider leaves this fraction of the tile free on each side (the rock art is smaller). */
const ROCK_INSET = 0.18;

/** Static playfield: bounds and island colliders, with the spatial queries used by every system. */
export class Arena {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
  readonly columns: number;
  readonly rows: number;
  /** Every obstacle as an axis-aligned box: merged island tiles, then one smaller box per reef rock. */
  readonly islandColliders: readonly BoundingBox[];
  private readonly terrainGrid: readonly (readonly TerrainKind[])[];
  private readonly obstacleGrid: readonly (readonly boolean[])[];

  constructor(readonly definition: ArenaDefinition) {
    const { tiles, tileSize } = definition;
    this.tileSize = tileSize;
    this.rows = tiles.length;
    this.columns = tiles[0]?.length ?? 0;
    if (this.rows === 0 || this.columns === 0) throw new Error('Arena must have at least one tile');
    if (tiles.some((row) => row.length !== this.columns)) throw new Error('All arena rows must have the same length');
    this.width = this.columns * tileSize;
    this.height = this.rows * tileSize;
    this.terrainGrid = tiles.map((row) =>
      Array.from(row, (character) => {
        const kind = terrainKindOf(character);
        if (!kind) throw new Error(`Unknown arena tile "${character}" (use ".", "#", "s" or "r")`);
        return kind;
      }),
    );
    this.obstacleGrid = this.terrainGrid.map((row) => row.map(isObstacle));
    this.islandColliders = [
      ...buildIslandColliders(
        this.terrainGrid.map((row) => row.map(isLand)),
        tileSize,
      ),
      ...this.rockColliders(),
    ];
  }

  get playerStart(): Vector2 {
    const { column, row } = this.definition.playerStart;
    return new Vector2(column * this.tileSize, row * this.tileSize);
  }

  /** True for any tile ships cannot sail through (island or reef rock). */
  isLandTile(column: number, row: number): boolean {
    return this.obstacleGrid[row]?.[column] ?? false;
  }

  /** Terrain of a tile; outside the arena is open water. */
  terrainAt(column: number, row: number): TerrainKind {
    return this.terrainGrid[row]?.[column] ?? 'water';
  }

  contains(point: Vector2, margin = 0): boolean {
    return point.x >= margin && point.y >= margin && point.x <= this.width - margin && point.y <= this.height - margin;
  }

  /** True when the circle overlaps an island or crosses the arena bounds. */
  isCircleBlocked(center: Vector2, radius: number): boolean {
    if (!this.contains(center, radius)) return true;
    return this.islandColliders.some((island) => circleOverlapsBox(center, radius, island));
  }

  /** Moves a circle out of islands and back inside the bounds. */
  resolveCircle(center: Vector2, radius: number): CircleResolution {
    let position = center;
    let touchedIsland = false;
    for (let pass = 0; pass < MAX_SEPARATION_PASSES; pass++) {
      let moved = false;
      for (const island of this.islandColliders) {
        const separation = circleBoxSeparation(position, radius, island);
        if (separation) {
          position = position.add(separation);
          moved = true;
          touchedIsland = true;
        }
      }
      if (!moved) break;
    }
    const clamped = new Vector2(
      Math.min(Math.max(position.x, radius), this.width - radius),
      Math.min(Math.max(position.y, radius), this.height - radius),
    );
    return { position: clamped, touchedIsland, touchedBounds: !clamped.equals(position) };
  }

  /** Fraction of the segment start→end where it first enters an island, or null. Bounds are ignored. */
  findIslandEntry(start: Vector2, end: Vector2): number | null {
    let firstEntry: number | null = null;
    for (const island of this.islandColliders) {
      const entry = segmentBoxEntry(start, end, island);
      if (entry !== null && (firstEntry === null || entry < firstEntry)) firstEntry = entry;
    }
    return firstEntry;
  }

  /** Free distance from `origin` along `heading`, up to `maxDistance`. Islands and bounds block. */
  measureClearance(origin: Vector2, heading: number, maxDistance: number): number {
    const end = origin.add(Vector2.fromAngle(heading).scale(maxDistance));
    let fraction = this.findIslandEntry(origin, end) ?? 1;
    const deltaX = end.x - origin.x;
    const deltaY = end.y - origin.y;
    if (deltaX < 0) fraction = Math.min(fraction, -origin.x / deltaX);
    if (deltaX > 0) fraction = Math.min(fraction, (this.width - origin.x) / deltaX);
    if (deltaY < 0) fraction = Math.min(fraction, -origin.y / deltaY);
    if (deltaY > 0) fraction = Math.min(fraction, (this.height - origin.y) / deltaY);
    return Math.max(0, fraction) * maxDistance;
  }

  hasLineOfSight(from: Vector2, to: Vector2): boolean {
    return this.findIslandEntry(from, to) === null;
  }

  /** Centers of every water tile (fallback candidates for spawn points). */
  waterTileCenters(): Vector2[] {
    const centers: Vector2[] = [];
    for (let row = 0; row < this.rows; row++) {
      for (let column = 0; column < this.columns; column++) {
        if (!this.isLandTile(column, row))
          centers.push(new Vector2((column + 0.5) * this.tileSize, (row + 0.5) * this.tileSize));
      }
    }
    return centers;
  }

  private rockColliders(): BoundingBox[] {
    const inset = this.tileSize * ROCK_INSET;
    const boxes: BoundingBox[] = [];
    this.terrainGrid.forEach((row, rowIndex) => {
      row.forEach((kind, column) => {
        if (kind !== 'rock') return;
        boxes.push({
          minX: column * this.tileSize + inset,
          minY: rowIndex * this.tileSize + inset,
          maxX: (column + 1) * this.tileSize - inset,
          maxY: (rowIndex + 1) * this.tileSize - inset,
        });
      });
    });
    return boxes;
  }
}
