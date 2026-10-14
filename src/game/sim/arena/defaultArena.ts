import type { ArenaDefinition } from './ArenaDefinition';

/**
 * 30 × 17 tiles of 64 px = 1920 × 1088 px. Corridors are at least one tile wider than the largest ship.
 * Every island part is at least two tiles thick in both directions, as required by the island autotiling.
 */
export const DEFAULT_ARENA: ArenaDefinition = {
  id: 'archipelago',
  tileSize: 64,
  tiles: [
    '..............................',
    '..#####.......................',
    '..######.................##...',
    '..######................####..',
    '...####.................####..',
    '..........................##..',
    '..............................',
    '.............###..............',
    '............#####.............',
    '............#####.............',
    '.............###..............',
    '..............................',
    '....##...............######...',
    '...####.............#######...',
    '...####.............########..',
    '....##..............########..',
    '..............................',
  ],
  playerStart: { column: 7.5, row: 8.5 },
  playerStartHeading: 0,
};
