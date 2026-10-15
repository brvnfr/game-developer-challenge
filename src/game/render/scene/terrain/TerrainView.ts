import { Container, Graphics, NineSliceSprite, Sprite, type Texture } from 'pixi.js';
import type { Arena } from '@/game/sim/arena/Arena';
import type { TerrainFrame, TileFrame } from '../../assets/atlasFrames.generated';
import type { GameTextures } from '../../assets/GameTextures';
import { ARENA_DECOR, type DecorationPlacement } from './arenaDecor';
import { readIslands, readRocks, type GridCell, type IslandArea, type IslandKind } from './islandLayout';
import { WaterView } from './WaterView';

const ISLAND_ART: Readonly<Record<IslandKind, TerrainFrame>> = {
  grassIsland: 'island_grass',
  sandIsland: 'island_sand',
};
/** Rock art, chosen per rock by its position so the reef does not repeat one stone. */
const ROCK_FRAMES: readonly TileFrame[] = ['tile_50', 'tile_66', 'tile_51', 'tile_67', 'tile_49', 'tile_65'];
const ROCK_SCALE = 1.15;
/** Light water around a rock, as a fraction of a tile. */
const ROCK_SHALLOWS_SIZE = 2;
/** The shallows breathe slowly (alpha between 1 − depth and 1). */
const SHALLOWS_PULSE_RATE = 1.1;
const SHALLOWS_PULSE_DEPTH = 0.18;
/** Water outside the arena is darkened, and a faint line marks the edge ships cannot cross. */
const OUTSIDE_SHADE = { color: 0x041a2b, alpha: 0.32 } as const;
const EDGE_LINE = { width: 3, color: 0xffffff, alpha: 0.22 } as const;

export interface TerrainViewOptions {
  /** False when the player prefers reduced motion: the sea and the shallows stay still. */
  readonly isAnimated: boolean;
}

/**
 * Terrain built from the same arena definition used by the simulation, bottom to top:
 * - the animated sea (`WaterView`);
 * - shallow water one tile wide around every island and a ring around each reef rock (slowly pulsing);
 * - the islands, their props and the rocks.
 *
 * The tile sheet draws each kind of island as one complete block whose tiles only join seamlessly in that
 * arrangement, so an island is not assembled from repeated tiles: the whole block is stretched over the island
 * as a nine-slice (corners kept, shores and centre stretched). Shores therefore always meet their corners the way
 * the art was drawn, with no seams. Shallows and islands never change, so each island is cached as its own small
 * texture: the cost of drawing them follows the area of the islands, not of the arena.
 */
export class TerrainView {
  readonly container = new Container({ label: 'terrain' });
  private readonly water: WaterView;
  private readonly shallows = new Container({ label: 'shallows' });
  private readonly islands = new Container({ label: 'islands' });
  private readonly outside = new Graphics({ label: 'outside-arena' });
  private elapsedSeconds = 0;

  constructor(
    private readonly arena: Arena,
    private readonly textures: GameTextures,
    private readonly options: TerrainViewOptions,
  ) {
    this.water = new WaterView(arena.width, arena.height, textures.water, options.isAnimated);
    const decorations = ARENA_DECOR[arena.definition.id] ?? [];
    const { islands } = readIslands(arena);
    islands.forEach((island, index) => {
      this.addCached(this.shallows, this.nineSlice('shallows', expand(island, 1), false));
      const view = this.nineSlice(ISLAND_ART[island.kind], island, index % 2 === 1);
      for (const decoration of decorations) {
        if (isInside(decoration, island)) view.addChild(this.decorationSprite(decoration, island));
      }
      this.addCached(this.islands, view);
    });
    // Props outside every island (planks drifting off the wreck) float on the water.
    for (const decoration of decorations) {
      if (!islands.some((island) => isInside(decoration, island))) {
        this.islands.addChild(this.decorationSprite(decoration, WORLD_ORIGIN));
      }
    }
    for (const rock of readRocks(arena)) {
      this.shallows.addChild(this.rockShallows(rock));
      this.islands.addChild(this.rockSprite(rock));
    }
    this.container.addChild(this.water.sprite, this.shallows, this.islands, this.outside);
    this.showVisibleArea(0, 0, arena.width, arena.height);
  }

