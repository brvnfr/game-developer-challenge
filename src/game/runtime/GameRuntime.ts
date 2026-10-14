import { Application, UPDATE_PRIORITY, type Ticker } from 'pixi.js';
import type { UserSettings } from '@/game/config/types';
import { SimulationClock } from '@/game/core/SimulationClock';
import { MatchSoundDirector } from '@/game/audio/MatchSoundDirector';
import type { SoundOutput } from '@/game/audio/SoundOutput';
import { ExternalStore } from '@/game/bridge/ExternalStore';
import type { MatchView } from '@/game/bridge/MatchView';
import { InputState } from '@/game/input/InputState';
import { KeyboardInputSource } from '@/game/input/KeyboardInputSource';
import type { GameTextures } from '@/game/render/assets/GameTextures';
import { GameScene, type SceneStatistics } from '@/game/render/scene/GameScene';
import { Viewport } from '@/game/render/Viewport';
import type { PauseReason } from '@/game/sim/events/GameEvent';
import type { MatchSession } from '@/game/sim/match/MatchSession';
import type { MatchResult } from '@/game/sim/match/types';
import { AutoPauseController } from './AutoPauseController';
import type { EntityCounts, FrameProfiler } from './FrameProfiler';
import { MatchFactory, type MatchFactoryOptions } from './MatchFactory';

export type TimeSource = 'realTime' | 'manual';

export interface GameRuntimeOptions extends MatchFactoryOptions {
  readonly textures: GameTextures;
  readonly settings: UserSettings;
  readonly onMatchEnded?: (result: MatchResult) => void;
  /** 'manual' freezes real time; tests advance the simulation explicitly with `advanceTime()`. */
  readonly timeSource?: TimeSource;
  /** Where sound effects go; the game is silent without it. */
  readonly sound?: SoundOutput | null;
  /** Frame timing and entity counts for the performance report (real-time frames only). */
  readonly profiler?: FrameProfiler | null;
}

const MANUAL_TIME_CHUNK_SECONDS = 0.1;
/** The final explosion keeps playing this long before the result screen replaces the arena. */
const RESULT_REVEAL_DELAY_SECONDS = 1.5;
/** Below this speed (px/s) the ship is drifting and the sailing loop is silent. */
const SAILING_SOUND_MIN_SPEED = 15;
const WATER_BACKGROUND = 0x2c8fc9;
/**
 * Destroys a PixiJS application. When no other runtime is alive it also empties PixiJS's module-level pools
 * (batches, render-texture pool, canvas caches): otherwise every destroyed renderer left its batcher and some
 * texture styles referenced from those pools (found with heap snapshots over repeated matches). The pools are
 * shared, so they are kept while another runtime exists (React Strict Mode mounts a second one at once).
 * The loaded atlases are not in these pools and stay cached.
 */
function destroyApplication(application: Application): void {
  const releaseGlobalResources = GameRuntime.liveInstanceCount === 0;
  application.destroy({ removeView: true, releaseGlobalResources }, { children: true });
}

/**
 * Owns everything a match needs on screen: the PixiJS application and ticker, the fixed-step clock,
 * the match, input sources, auto-pause and the UI store.
 *
 * Safe under React Strict Mode: `mount()` is asynchronous (PixiJS init), and `dispose()` may run before it
 * resolves; in that case the half-initialised application is destroyed as soon as init completes.
 * `dispose()` is idempotent and releases the ticker, listeners, observers, views and the canvas.
 * Shared textures are never destroyed, so the next match starts instantly.
 */
export class GameRuntime {
  private static readonly liveInstances = new Set<GameRuntime>();

  readonly input = new InputState();
  readonly store: ExternalStore<MatchView>;
  private readonly matches: MatchFactory;
  private readonly clock: SimulationClock;
  private readonly viewport: Viewport;
  private readonly keyboard: KeyboardInputSource;
  private readonly autoPause: AutoPauseController;
  private application: Application | null = null;
  private scene: GameScene | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private session: MatchSession;
  private sounds: MatchSoundDirector | null;
  private timeSource: TimeSource;
  private hasReportedResult = false;
  private secondsSinceEnd = 0;
  /** Start of the frame being profiled (between handleTick and handleFrameEnd). */
  private profiledFrameStart: number | null = null;
  private disposed = false;

