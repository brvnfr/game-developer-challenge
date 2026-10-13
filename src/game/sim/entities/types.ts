export type ShipKind = 'player' | 'chaser' | 'shooter';
export type Faction = 'player' | 'enemy';
export type WeaponSlot = 'front' | 'left' | 'right' | 'cannon';

export const factionOf = (kind: ShipKind): Faction => (kind === 'player' ? 'player' : 'enemy');
