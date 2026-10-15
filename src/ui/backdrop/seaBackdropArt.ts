/** Art of the menu backdrop: the game's own tiles and ships, plus island blocks cut by `npm run assets`. */
import shipBlackSails from '@assets/png/retina/ships/ship_2.png';
import wreck from '@assets/png/retina/ships/ship_22.png';
import shipRedSails from '@assets/png/retina/ships/ship_3.png';
import shipBlueSails from '@assets/png/retina/ships/ship_5.png';
import tile16 from '@assets/png/retina/tiles/tile_16.png';
import tile31 from '@assets/png/retina/tiles/tile_31.png';
import tile32 from '@assets/png/retina/tiles/tile_32.png';
import tile47 from '@assets/png/retina/tiles/tile_47.png';
import tile48 from '@assets/png/retina/tiles/tile_48.png';
import rock from '@assets/png/retina/tiles/tile_65.png';
import palmSmall from '@assets/png/retina/tiles/tile_70.png';
import palmLarge from '@assets/png/retina/tiles/tile_71.png';
import palmMedium from '@assets/png/retina/tiles/tile_72.png';
import tile76 from '@assets/png/retina/tiles/tile_76.png';
import tile77 from '@assets/png/retina/tiles/tile_77.png';
import tile78 from '@assets/png/retina/tiles/tile_78.png';
import bush from '@assets/png/retina/tiles/tile_88.png';
import tile93 from '@assets/png/retina/tiles/tile_93.png';
import tile94 from '@assets/png/retina/tiles/tile_94.png';
import water from '@assets/png/retina/tiles/tile_73.png';

/** Island blocks as whole images (public files: CSS nine-slices need a whole image, not an atlas frame). */
export const ISLAND_BLOCKS = {
  grass: `${import.meta.env.BASE_URL}assets/menu/island_grass.png`,
  sand: `${import.meta.env.BASE_URL}assets/menu/island_sand.png`,
  shallows: `${import.meta.env.BASE_URL}assets/menu/shallows.png`,
} as const;

export const SEA_ART = {
  water,
  shipBlueSails,
  shipRedSails,
  shipBlackSails,
  wreck,
  rock,
  palmSmall,
  palmLarge,
  palmMedium,
  bush,
  fort: { tile16, tile31, tile32, tile47, tile48, tile76, tile77, tile78, tile93, tile94 },
} as const;

/** Every image of the scene, for the boot preloader (so the menu never paints half-drawn). */
export const SEA_BACKDROP_IMAGES: readonly string[] = [
  ...Object.values(SEA_ART).flatMap((art) => (typeof art === 'string' ? [art] : Object.values(art))),
  ...Object.values(ISLAND_BLOCKS),
];
