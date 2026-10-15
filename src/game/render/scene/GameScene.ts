import { Container } from 'pixi.js';
import type { Ship } from '@/game/sim/entities/Ship';
import type { GameEvent } from '@/game/sim/events/GameEvent';
import type { MatchSession } from '@/game/sim/match/MatchSession';
import type { GameTextures } from '../assets/GameTextures';
import { EffectsLayer } from '../effects/EffectsLayer';
import type { ViewportLayout } from '../Viewport';
import { CombatEffects } from './CombatEffects';
import { DamageFeedback } from './DamageFeedback';
import { HitboxOverlayView } from './HitboxOverlayView';
import { AimGuideView } from './AimGuideView';
import { ProjectileViews } from './ProjectileViews';
import { ShipView } from './ShipView';
import { TerrainView } from './terrain/TerrainView';
import { PuffLayer, SMOKE_STYLE, WAKE_STYLE } from './PuffLayer';

/** Extra sea drawn past the screen edges (world px), so the damage shake never uncovers the background. */
const SCREEN_EDGE_MARGIN = 24;

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
  readonly smokePuffs: number;
  readonly overlays: SceneOverlays;
}

/**
 * PixiJS presentation of a match. Reads the simulation (never writes to it), keeps one view per entity,
 * and turns domain events into effects. Layers, bottom to top: terrain, wakes, aim lanes (developer overlay),
 * ships, smoke, projectiles, effects, health bars, damage numbers, hitboxes (developer overlay),
 * damage flash.
 */
export class GameScene {
  readonly root = new Container({ label: 'world' });
  private readonly terrain: TerrainView;
  private readonly wakes = new PuffLayer(WAKE_STYLE);
  private readonly smoke = new PuffLayer(SMOKE_STYLE);
  private readonly aimGuideLayer = new Container({ label: 'aim-guide' });
  private aimGuide: AimGuideView;
  private readonly hitboxes: HitboxOverlayView | null;
  private readonly shipLayer = new Container({ label: 'ships' });
  private readonly overlayLayer = new Container({ label: 'health-bars' });
  private readonly projectiles: ProjectileViews;
  private readonly effects = new EffectsLayer();
  /** Damage numbers, above the health bars so a bar never hides them. */
  private readonly floatingText = new EffectsLayer('floating-text');
  private readonly damageFeedback: DamageFeedback;
  private readonly combatEffects: CombatEffects;
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
    this.combatEffects = new CombatEffects(textures, this.effects, this.floatingText, this.damageFeedback, {
      shipView: (shipId) => this.shipViews.get(shipId),
      projectile: (projectileId) => this.session.world.projectiles.find((projectile) => projectile.id === projectileId),
    });
    this.aimGuide = this.createAimGuide();
    this.aimGuideLayer.visible = overlays.aimLanes;
    this.hitboxes = overlays.hitboxes ? new HitboxOverlayView(session.arena) : null;
    this.root.addChild(
      this.terrain.container,
      this.wakes.container,
      this.aimGuideLayer,
      this.shipLayer,
      this.smoke.container,
      this.projectiles.container,
      this.effects.container,
      this.overlayLayer,
      this.floatingText.container,
      ...(this.hitboxes ? [this.hitboxes.container] : []),
      this.damageFeedback.overlay,
    );
  }

  get statistics(): SceneStatistics {
    return {
      ships: this.shipViews.size,
      projectiles: this.projectiles.activeCount,
      pooledProjectiles: this.projectiles.pooledCount,
      effects: this.effects.activeCount + this.floatingText.activeCount,
      wakePuffs: this.wakes.activeCount,
      smokePuffs: this.smoke.activeCount,
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
    this.destroyShipViews();
    this.projectiles.clear();
    this.effects.clear();
    this.floatingText.clear();
    this.wakes.clear();
    this.smoke.clear();
    this.aimGuide.destroy();
    this.aimGuide = this.createAimGuide();
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
    for (const event of events) this.combatEffects.handle(event);
  }

  /** Draws the current state. `deltaSeconds` is presentation time (0 while paused, freezing effects). */
  render(interpolation: number, deltaSeconds: number): void {
    this.terrain.update(deltaSeconds);
    this.wakes.update(deltaSeconds);
    this.smoke.update(deltaSeconds);
    this.syncShips(interpolation, deltaSeconds);
    this.aimGuide.update(interpolation);
    this.hitboxes?.update(this.session.world);
    this.projectiles.sync(this.session.world.projectiles, interpolation);
    this.effects.update(deltaSeconds);
    this.floatingText.update(deltaSeconds);
    const shake = this.damageFeedback.update(deltaSeconds);
    this.root.position.set(
      this.layout.offsetX + shake.x * this.layout.scale,
      this.layout.offsetY + shake.y * this.layout.scale,
    );
  }

  destroy(): void {
    this.destroyShipViews();
    this.projectiles.destroy();
    this.effects.destroy();
    this.floatingText.destroy();
    this.aimGuide.destroy();
    this.hitboxes?.destroy();
    this.wakes.destroy();
    this.smoke.destroy();
    this.terrain.destroy();
    this.root.destroy({ children: true });
  }

  private destroyShipViews(): void {
    for (const view of this.shipViews.values()) view.destroy();
    this.shipViews.clear();
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
        smoke: this.smoke,
      });
      this.shipViews.set(ship.id, view);
    }
    return view;
  }

  /** Aim lanes of the current match's player (shown only when switched on in Developer tools). */
  private createAimGuide(): AimGuideView {
    const aimGuide = new AimGuideView(this.session.player);
    this.aimGuideLayer.addChild(aimGuide.guide);
    return aimGuide;
  }
}
