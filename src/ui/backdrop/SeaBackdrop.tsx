import type { CSSProperties, ReactNode } from 'react';
import { ISLAND_BLOCKS, SEA_ART } from './seaBackdropArt';
import './sea-backdrop.css';

/** The scene's images, as CSS variables read by sea-backdrop.css. */
const SCENE_IMAGES = {
  '--water': `url(${SEA_ART.water})`,
  '--grass': `url(${ISLAND_BLOCKS.grass})`,
  '--sand': `url(${ISLAND_BLOCKS.sand})`,
  '--shallows': `url(${ISLAND_BLOCKS.shallows})`,
  '--ship-hero': `url(${SEA_ART.shipBlueSails})`,
  '--ship-raider': `url(${SEA_ART.shipRedSails})`,
  '--ship-anchored': `url(${SEA_ART.shipBlackSails})`,
} as CSSProperties;

/** A rectangular island in tiles: a nine-slice of the tile sheet's own island art over a band of shallows. */
function Island({
  kind,
  className,
  columns,
  rows,
  children,
}: {
  readonly kind: 'grass' | 'sand';
  readonly className: string;
  readonly columns: number;
  readonly rows: number;
  readonly children?: ReactNode;
}) {
  const size = { '--columns': columns, '--rows': rows } as CSSProperties;
  return (
    <div className={`sea-backdrop__island sea-backdrop__island--${kind} ${className}`} style={size}>
      <div className="sea-backdrop__shallows" />
      <div className="sea-backdrop__land" />
      {children}
    </div>
  );
}

/** A prop at a tile position inside its island (column/row of its centre, in tiles; size relative to a tile). */
function Prop({
  image,
  column,
  row,
  scale = 1,
  turn = 0,
}: {
  readonly image: string;
  readonly column: number;
  readonly row: number;
  readonly scale?: number;
  readonly turn?: number;
}) {
  const placement = {
    '--column': column,
    '--row': row,
    '--scale': scale,
    '--turn': `${turn}deg`,
    backgroundImage: `url(${image})`,
  } as CSSProperties;
  return <span className="sea-backdrop__prop" style={placement} />;
}

/** The fort of the game's Fort Island: walls, towers, cannons and the gate, one tile each. */
const { fort } = SEA_ART;
const FORT_PIECES: readonly (readonly [string, number, number])[] = [
  [fort.tile77, 1, 1],
  [fort.tile47, 2, 1],
  [fort.tile16, 3, 1],
  [fort.tile47, 4, 1],
  [fort.tile78, 5, 1],
  [fort.tile31, 1, 2],
  [fort.tile32, 5, 2],
  [fort.tile93, 1, 3],
  [fort.tile48, 2, 3],
  [fort.tile76, 3, 3],
  [fort.tile48, 4, 3],
  [fort.tile94, 5, 3],
];

/**
 * Painted-in-CSS scene behind every menu, made only of the game's own art: a drifting sea, four islands
 * (the walled fort, a palm island, a sandbar with a wreck, a lone islet) in the corners so they frame the panels,
 * ships under sail in the open lanes, passing cloud shadows, warm light and a vignette that keeps the panels
 * readable. Decorative (`aria-hidden`), animated only with transforms and opacity (composited, no repaints),
 * and still when the player prefers reduced motion. The stage keeps a 16:10 shape and covers the screen.
 */
export function SeaBackdrop() {
  return (
    <div className="sea-backdrop" aria-hidden="true" data-testid="sea-backdrop">
      <div className="sea-backdrop__stage" style={SCENE_IMAGES}>
        <div className="sea-backdrop__sea" />
        <div className="sea-backdrop__depth" />
        <div className="sea-backdrop__glints" />

        <Island kind="grass" className="sea-backdrop__island--fort" columns={7} rows={5}>
          {FORT_PIECES.map(([image, column, row]) => (
            <Prop key={`${column}-${row}`} image={image} column={column + 0.5} row={row + 0.5} />
          ))}
          <Prop image={SEA_ART.palmLarge} column={3.5} row={2.45} scale={0.85} turn={25} />
          <Prop image={SEA_ART.palmMedium} column={6.4} row={0.7} scale={0.75} turn={35} />
          <Prop image={SEA_ART.palmSmall} column={0.6} row={4.4} scale={0.7} turn={-45} />
        </Island>

        <Island kind="grass" className="sea-backdrop__island--palms" columns={5} rows={4}>
          <Prop image={SEA_ART.palmLarge} column={1.45} row={1.35} turn={18} />
          <Prop image={SEA_ART.palmMedium} column={2.95} row={0.95} scale={0.8} turn={-25} />
          <Prop image={SEA_ART.palmSmall} column={3.65} row={2.45} scale={0.8} turn={60} />
          <Prop image={SEA_ART.bush} column={2.2} row={2.6} />
          <Prop image={SEA_ART.rock} column={0.95} row={2.75} scale={0.6} />
        </Island>

        <Island kind="sand" className="sea-backdrop__island--wreck" columns={3} rows={2}>
          <Prop image={SEA_ART.wreck} column={1.6} row={0.95} scale={1.25} turn={-125} />
          <Prop image={SEA_ART.palmSmall} column={0.6} row={0.6} scale={0.65} turn={50} />
        </Island>

        <Island kind="sand" className="sea-backdrop__island--islet" columns={2} rows={2}>
          <Prop image={SEA_ART.palmMedium} column={1} row={0.9} scale={0.8} turn={-15} />
        </Island>

        <div className="sea-backdrop__ship sea-backdrop__ship--hero">
          <span className="sea-backdrop__wake" />
          <span className="sea-backdrop__hull" />
        </div>
        <div className="sea-backdrop__ship sea-backdrop__ship--raider">
          <span className="sea-backdrop__wake" />
          <span className="sea-backdrop__hull" />
        </div>
        <div className="sea-backdrop__ship sea-backdrop__ship--anchored">
          <span className="sea-backdrop__hull" />
        </div>

        <div className="sea-backdrop__cloud sea-backdrop__cloud--a" />
        <div className="sea-backdrop__cloud sea-backdrop__cloud--b" />
      </div>
      <div className="sea-backdrop__light" />
      <div className="sea-backdrop__vignette" />
    </div>
  );
}
