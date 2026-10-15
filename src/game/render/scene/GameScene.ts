import { Container } from 'pixi.js';
import type { Ship } from '@/game/sim/entities/Ship';
import type { GameEvent } from '@/game/sim/events/GameEvent';
import type { MatchSession } from '@/game/sim/match/MatchSession';
import type { GameTextures } from '../assets/GameTextures';
import { EffectsLayer } from '../effects/EffectsLayer';
import { ExplosionEffect, MuzzleFlashEffect, SinkingWreckEffect, SplashEffect } from '../effects/effects';
import { EFFECT_FRAMES, SHIP_SPRITE_ROTATION_OFFSET, shipFrameFor, WRECK_STAGE } from '../spriteCatalog';
import type { ViewportLayout } from '../Viewport';
import { DamageFeedback } from './DamageFeedback';
import { HitboxOverlayView } from './HitboxOverlayView';
import { PlayerGunneryView } from './PlayerGunneryView';
import { ProjectileViews } from './ProjectileViews';
import { ShipView } from './ShipView';
import { TerrainView } from './terrain/TerrainView';
import { WakeLayer } from './WakeLayer';

/** Extra sea drawn past the screen edges (world px), so the damage shake never uncovers the background. */
const SCREEN_EDGE_MARGIN = 24;
const WATER_SPLASH_COLOUR = 0xe8f8ff;
const DUST_COLOUR = 0xf3dcab;

/** Developer overlays, off by default and switched on in Developer tools (main menu). */
export interface SceneOverlays {
  /** Dashed lanes showing the direction and range of the player's cannons. */
  readonly aimLanes: boolean;
  /** Collision shapes of islands, ships and projectiles. */
  readonly hitboxes: boolean;
}

export const NO_OVERLAYS: SceneOverlays = { aimLanes: false, hitboxes: false };

export interface SceneStatistics {
  readonly ships: number;
  readonly projectiles: number;
  readonly pooledProjectiles: number;
  readonly effects: number;
  readonly wakePuffs: number;
  readonly overlays: SceneOverlays;
}

/**
 * PixiJS presentation of a match. Reads the simulation (never writes to it), keeps one view per entity,
 * and turns domain events into effects. Layers, bottom to top: terrain, wakes, aim lanes (developer overlay),
 * ships, projectiles, effects, health bars and reload arcs, hitboxes (developer overlay), damage flash.
 */
export class GameScene {
  readonly root = new Container({ label: 'world' });
  private readonly terrain: TerrainView;
  private readonly wakes = new WakeLayer();
  private readonly aimGuideLayer = new Container({ label: 'aim-guide' });
  private gunnery: PlayerGunneryView;
  private readonly hitboxes: HitboxOverlayView | null;
  private readonly shipLayer = new Container({ label: 'ships' });
  private readonly overlayLayer = new Container({ label: 'health-bars' });
  private readonly projectiles: ProjectileViews;
  private readonly effects = new EffectsLayer();
  private readonly damageFeedback: DamageFeedback;
  private readonly shipViews = new Map<number, ShipView>();
  private layout: ViewportLayout = { scale: 1, offsetX: 0, offsetY: 0 };

  constructor(
    private session: MatchSession,
    private readonly textures: GameTextures,
    prefersReducedMotion: boolean,
    private readonly overlays: SceneOverlays = NO_OVERLAYS,
  ) {
    this.terrain = new TerrainView(session.arena, textures, { isAnimated: !prefersReducedMotion });
    this.projectiles = new ProjectileViews(textures);
    this.damageFeedback = new DamageFeedback(session.arena.width, session.arena.height, prefersReducedMotion);
    this.gunnery = this.createGunnery();
    this.aimGuideLayer.visible = overlays.aimLanes;
    this.hitboxes = overlays.hitboxes ? new HitboxOverlayView(session.arena) : null;
    this.root.addChild(
      this.terrain.container,
      this.wakes.container,
      this.aimGuideLayer,
      this.shipLayer,
      this.projectiles.container,
      this.effects.container,
      this.overlayLayer,
      ...(this.hitboxes ? [this.hitboxes.container] : []),
      this.damageFeedback.overlay,
    );
  }

  get statistics(): SceneStatistics {
    return {
      ships: this.shipViews.size,
      projectiles: this.projectiles.activeCount,
      pooledProjectiles: this.projectiles.pooledCount,
      effects: this.effects.activeCount,
      wakePuffs: this.wakes.activeCount,
      overlays: this.overlays,
    };
  }

  /** Number of display objects under the scene root (profiling). */
  countDisplayObjects(): number {
    let count = 0;
    const pending: Container[] = [this.root];
    while (pending.length > 0) {
      const node = pending.pop();
      if (!node) break;
      count++;
      for (const child of node.children) pending.push(child);
    }
    return count;
  }