  constructor(private readonly options: GameRuntimeOptions) {
    this.matches = new MatchFactory(options);
    this.session = this.matches.create(options.settings);
    this.sounds = this.createSoundDirector();
    this.clock = new SimulationClock(this.session.config.match.stepSeconds);
    this.viewport = new Viewport(this.matches.arena.width, this.matches.arena.height);
    this.timeSource = options.timeSource ?? 'realTime';
    this.store = new ExternalStore<MatchView>(this.describeMatch());
    this.keyboard = new KeyboardInputSource(window, this.input, () => {
      this.togglePause();
    });
    this.autoPause = new AutoPauseController({ window, document }, (reason) => this.pause(reason));
  }

  /** Runtimes currently alive in the page (should never exceed one; checked by tests). */
  static get liveInstanceCount(): number {
    return GameRuntime.liveInstances.size;
  }

  static get liveInstancesSnapshot(): readonly GameRuntime[] {
    return [...GameRuntime.liveInstances];
  }

  get match(): MatchSession {
    return this.session;
  }

  get sceneStatistics(): SceneStatistics | null {
    return this.scene?.statistics ?? null;
  }

  get profiler(): FrameProfiler | null {
    return this.options.profiler ?? null;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  async mount(host: HTMLElement): Promise<void> {
    GameRuntime.liveInstances.add(this);
    const application = new Application();
    await application.init({
      preference: 'webgl',
      background: WATER_BACKGROUND,
      antialias: true,
      autoDensity: true,
      resolution: Viewport.renderResolutionFor(window.devicePixelRatio),
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
    });
    if (this.disposed) {
      destroyApplication(application);
      return;
    }
    this.application = application;
    application.canvas.setAttribute('aria-hidden', 'true');
    application.canvas.dataset['testid'] = 'game-canvas';
    host.appendChild(application.canvas);

    this.scene = new GameScene(
      this.session,
      this.options.textures,
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    application.stage.addChild(this.scene.root);
    this.resizeObserver = new ResizeObserver(() => this.resizeTo(host));
    this.resizeObserver.observe(host);
    this.resizeTo(host);

    this.keyboard.attach();
    this.autoPause.attach();
    this.session.start();
    application.ticker.add(this.handleTick);
    // Runs after PixiJS's own render callback (LOW), so a profiled frame includes the draw submission.
    if (this.options.profiler) application.ticker.add(this.handleFrameEnd, undefined, UPDATE_PRIORITY.UTILITY);
    this.applyTimeSource();
    this.publish();
  }

  /** Pauses the match (manual button/key, focus loss, hidden tab, wrong orientation). */
  pause(reason: PauseReason): void {
    if (!this.session.pause(reason)) return;
    this.sounds?.stop();
    this.input.clear();
    this.keyboard.isAcceptingActions = false;
    this.publish();
  }

  /** Resumes after an explicit player action. Time spent paused and keys held meanwhile are discarded. */
  resume(): void {
    if (!this.session.resume()) return;
    this.clock.discardPendingTime();
    this.input.clear();
    this.keyboard.isAcceptingActions = true;
    this.publish();
  }

  togglePause(): void {
    if (this.session.status === 'running') this.pause('manual');
    else if (this.session.status === 'paused') this.resume();
  }

  /** Starts a brand-new match with a fresh configuration snapshot. */
  restart(settings: UserSettings = this.options.settings): void {
    this.sounds?.stop();
    this.session = this.matches.create(settings);
    this.sounds = this.createSoundDirector();
    this.hasReportedResult = false;
    this.secondsSinceEnd = 0;
    this.clock.discardPendingTime();
    this.input.clear();
    this.keyboard.isAcceptingActions = true;
    this.scene?.showMatch(this.session);
    this.session.start();
    this.publish();
  }

  setTimeSource(timeSource: TimeSource): void {
    this.timeSource = timeSource;
    this.clock.discardPendingTime();
    this.applyTimeSource();
  }

  /**
   * Advances the game by `milliseconds` of real time, in small chunks (manual time source, tests). Every chunk
   * runs the rules and updates the scene; the canvas is drawn once at the end unless `shouldDraw` is false
   * (long automated runs skip intermediate draws: software WebGL would otherwise queue seconds of GPU work).
   */
  advanceTime(milliseconds: number, shouldDraw = true): void {
    let remainingSeconds = milliseconds / 1000;
    while (remainingSeconds > 1e-9) {
      const chunk = Math.min(MANUAL_TIME_CHUNK_SECONDS, remainingSeconds);
      this.advanceFrame(chunk);
      remainingSeconds -= chunk;
    }
    if (this.timeSource === 'manual' && shouldDraw) this.application?.render();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    GameRuntime.liveInstances.delete(this);
    this.sounds?.stop();
    this.sounds = null;
    this.keyboard.detach();
    this.autoPause.detach();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.application) {
      this.application.ticker.remove(this.handleTick);
      this.application.ticker.remove(this.handleFrameEnd);
      this.scene?.destroy();
      destroyApplication(this.application);
    }
    this.scene = null;
    this.application = null;
  }

  /**
   * With the manual time source the ticker is stopped: nothing is simulated or drawn until `advanceTime()`,
   * which keeps automated runs cheap on machines that render WebGL in software.
   */
  private applyTimeSource(): void {
    const application = this.application;
    if (!application) return;
    if (this.timeSource === 'manual') {
      application.ticker.stop();
      application.render();
    } else {
      application.ticker.start();
    }
  }

  private readonly handleTick = (ticker: Ticker): void => {
    const profiler = this.timeSource === 'realTime' ? this.options.profiler : null;
    this.profiledFrameStart = profiler ? profiler.beginFrame() : null;
    this.advanceFrame(this.timeSource === 'realTime' ? ticker.deltaMS / 1000 : 0);
  };

  private readonly handleFrameEnd = (): void => {
    if (this.profiledFrameStart === null || !this.options.profiler) return;
    this.options.profiler.endFrame(this.profiledFrameStart, this.countEntities);
    this.profiledFrameStart = null;
  };

  private readonly countEntities = (): EntityCounts => ({
    enemies: this.session.world.livingEnemies().length,
    projectiles: this.session.world.projectiles.length,
    effects: this.scene?.statistics.effects ?? 0,
    displayObjects: this.scene?.countDisplayObjects() ?? 0,
  });

  private advanceFrame(frameSeconds: number): void {
    if (this.disposed) return;
    const isRunning = this.session.status === 'running';
    const steps = isRunning ? this.clock.advance(frameSeconds) : 0;
    for (let step = 0; step < steps && this.session.status === 'running'; step++) {
      this.session.step(this.input.toCommands());
      this.dispatchEvents();
    }
    this.dispatchEvents();
    this.scene?.render(this.clock.interpolationFactor, this.session.status === 'paused' ? 0 : frameSeconds);
    this.publish();
    this.updateSounds();
    if (this.session.status === 'ended') this.handleEndedFrame(frameSeconds);
  }

  /** Hands the events of the last step(s) to the scene (visual feedback) and the sound director. */
  private dispatchEvents(): void {
    const events = this.session.drainEvents();
    this.scene?.handleEvents(events);
    this.sounds?.handleEvents(events);
  }

  private updateSounds(): void {
    const player = this.session.player;
    this.sounds?.update({
      isRunning: this.session.status === 'running',
      isPlayerSailing: player.isAlive && Math.abs(player.speed) > SAILING_SOUND_MIN_SPEED,
      healthRatio: player.maxHealth > 0 ? player.health / player.maxHealth : 0,
      remainingSeconds: this.session.remainingSeconds,
    });
  }

  private createSoundDirector(): MatchSoundDirector | null {
    return this.options.sound ? new MatchSoundDirector(this.options.sound, this.session.player.id) : null;
  }

  /** Stops input as soon as the match ends, then reports the result once the final effects have played. */
  private handleEndedFrame(frameSeconds: number): void {
    const result = this.session.result;
    if (!result || this.hasReportedResult) return;
    if (this.secondsSinceEnd === 0) {
      this.keyboard.isAcceptingActions = false;
      this.input.clear();
    }
    this.secondsSinceEnd += frameSeconds;
    if (this.secondsSinceEnd < RESULT_REVEAL_DELAY_SECONDS) return;
    this.hasReportedResult = true;
    this.options.onMatchEnded?.(result);
  }

  private resizeTo(host: HTMLElement): void {
    if (!this.application) return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    this.application.renderer.resize(width, height, Viewport.renderResolutionFor(window.devicePixelRatio));
    this.scene?.applyLayout(this.viewport.fit(width, height));
  }

  private publish(): void {
    this.store.publish(this.describeMatch());
  }

  private describeMatch(): MatchView {
    return { ...this.session.snapshot(), result: this.session.result };
  }
}
