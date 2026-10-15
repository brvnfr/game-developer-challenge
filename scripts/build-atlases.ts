/**
 * Builds the PixiJS texture atlases used by the game from the source files in `assets/`.
 *
 *   npm run assets
 *
 * Outputs (committed, so a clean checkout does not need to run this script):
 *   public/assets/game/ships.json + ships.png         ← assets/spritesheet/ships_miscellaneous_sheet.{xml,png}
 *   public/assets/game/tiles@1x.json + tiles@1x.png   ← assets/tilesheet/tiles_sheet.png (64×64 grid)
 *   public/assets/game/tiles@2x.json + tiles@2x.png   ← assets/tilesheet/tiles_sheet_retina.png (128×128 grid)
 *   public/assets/game/ui@1x.json / ui@2x.json (+png) ← assets/spritesheet/ui_sheet(_retina).json
 *   public/assets/game/water.png                      ← assets/png/retina/tiles/tile_73.png (repeating sea texture)
 *   public/assets/game/terrain@1x/@2x.json + .png     ← whole island blocks cut from the tile sheets (nine-slice art)
 *   src/game/render/assets/atlasFrames.generated.ts   ← typed frame names
 *
 * Notes:
 * - The ships "retina" XML/PNG pair has the same pixel size as the default one, so a single 1× atlas is produced.
 * - Ships XML is a Starling/Sparrow `TextureAtlas`; it is converted to the PixiJS JSON hash format.
 * - Tile numbering is row-major (tile_1 is top-left); verified against assets/png/default/tiles.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import { PNG } from 'pngjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = (...segments: string[]) => join(root, 'assets', ...segments);
const outputDirectory = join(root, 'public', 'assets', 'game');
const generatedTypesFile = join(root, 'src', 'game', 'render', 'assets', 'atlasFrames.generated.ts');

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface PixiFrame {
  frame: Rect;
  rotated: false;
  trimmed: false;
  spriteSourceSize: Rect;
  sourceSize: { w: number; h: number };
  anchor?: { x: number; y: number };
  borders?: { left: number; top: number; right: number; bottom: number };
}
interface PixiAtlas {
  frames: Record<string, PixiFrame>;
  meta: { app: string; image: string; format: 'RGBA8888'; size: { w: number; h: number }; scale: string };
}

function readPngSize(file: string): { w: number; h: number } {
  const bytes = readFileSync(file);
  // PNG signature (8 bytes) + IHDR length/type (8 bytes) → width/height at offsets 16 and 20.
  if (bytes.readUInt32BE(12) !== 0x49484452) throw new Error(`${file} is not a PNG`);
  return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}

function createFrame(x: number, y: number, w: number, h: number): PixiFrame {
  return {
    frame: { x, y, w, h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w, h },
    sourceSize: { w, h },
  };
}

function writeAtlas(
  name: string,
  image: string,
  sourceImage: string,
  frames: Record<string, PixiFrame>,
  scale: number,
) {
  const target = join(outputDirectory, image);
  if (sourceImage !== target) copyFileSync(sourceImage, target);
  const atlas: PixiAtlas = {
    frames,
    meta: {
      app: 'pirate-battle/scripts/build-atlases.ts',
      image,
      format: 'RGBA8888',
      size: readPngSize(sourceImage),
      scale: String(scale),
    },
  };
  writeFileSync(join(outputDirectory, `${name}.json`), `${JSON.stringify(atlas, null, 1)}\n`);
  return Object.keys(frames);
}

function buildShipsAtlas(): string[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const xml = parser.parse(readFileSync(sourcePath('spritesheet', 'ships_miscellaneous_sheet.xml'), 'utf8')) as {
    TextureAtlas: { SubTexture: { name: string; x: string; y: string; width: string; height: string }[] };
  };
  const frames: Record<string, PixiFrame> = {};
  for (const subTexture of xml.TextureAtlas.SubTexture) {
    frames[subTexture.name.replace(/\.png$/, '')] = createFrame(
      Number(subTexture.x),
      Number(subTexture.y),
      Number(subTexture.width),
      Number(subTexture.height),
    );
  }
  return writeAtlas('ships', 'ships.png', sourcePath('spritesheet', 'ships_miscellaneous_sheet.png'), frames, 1);
}

function buildTilesAtlas(file: string, name: string, tileSize: number, scale: number): string[] {
  const size = readPngSize(sourcePath('tilesheet', file));
  const columns = size.w / tileSize;
  const rows = size.h / tileSize;
  const frames: Record<string, PixiFrame> = {};
  for (let index = 0; index < columns * rows; index++) {
    frames[`tile_${index + 1}`] = createFrame(
      (index % columns) * tileSize,
      Math.floor(index / columns) * tileSize,
      tileSize,
      tileSize,
    );
  }
  return writeAtlas(name, `${name}.png`, sourcePath('tilesheet', file), frames, scale);
}

/**
 * The tile sheet draws each kind of island as one complete block (corners, shores and centre side by side). Its
 * tiles only join seamlessly in that arrangement, so islands are drawn by stretching the whole block as a
 * nine-slice instead of repeating tiles. Each block is copied with transparent padding, so filtering never
 * samples the neighbouring tiles of the sheet.
 */