  /** Switches to a new match (restart): drops every entity view and effect, keeps the terrain. */
  showMatch(session: MatchSession): void {
    this.session = session;
    for (const view of this.shipViews.values()) view.destroy();
    this.shipViews.clear();
    this.projectiles.clear();
    this.effects.clear();
    this.wakes.clear();
    this.gunnery.destroy();
    this.gunnery = this.createGunnery();
    this.damageFeedback.reset();
  }

  applyLayout(layout: ViewportLayout): void {
    this.layout = layout;
    this.root.scale.set(layout.scale);
    this.root.position.set(layout.offsetX, layout.offsetY);
    // The screen around the arena (bars on screens of another shape) shows more sea, never empty bars.
    const marginX = layout.offsetX / layout.scale + SCREEN_EDGE_MARGIN;
    const marginY = layout.offsetY / layout.scale + SCREEN_EDGE_MARGIN;
    const { width, height } = this.session.arena;
    this.terrain.showVisibleArea(-marginX, -marginY, width + marginX * 2, height + marginY * 2);
  }

  handleEvents(events: readonly GameEvent[]): void {
    for (const event of events) this.handleEvent(event);
  }

  /** Draws the current state. `deltaSeconds` is presentation time (0 while paused, freezing effects). */
  render(interpolation: number, deltaSeconds: number): void {
    this.terrain.update(deltaSeconds);
    this.wakes.update(deltaSeconds);
    this.syncShips(interpolation, deltaSeconds);
    this.gunnery.update(interpolation);
    this.hitboxes?.update(this.session.world);
    this.projectiles.sync(this.session.world.projectiles, interpolation);
    this.effects.update(deltaSeconds);
    const shake = this.damageFeedback.update(deltaSeconds);
    this.root.position.set(
      this.layout.offsetX + shake.x * this.layout.scale,
      this.layout.offsetY + shake.y * this.layout.scale,
    );
  }

  destroy(): void {
    for (const view of this.shipViews.values()) view.destroy();
    this.shipViews.clear();
    this.projectiles.destroy();
    this.effects.destroy();
    this.gunnery.destroy();
    this.hitboxes?.destroy();
    this.wakes.destroy();
    this.terrain.destroy();
    this.root.destroy({ children: true });
  }

  private syncShips(interpolation: number, deltaSeconds: number): void {
    const presentIds = new Set<number>();
    for (const ship of this.session.world.ships) {
      presentIds.add(ship.id);
      this.viewFor(ship).update(interpolation, deltaSeconds);
    }
    for (const [id, view] of this.shipViews) {
      if (presentIds.has(id)) continue;
      view.destroy();
      this.shipViews.delete(id);
    }
  }

  private viewFor(ship: Ship): ShipView {
    let view = this.shipViews.get(ship.id);
    if (!view) {
      view = new ShipView(ship, this.textures, {
        ships: this.shipLayer,
        overlay: this.overlayLayer,
        wakes: this.wakes,
      });
      this.shipViews.set(ship.id, view);
    }
    return view;
  }

  /** Aim guide and reload arcs of the current match's player. */
  private createGunnery(): PlayerGunneryView {
    const gunnery = new PlayerGunneryView(this.session.player);
    this.aimGuideLayer.addChild(gunnery.guide);
    this.overlayLayer.addChild(gunnery.reloadIndicator);
    return gunnery;
  }

  private handleEvent(event: GameEvent): void {
    const explosionFrames = EFFECT_FRAMES.explosions.map((frame) => this.textures.ship(frame));
    switch (event.type) {
      case 'weaponFired': {
        for (const projectileId of event.projectileIds) {
          const projectile = this.session.world.projectiles.find((candidate) => candidate.id === projectileId);
          if (projectile)
            this.effects.add(new MuzzleFlashEffect(projectile.position, this.textures.ship('explosion_3')));
        }
        return;
      }
      case 'projectileHit':
        this.effects.add(new ExplosionEffect(event.position, explosionFrames.slice(1), 0.35, 0.3));
        return;
      case 'projectileExpired':
        if (event.reason === 'rangeExhausted' || event.reason === 'ownerDestroyed') {
          this.effects.add(new SplashEffect(event.position, WATER_SPLASH_COLOUR, 14));
        } else if (event.reason === 'hitIsland') {
          this.effects.add(new SplashEffect(event.position, DUST_COLOUR, 10));
        }
        return;
      case 'shipDamaged':
        this.shipViews.get(event.shipId)?.flashHit();
        if (event.kind === 'player') this.damageFeedback.trigger();
        return;
      case 'shipDestroyed': {
        const view = this.shipViews.get(event.shipId);
        const rotation = view?.body.rotation ?? SHIP_SPRITE_ROTATION_OFFSET;
        if (event.kind !== 'player') {
          this.effects.add(
            new SinkingWreckEffect(event.position, rotation, this.textures.ship(shipFrameFor(event.kind, WRECK_STAGE))),
          );
        }
        this.effects.add(new ExplosionEffect(event.position, explosionFrames, event.cause === 'ram' ? 1.1 : 0.9, 0.7));
        return;
      }
      default:
        return;
    }
  }
}
