import { Container, Sprite } from 'pixi.js';
import type { Ship } from '@/game/sim/entities/Ship';
import type { GameTextures } from '../assets/GameTextures';
import {
  damageStageFor,
  EFFECT_FRAMES,
  SHIP_SPRITE_ROTATION_OFFSET,
  shipFrameFor,
  type DamageStage,
} from '../spriteCatalog';
import { ENEMY_HEALTH_BAR, HealthBarView, PLAYER_HEALTH_BAR } from './HealthBarView';

const HIT_FLASH_SECONDS = 0.18;
const HIT_TINT = 0xff7a7a;
const HEALTH_BAR_GAP = 46;
const FIRE_FLICKER_SPEED = 9;

/**
 * Visual of one ship: hull sprite whose art deteriorates with the health ratio, flames when damaged,
 * a red flash when hit and a health bar that stays upright above the ship.
 */
export class ShipView {
  /** Rotated body holding the hull art and the flames. */
  readonly body: Container;
  private readonly hull: Sprite;
  readonly healthBar: HealthBarView;
  private readonly fire: Sprite;
  private shownStage: DamageStage | null = null;
  private hitFlashSeconds = 0;
  private elapsedSeconds = 0;

  constructor(
    private readonly ship: Ship,
    private readonly textures: GameTextures,
    shipLayer: Container,
    overlayLayer: Container,
  ) {
    this.body = new Container({ label: `ship-${ship.kind}-${ship.id}` });
    this.hull = new Sprite({ anchor: 0.5 });
    this.fire = new Sprite({ texture: textures.ship(EFFECT_FRAMES.fires[0]), anchor: 0.5, visible: false });
    this.body.addChild(this.hull, this.fire);
    this.healthBar = new HealthBarView(textures, ship.kind === 'player' ? PLAYER_HEALTH_BAR : ENEMY_HEALTH_BAR);
    shipLayer.addChild(this.body);
    overlayLayer.addChild(this.healthBar.container);
    this.syncArt();
  }

  flashHit(): void {
    this.hitFlashSeconds = HIT_FLASH_SECONDS;
  }

  /** `interpolation` blends the previous and current simulation states; `deltaSeconds` drives animations. */
  update(interpolation: number, deltaSeconds: number): void {
    const { ship } = this;
    const position = ship.previousPosition.lerp(ship.position, interpolation);
    const heading = ship.previousHeading + (ship.heading - ship.previousHeading) * interpolation;
    this.body.position.set(position.x, position.y);
    this.body.rotation = heading + SHIP_SPRITE_ROTATION_OFFSET;
    this.healthBar.container.position.set(position.x, position.y - HEALTH_BAR_GAP);
    this.healthBar.container.visible = ship.isAlive;
    this.healthBar.setRatio(ship.health / ship.maxHealth);
    this.syncArt();

    this.elapsedSeconds += deltaSeconds;
    this.hitFlashSeconds = Math.max(0, this.hitFlashSeconds - deltaSeconds);
    this.hull.tint = this.hitFlashSeconds > 0 ? HIT_TINT : 0xffffff;
    if (this.fire.visible) {
      const flicker = Math.sin(this.elapsedSeconds * FIRE_FLICKER_SPEED);
      this.fire.texture = this.textures.ship(flicker > 0 ? EFFECT_FRAMES.fires[0] : EFFECT_FRAMES.fires[1]);
      this.fire.alpha = 0.75 + 0.25 * flicker;
    }
  }

  destroy(): void {
    this.body.destroy({ children: true });
    this.healthBar.destroy();
  }

  private syncArt(): void {
    const stage = damageStageFor(this.ship.health / this.ship.maxHealth, !this.ship.isAlive);
    if (stage === this.shownStage) return;
    this.shownStage = stage;
    this.hull.texture = this.textures.ship(shipFrameFor(this.ship.kind, stage));
    this.fire.visible = stage === 1 || stage === 2;
    this.fire.scale.set(stage === 2 ? 1.3 : 0.9);
  }
}
