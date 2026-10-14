import type { TileFrame } from '../../assets/atlasFrames.generated';

/**
 * A prop drawn on an island (palm, rock, fort piece). Purely visual: islands already block ships and shots
 * through their tiles, so props never change the rules.
 */
export interface DecorationPlacement {
  readonly frame: TileFrame;
  /** Centre of the prop, in tile units (column + 0.5 is the middle of a tile). */
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  /** Radians. */
  readonly rotation?: number;
}

const prop = (frame: TileFrame, x: number, y: number, scale = 1, rotation = 0): DecorationPlacement => ({
  frame,
  x,
  y,
  scale,
  rotation,
});

/** A stone piece of the fort, centred on its tile. */
const fortPiece = (frame: TileFrame, column: number, row: number): DecorationPlacement =>
  prop(frame, column + 0.5, row + 0.5);

/** Walled fort on the north-east island: towers in the corners, cannons on the walls, a gate facing south. */
const FORT: readonly DecorationPlacement[] = [
  fortPiece('tile_77', 21, 2),
  fortPiece('tile_47', 22, 2),
  fortPiece('tile_16', 23, 2),
  fortPiece('tile_47', 24, 2),
  fortPiece('tile_78', 25, 2),
  fortPiece('tile_31', 21, 3),
  fortPiece('tile_32', 25, 3),
  fortPiece('tile_93', 21, 4),
  fortPiece('tile_16', 22, 4),
  fortPiece('tile_76', 23, 4),
  fortPiece('tile_16', 24, 4),
  fortPiece('tile_94', 25, 4),
  prop('tile_71', 23.5, 3.5, 0.9),
];

const ARCHIPELAGO: readonly DecorationPlacement[] = [
  ...FORT,
  // North-west island.
  prop('tile_71', 2.7, 2.6, 1, 0.3),
  prop('tile_72', 5.1, 2.4, 0.8, -0.4),
  prop('tile_66', 5.5, 2.75, 0.75),
  prop('tile_88', 3.9, 3.1),
  prop('tile_70', 2.5, 4.6, 0.8, 1.1),
  // Northern sand islet.
  prop('tile_72', 12.1, 1.9, 0.8, 0.6),
  prop('tile_49', 13.2, 2.4, 0.7),
  // Central island.
  prop('tile_71', 14.4, 8.9, 1, -0.5),
  prop('tile_67', 15.8, 8.6, 0.8),
  prop('tile_87', 13.6, 9.6),
  prop('tile_70', 15.4, 9.5, 0.7, 0.8),
  // South-west island.
  prop('tile_72', 3.8, 13.9, 0.9, 0.2),
  prop('tile_65', 5.9, 13.8, 0.8),
  prop('tile_88', 4.6, 13.5),
  // Southern sand islet.
  prop('tile_70', 11.2, 15, 0.8, -0.7),
  prop('tile_50', 12.3, 15.5, 0.6),
  // South-east island.
  prop('tile_71', 22, 13.8, 1, 0.9),
  prop('tile_72', 23.7, 13.1, 0.8, -0.2),
  prop('tile_66', 25.9, 13, 0.9),
  prop('tile_87', 24.7, 14.1),
  prop('tile_70', 27.1, 12.9, 0.7, 0.4),
  prop('tile_88', 23.1, 14.9),
];

/** Props of each arena, by arena id. An arena without an entry simply has bare islands. */
export const ARENA_DECOR: Readonly<Record<string, readonly DecorationPlacement[]>> = {
  archipelago: ARCHIPELAGO,
};