  /**
   * The part of the world on screen (it extends past the arena when the screen has another shape): the sea fills
   * it, and what lies outside the arena is shaded so its edge stays readable.
   */
  showVisibleArea(x: number, y: number, width: number, height: number): void {
    this.water.cover(x, y, width, height);
    const { width: arenaWidth, height: arenaHeight } = this.arena;
    const right = x + width;
    const bottom = y + height;
    this.outside.clear();
    if (y < 0) this.outside.rect(x, y, width, -y);
    if (bottom > arenaHeight) this.outside.rect(x, arenaHeight, width, bottom - arenaHeight);
    if (x < 0) this.outside.rect(x, 0, -x, arenaHeight);
    if (right > arenaWidth) this.outside.rect(arenaWidth, 0, right - arenaWidth, arenaHeight);
    this.outside.fill(OUTSIDE_SHADE);
    if (x < 0 || y < 0 || right > arenaWidth || bottom > arenaHeight) {
      this.outside.rect(0, 0, arenaWidth, arenaHeight).stroke(EDGE_LINE);
    }
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

  private addCached(layer: Container, view: Container): void {
    layer.addChild(view);
    view.cacheAsTexture(true);
  }

  /**
   * The whole block art stretched over `area`: one-tile corners, stretched shores and centre. `isMirrored` flips
   * it horizontally (alternate islands), so the details of the centre do not sit in the same place everywhere.
   */
  private nineSlice(frame: TerrainFrame, area: IslandArea, isMirrored: boolean): Container {
    const { tileSize } = this.arena;
    const texture: Texture = this.textures.terrain(frame);
    const border = texture.width / sliceCount(frame);
    // Sizes are in the art's units (one tile = `border`), then scaled so one tile spans `tileSize`.
    const sprite = new NineSliceSprite({
      texture,
      leftWidth: border,
      topHeight: border,
      rightWidth: border,
      bottomHeight: border,
      width: area.columns * border,
      height: area.rows * border,
    });
    sprite.scale.set(tileSize / border);
    const holder = new Container({ label: frame });
    holder.addChild(sprite);
    if (isMirrored) {
      sprite.scale.x *= -1;
      sprite.x = area.columns * tileSize;
    }
    holder.position.set(area.column * tileSize, area.row * tileSize);
    return holder;
  }

  private decorationSprite(decoration: DecorationPlacement, island: IslandArea): Sprite {
    const { tileSize } = this.arena;
    const texture =
      decoration.atlas === 'tiles' ? this.textures.tile(decoration.frame) : this.textures.ship(decoration.frame);
    const sprite = new Sprite({ texture, anchor: 0.5, rotation: decoration.rotation });
    if (decoration.atlas === 'tiles') sprite.setSize(tileSize * decoration.scale);
    else sprite.scale.set(decoration.scale);
    // Props are children of their island's view, which sits at the island's top-left tile.
    sprite.position.set((decoration.x - island.column) * tileSize, (decoration.y - island.row) * tileSize);
    return sprite;
  }

  private rockSprite(rock: GridCell): Sprite {
    const { tileSize } = this.arena;
    const frame = ROCK_FRAMES[(rock.column * 7 + rock.row * 3) % ROCK_FRAMES.length] ?? 'tile_50';
    const sprite = new Sprite({ texture: this.textures.tile(frame), anchor: 0.5 });
    sprite.setSize(tileSize * ROCK_SCALE);
    sprite.position.set((rock.column + 0.5) * tileSize, (rock.row + 0.5) * tileSize);
    return sprite;
  }

  private rockShallows(rock: GridCell): Sprite {
    const { tileSize } = this.arena;
    const sprite = new Sprite({ texture: this.textures.terrain('shallows'), anchor: 0.5 });
    sprite.setSize(tileSize * ROCK_SHALLOWS_SIZE);
    sprite.position.set((rock.column + 0.5) * tileSize, (rock.row + 0.5) * tileSize);
    return sprite;
  }
}

/** Area whose top-left tile is the arena's origin: positions props placed directly in the world. */
const WORLD_ORIGIN: IslandArea = { kind: 'sandIsland', column: 0, row: 0, columns: 0, rows: 0 };

/** Tiles per side of each block of the terrain atlas (see scripts/build-atlases.ts). */
function sliceCount(frame: TerrainFrame): number {
  return frame === 'island_grass' ? 4 : 3;
}

function expand(area: IslandArea, tiles: number): IslandArea {
  return {
    ...area,
    column: area.column - tiles,
    row: area.row - tiles,
    columns: area.columns + tiles * 2,
    rows: area.rows + tiles * 2,
  };
}

function isInside(decoration: DecorationPlacement, island: IslandArea): boolean {
  return (
    decoration.x >= island.column &&
    decoration.x <= island.column + island.columns &&
    decoration.y >= island.row &&
    decoration.y <= island.row + island.rows
  );
}
