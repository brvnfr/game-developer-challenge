import { Container, Sprite } from 'pixi.js';
import type { Arena } from '@/game/sim/arena/Arena';
import type { TerrainKind } from '@/game/sim/arena/ArenaDefinition';
import type { TileFrame } from '../../assets/atlasFrames.generated';
import type { GameTextures } from '../../assets/GameTextures';
import { ARENA_DECOR, type DecorationPlacement } from './arenaDecor';
import { findConnectedParts, growRegion, shapeOf, type GridCell, type RegionTest } from './autotile';
import { GRASS_ISLAND_TILES, SAND_ISLAND_TILES, SHALLOW_WATER_TILES, tileFrameFor, type TileSetArt } from './tileSets';
import { WaterView } from './WaterView';

const ISLAND_ART: Readonly<Record<Exclude<TerrainKind, 'water'>, TileSetArt>> = {
  grassIsland: GRASS_ISLAND_TILES,
  sandIsland: SAND_ISLAND_TILES,
};
/** The shallows breathe slowly (alpha between 1 − depth and 1). */
const SHALLOWS_PULSE_RATE = 1.1;
const SHALLOWS_PULSE_DEPTH = 0.18;

export interface TerrainViewOptions {
  /** False when the player prefers reduced motion: the sea and the shallows stay still. */
  readonly isAnimated: boolean;
}

/**
 * Terrain built from the same arena definition used by the simulation, bottom to top:
 * - the animated sea (`WaterView`), the only layer covering the whole arena;
 * - shallow water around every island (autotiled, slowly pulsing);
 * - the islands and their props (autotiled per island kind).
 * Shallows and islands never change, so each island (with its shallows) is cached as its own small texture:
 * the cost of drawing them follows the area of the islands, not the area of the arena (this matters on devices
 * that rasterise WebGL in software).
 */
export class TerrainView {
  readonly container = new Container({ label: 'terrain' });
  private readonly water: WaterView;
  private readonly shallows = new Container({ label: 'shallows' });
  private readonly islands = new Container({ label: 'islands' });
  private elapsedSeconds = 0;

  constructor(
    private readonly arena: Arena,
    private readonly textures: GameTextures,
    private readonly options: TerrainViewOptions,
  ) {
    this.water = new WaterView(arena.width, arena.height, textures.water, options.isAnimated);
    const isLand: RegionTest = (column, row) => arena.isLandTile(column, row);
    const isShallow = growRegion(isLand, arena.columns, arena.rows);
    const decorations = ARENA_DECOR[arena.definition.id] ?? [];
    for (const part of findConnectedParts(arena.columns, arena.rows, isShallow)) {
      const shallows = this.paintPart(part, isShallow, () => SHALLOW_WATER_TILES, 'shallows-part');
      const island = this.paintPart(part, isLand, (column, row) => this.islandArtAt(column, row), 'island');
      this.placeDecorations(island, decorations, part);
      for (const [layer, cached] of [
        [this.shallows, shallows],
        [this.islands, island],
      ] as const) {
        layer.addChild(cached);
        cached.cacheAsTexture(true);
      }
    }
    this.container.addChild(this.water.sprite, this.shallows, this.islands);
  }

  /** `deltaSeconds` is presentation time: 0 while paused, so the sea freezes with the match. */
  update(deltaSeconds: number): void {
    this.water.update(deltaSeconds);
    if (!this.options.isAnimated || deltaSeconds <= 0) return;
    this.elapsedSeconds += deltaSeconds;
    this.shallows.alpha = 1 - SHALLOWS_PULSE_DEPTH * (0.5 + 0.5 * Math.sin(this.elapsedSeconds * SHALLOWS_PULSE_RATE));
  }

  destroy(): void {
    this.water.destroy();
    this.container.destroy({ children: true });
  }

  private islandArtAt(column: number, row: number): TileSetArt {
    const kind = this.arena.terrainAt(column, row);
    return kind === 'water' ? GRASS_ISLAND_TILES : ISLAND_ART[kind];
  }

  /**
   * Draws the cells of one part that belong to `isInside`, each with the tile set given by `artAt`. Shores are
   * computed against cells of the same art, so a grass island and a sand islet each keep their own shore.
   */
  private paintPart(
    part: readonly GridCell[],
    isInside: RegionTest,
    artAt: (column: number, row: number) => TileSetArt,
    label: string,
  ): Container {
    const layer = new Container({ label });
    for (const { column, row } of part) {
      if (!isInside(column, row)) continue;
      const art = artAt(column, row);
      const isSameArt: RegionTest = (otherColumn, otherRow) =>
        isInside(otherColumn, otherRow) && artAt(otherColumn, otherRow) === art;
      // Layouts are validated by tests; an unexpected shape still renders (as a plain centre tile).
      const shape = shapeOf(isSameArt, column, row) ?? 'centre';
      this.placeTile(layer, tileFrameFor(art, shape, column, row), column, row);
    }
    return layer;
  }

  private placeTile(layer: Container, frame: TileFrame, column: number, row: number): void {
    const { tileSize } = this.arena;
    const sprite = new Sprite(this.textures.tile(frame));
    sprite.position.set(column * tileSize, row * tileSize);
    sprite.setSize(tileSize, tileSize);
    layer.addChild(sprite);
  }

  /** Adds the props standing on this part's tiles. */
  private placeDecorations(
    island: Container,
    decorations: readonly DecorationPlacement[],
    part: readonly GridCell[],
  ): void {
    const { tileSize } = this.arena;
    const isInPart = (column: number, row: number) => part.some((cell) => cell.column === column && cell.row === row);
    for (const decoration of decorations) {
      if (!isInPart(Math.floor(decoration.x), Math.floor(decoration.y))) continue;
      const sprite = new Sprite({ texture: this.textures.tile(decoration.frame), anchor: 0.5 });
      sprite.setSize(tileSize * (decoration.scale ?? 1));
      sprite.position.set(decoration.x * tileSize, decoration.y * tileSize);
      sprite.rotation = decoration.rotation ?? 0;
      island.addChild(sprite);
    }
  }
}
