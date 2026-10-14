import type { ShipKind } from '@/game/sim/entities/types';
import type { ShipFrame } from './assets/atlasFrames.generated';

/**
 * Visual identity of each ship kind. Each hull colour exists in four art variants:
 * intact (ship_1–6), damaged (+6), heavily damaged (+12) and wreck (+18).
 */
const HULL_COLOUR_INDEX: Readonly<Record<ShipKind, number>> = {
  player: 5, // blue sails
  chaser: 3, // red sails
  shooter: 2, // black skull sails
};

export type DamageStage = 0 | 1 | 2 | 3;
export const WRECK_STAGE: DamageStage = 3;
const ART_VARIANT_OFFSET = 6;

/** Health ratio thresholds for the visual deterioration of a ship. */
const DAMAGE_STAGE_THRESHOLDS = [0.66, 0.33] as const;

export function damageStageFor(healthRatio: number, isDestroyed: boolean): DamageStage {
  if (isDestroyed || healthRatio <= 0) return WRECK_STAGE;
  if (healthRatio > DAMAGE_STAGE_THRESHOLDS[0]) return 0;
  if (healthRatio > DAMAGE_STAGE_THRESHOLDS[1]) return 1;
  return 2;
}

export function shipFrameFor(kind: ShipKind, stage: DamageStage): ShipFrame {
  return `ship_${HULL_COLOUR_INDEX[kind] + stage * ART_VARIANT_OFFSET}` as ShipFrame;
}

/** The ship art points its bow down (+y); simulation heading 0 points to +x. */
export const SHIP_SPRITE_ROTATION_OFFSET = -Math.PI / 2;

export const EFFECT_FRAMES = {
  cannonBall: 'cannon_ball',
  explosions: ['explosion_1', 'explosion_2', 'explosion_3'],
  fires: ['fire_1', 'fire_2'],
} as const satisfies { cannonBall: ShipFrame; explosions: readonly ShipFrame[]; fires: readonly ShipFrame[] };
