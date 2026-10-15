import type { Texture } from 'pixi.js';
import { Vector2 } from '@/game/core/math/Vector2';
import type { Projectile } from '@/game/sim/entities/Projectile';
import type { GameEvent } from '@/game/sim/events/GameEvent';
import type { GameTextures } from '../assets/GameTextures';
import type { EffectsLayer } from '../effects/EffectsLayer';
import {
  DamageNumberEffect,
  ExplosionEffect,
  MuzzleFlashEffect,
  SinkingWreckEffect,
  SplashEffect,
} from '../effects/effects';
import { EFFECT_FRAMES, SHIP_SPRITE_ROTATION_OFFSET, shipFrameFor, WRECK_STAGE } from '../spriteCatalog';
import type { DamageFeedback } from './DamageFeedback';
import type { ShipView } from './ShipView';

/** Damage numbers start this far above the ship's centre (world px): just over its health bar, never under it. */
const DAMAGE_NUMBER_LIFT = 62;
/** Sideways offset of a damage number; consecutive hits alternate sides so they never stack into one blob. */
const DAMAGE_NUMBER_SPREAD = 14;
const WATER_SPLASH_COLOUR = 0xe8f8ff;
const DUST_COLOUR = 0xf3dcab;

/** What the effects need to find in the scene: the views and projectiles of the match on screen. */
export interface EffectTargets {
  readonly shipView: (shipId: number) => ShipView | undefined;
  readonly projectile: (projectileId: number) => Projectile | undefined;
}

/**
 * Turns the simulation's events into visual feedback: muzzle flashes, impacts, splashes, sinking wrecks and
 * explosions, floating damage numbers, the hit flash of a ship and the screen flash when the player is hit.
 * It only reads the events; the rules never depend on it.
 */
export class CombatEffects {
  private readonly explosionFrames: readonly Texture[];
  private damageNumberSide = 1;

  constructor(
    private readonly textures: GameTextures,
    private readonly effects: EffectsLayer,
    /** Damage numbers, above the health bars. */
    private readonly floatingText: EffectsLayer,
    private readonly damageFeedback: DamageFeedback,
    private readonly targets: EffectTargets,
  ) {
    this.explosionFrames = EFFECT_FRAMES.explosions.map((frame) => textures.ship(frame));
  }

  handle(event: GameEvent): void {
    switch (event.type) {
      case 'weaponFired':
        for (const projectileId of event.projectileIds) {
          const projectile = this.targets.projectile(projectileId);
          if (projectile) {
            this.effects.add(new MuzzleFlashEffect(projectile.position, this.textures.ship('explosion_3')));
          }
        }
        return;
      case 'projectileHit':
        this.effects.add(new ExplosionEffect(event.position, this.explosionFrames.slice(1), 0.35, 0.3));
        return;
      case 'projectileExpired':
        if (event.reason === 'rangeExhausted' || event.reason === 'ownerDestroyed') {
          this.effects.add(new SplashEffect(event.position, WATER_SPLASH_COLOUR, 14));
        } else if (event.reason === 'hitIsland') {
          this.effects.add(new SplashEffect(event.position, DUST_COLOUR, 10));
        }
        return;
      case 'shipDamaged': {
        this.targets.shipView(event.shipId)?.flashHit();
        this.damageNumberSide = -this.damageNumberSide;
        const origin = event.position.add(
          new Vector2(this.damageNumberSide * DAMAGE_NUMBER_SPREAD, -DAMAGE_NUMBER_LIFT),
        );
        this.floatingText.add(new DamageNumberEffect(origin, event.damage, event.kind === 'player'));
        if (event.kind === 'player') this.damageFeedback.trigger();
        return;
      }
      case 'shipDestroyed': {
        if (event.kind !== 'player') {
          const rotation = this.targets.shipView(event.shipId)?.body.rotation ?? SHIP_SPRITE_ROTATION_OFFSET;
          const wreck = this.textures.ship(shipFrameFor(event.kind, WRECK_STAGE));
          this.effects.add(new SinkingWreckEffect(event.position, rotation, wreck));
        }
        const size = event.cause === 'ram' ? 1.1 : 0.9;
        this.effects.add(new ExplosionEffect(event.position, this.explosionFrames, size, 0.7));
        return;
      }
      default:
        return;
    }
  }
}