const TERRAIN_BLOCKS = [
  { name: 'island_grass', column: 5, row: 0, size: 4 }, // tiles 6–57
  { name: 'island_sand', column: 0, row: 0, size: 3 }, // tiles 1–35
  { name: 'shallows', column: 9, row: 0, size: 3 }, // tiles 10–44
] as const;
const TERRAIN_PADDING_TILES = 1 / 16;

function buildTerrainAtlas(file: string, name: string, tileSize: number, scale: number): string[] {
  const sheet = PNG.sync.read(readFileSync(sourcePath('tilesheet', file)));
  const padding = tileSize * TERRAIN_PADDING_TILES;
  const width = TERRAIN_BLOCKS.reduce((total, block) => total + block.size * tileSize + padding * 2, 0);
  const height = Math.max(...TERRAIN_BLOCKS.map((block) => block.size * tileSize)) + padding * 2;
  const atlas = new PNG({ width, height });
  const frames: Record<string, PixiFrame> = {};
  let x = padding;
  for (const block of TERRAIN_BLOCKS) {
    const blockSize = block.size * tileSize;
    PNG.bitblt(sheet, atlas, block.column * tileSize, block.row * tileSize, blockSize, blockSize, x, padding);
    frames[block.name] = {
      ...createFrame(x, padding, blockSize, blockSize),
      borders: { left: tileSize, top: tileSize, right: tileSize, bottom: tileSize },
    };
    x += blockSize + padding * 2;
  }
  const imageFile = join(outputDirectory, `${name}.png`);
  writeFileSync(imageFile, PNG.sync.write(atlas));
  return writeAtlas(name, `${name}.png`, imageFile, frames, scale);
}

function buildUiAtlas(file: string, name: string, scale: number): string[] {
  const json = JSON.parse(readFileSync(sourcePath('spritesheet', file), 'utf8')) as {
    frames: Record<string, PixiFrame & { ui?: unknown }>;
    meta: { image: string };
  };
  const frames: Record<string, PixiFrame> = {};
  for (const [frameName, frameData] of Object.entries(json.frames)) {
    const { ui: _uiMetadata, ...pixiFrame } = frameData;
    frames[frameName] = pixiFrame;
  }
  return writeAtlas(name, `${name}.png`, sourcePath('spritesheet', json.meta.image), frames, scale);
}

function renderFrameList(name: string, frameNames: string[]): string {
  const sorted = [...frameNames].sort((first, second) => first.localeCompare(second, 'en', { numeric: true }));
  return `export const ${name} = [\n${sorted.map((frameName) => `  '${frameName}',`).join('\n')}\n] as const;\n`;
}

mkdirSync(outputDirectory, { recursive: true });
// The sea is drawn as one repeating texture (TilingSprite), which needs a standalone image rather than an atlas frame.
copyFileSync(sourcePath('png', 'retina', 'tiles', 'tile_73.png'), join(outputDirectory, 'water.png'));
const shipFrames = buildShipsAtlas();
const tileFrames = buildTilesAtlas('tiles_sheet.png', 'tiles@1x', 64, 1);
const retinaTileFrames = buildTilesAtlas('tiles_sheet_retina.png', 'tiles@2x', 128, 2);
const terrainFrames = buildTerrainAtlas('tiles_sheet.png', 'terrain@1x', 64, 1);
const retinaTerrainFrames = buildTerrainAtlas('tiles_sheet_retina.png', 'terrain@2x', 128, 2);
const uiFrames = buildUiAtlas('ui_sheet.json', 'ui@1x', 1);
const retinaUiFrames = buildUiAtlas('ui_sheet_retina.json', 'ui@2x', 2);
if (
  tileFrames.length !== retinaTileFrames.length ||
  terrainFrames.length !== retinaTerrainFrames.length ||
  uiFrames.length !== retinaUiFrames.length
) {
  throw new Error('1× and 2× atlases differ');
}

writeFileSync(
  generatedTypesFile,
  [
    '// AUTO-GENERATED by scripts/build-atlases.ts — do not edit by hand. Run `npm run assets`.\n',
    renderFrameList('SHIP_FRAMES', shipFrames),
    renderFrameList('TILE_FRAMES', tileFrames),
    renderFrameList('TERRAIN_FRAMES', terrainFrames),
    renderFrameList('UI_FRAMES', uiFrames),
    'export type ShipFrame = (typeof SHIP_FRAMES)[number];',
    'export type TileFrame = (typeof TILE_FRAMES)[number];',
    'export type TerrainFrame = (typeof TERRAIN_FRAMES)[number];',
    'export type UiFrame = (typeof UI_FRAMES)[number];\n',
  ].join('\n'),
);
console.info(
  `Atlases written: ships(${shipFrames.length}) tiles(${tileFrames.length}) terrain(${terrainFrames.length}) ui(${uiFrames.length})`,
);
