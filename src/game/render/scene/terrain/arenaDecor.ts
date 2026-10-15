import type { ShipFrame, TileFrame } from '../../assets/atlasFrames.generated';

/**
 * A prop drawn on an island (palm, rock, fort piece, wreck). Purely visual: islands already block ships and
 * shots through their tiles, so props never change the rules.
 */
export type DecorationPlacement =
  | {
      readonly atlas: 'tiles';
      readonly frame: TileFrame;
      /** Centre of the prop, in tile units (column + 0.5 is the middle of a tile). */
      readonly x: number;
      readonly y: number;
      /** Size relative to one tile. */
      readonly scale: number;
      /** Radians. */
      readonly rotation: number;
    }
  | {
      readonly atlas: 'ships';
      readonly frame: ShipFrame;
      readonly x: number;
      readonly y: number;
      /** Size relative to the art (ships and their parts are drawn 1:1 in the arena). */
      readonly scale: number;
      readonly rotation: number;
    };

const prop = (frame: TileFrame, x: number, y: number, scale = 1, rotation = 0): DecorationPlacement => ({
  atlas: 'tiles',
  frame,
  x,
  y,
  scale,
  rotation,
});

const shipProp = (frame: ShipFrame, x: number, y: number, scale = 1, rotation = 0): DecorationPlacement => ({
  atlas: 'ships',
  frame,
  x,
  y,
  scale,
  rotation,
});

/** A stone piece centred on its tile. */
const piece = (frame: TileFrame, column: number, row: number): DecorationPlacement =>
  prop(frame, column + 0.5, row + 0.5);

/** Fort Island (north-east): a walled fort, cannons on the walls, the gate facing the open water to the south. */
const FORT_ISLAND: readonly DecorationPlacement[] = [
  piece('tile_77', 21, 2),
  piece('tile_47', 22, 2),
  piece('tile_16', 23, 2),
  piece('tile_47', 24, 2),
  piece('tile_78', 25, 2),
  piece('tile_31', 21, 3),
  piece('tile_32', 25, 3),
  piece('tile_93', 21, 4),
  piece('tile_48', 22, 4),
  piece('tile_76', 23, 4),
  piece('tile_48', 24, 4),
  piece('tile_94', 25, 4),
  prop('tile_71', 23.5, 3.45, 0.85, 0.4),
  prop('tile_72', 26.5, 1.5, 0.75, 0.6),
  prop('tile_70', 20.5, 5.45, 0.7, -0.8),
];

/** Palm Island (west): the player's home waters; a dinghy pulled up on the beach facing the start. */
const PALM_ISLAND: readonly DecorationPlacement[] = [
  prop('tile_71', 2.45, 3.35, 1, 0.3),
  prop('tile_72', 3.95, 2.95, 0.8, -0.4),
  prop('tile_70', 4.65, 4.45, 0.8, 1.1),
  prop('tile_88', 3.2, 4.6),
  prop('tile_65', 1.95, 4.75, 0.6),
  shipProp('dinghy_large_1', 5.55, 5.15, 0.9, -2.3),
];

/** North sandbar: a lone palm. */
const NORTH_SANDBAR: readonly DecorationPlacement[] = [
  prop('tile_72', 12.05, 1.85, 0.8, 0.6),
  prop('tile_49', 13.2, 2.35, 0.55),
];

/** Ruins Island (centre): what is left of an older fort, overgrown. */
const RUINS_ISLAND: readonly DecorationPlacement[] = [
  piece('tile_90', 13, 8),
  piece('tile_14', 14, 8),
  piece('tile_89', 14, 9),
  prop('tile_66', 15.55, 8.35, 0.8),
  prop('tile_70', 12.75, 9.45, 0.75, 0.5),
  prop('tile_87', 15.4, 9.6),
  prop('tile_88', 13.3, 9.7),
];

/** Jungle Island (south-west): a band of palms. */
const JUNGLE_ISLAND: readonly DecorationPlacement[] = [
  prop('tile_71', 3.15, 13.4, 1, 0.3),
  prop('tile_72', 4.55, 13.1, 0.9, -0.5),
  prop('tile_71', 5.85, 13.55, 0.9, 1.2),
  prop('tile_70', 6.95, 13.2, 0.7, -0.3),
  prop('tile_87', 4.0, 14.05),
  prop('tile_88', 6.6, 14.05),
];

/** Wreck sandbar (south): a ship that ran aground on the reef rocks just east of it, planks around. */
const WRECK_SANDBAR: readonly DecorationPlacement[] = [
  shipProp('ship_22', 14.25, 14.95, 0.72, -2.2),
  shipProp('wood_2', 15.75, 15.55, 1, 0.5),
  shipProp('wood_3', 16.2, 14.2, 1, 1.2),
  shipProp('wood_1', 12.6, 15.6, 1, -0.4),
  prop('tile_70', 12.75, 14.55, 0.7, 0.9),
];

/** Turtle Island (south-east): mossy boulders, palms and a cannon left on the beach. */
const TURTLE_ISLAND: readonly DecorationPlacement[] = [
  prop('tile_65', 22.4, 12.4, 0.9),
  prop('tile_67', 24.6, 13.65, 0.8),
  prop('tile_72', 23.65, 12.25, 0.9, 0.7),
  prop('tile_71', 22.65, 13.9, 0.8, -0.6),
  shipProp('cannon_loose', 25.55, 14.55, 1, 1.0),
];

/** Props of each arena, by arena id. An arena without an entry simply has bare islands. */
export const ARENA_DECOR: Readonly<Record<string, readonly DecorationPlacement[]>> = {
  archipelago: [
    ...FORT_ISLAND,
    ...PALM_ISLAND,
    ...NORTH_SANDBAR,
    ...RUINS_ISLAND,
    ...JUNGLE_ISLAND,
    ...WRECK_SANDBAR,
    ...TURTLE_ISLAND,
  ],
};
