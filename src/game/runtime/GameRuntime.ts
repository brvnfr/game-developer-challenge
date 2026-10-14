import { Application, type Ticker } from 'pixi.js';
import type { UserSettings } from '@/game/config/types';
import { SimulationClock } from '@/game/core/SimulationClock';
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
import { MatchFactory, type MatchFactoryOptions } from './MatchFactory';

export type TimeSource = 'realTime' | 'manual';

export interface GameRuntimeOptions extends MatchFactoryOptions {
  readonly textures: GameTextures;
  readonly settings: UserSettings;
  readonly onMatchEnded?: (result: MatchResult) => void;
  /** 'manual' freezes real time; tests advance the simulation explicitly with `advanceTime()`. */
  readonly timeSource?: TimeSource;
}

const MANUAL_TIME_CHUNK_SECONDS = 0.1;
/** The final explosion keeps playing this long before the result screen replaces the arena. */
const RESULT_REVEAL_DELAY_SECONDS = 1.5;
const WATER_BACKGROUND = 0x2c8fc9;

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
  private timeSource: TimeSource;
  private hasReportedResult = false;
  private secondsSinceEnd = 0;
  private disposed = false;

  constructor(private readonly options: GameRuntimeOptions) {
    this.matches = new MatchFactory(options);
    this.session = this.matches.create(options.settings);
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
      application.destroy({ removeView: true }, { children: true });
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
    this.applyTimeSource();
    this.publish();
  }

  /** Pauses the match (manual button/key, focus loss, hidden tab, wrong orientation). */
  pause(reason: PauseReason): void {
    if (!this.session.pause(reason)) return;
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
    this.session = this.matches.create(settings);
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

  /** Advances the game by `milliseconds` of real time, in small chunks (manual time source, tests). */
  advanceTime(milliseconds: number): void {
    let remainingSeconds = milliseconds / 1000;
    while (remainingSeconds > 1e-9) {
      const chunk = Math.min(MANUAL_TIME_CHUNK_SECONDS, remainingSeconds);
      this.advanceFrame(chunk);
      remainingSeconds -= chunk;
    }
    if (this.timeSource === 'manual') this.application?.render();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    GameRuntime.liveInstances.delete(this);
    this.keyboard.detach();
    this.autoPause.detach();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.application) {
      this.application.ticker.remove(this.handleTick);
      this.scene?.destroy();
      this.application.destroy({ removeView: true }, { children: true });
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
    this.advanceFrame(this.timeSource === 'realTime' ? ticker.deltaMS / 1000 : 0);
  };

  private advanceFrame(frameSeconds: number): void {
    if (this.disposed) return;
    const isRunning = this.session.status === 'running';
    const steps = isRunning ? this.clock.advance(frameSeconds) : 0;
    for (let step = 0; step < steps && this.session.status === 'running'; step++) {
      this.session.step(this.input.toCommands());
      this.scene?.handleEvents(this.session.drainEvents());
    }
    this.scene?.handleEvents(this.session.drainEvents());
    this.scene?.render(this.clock.interpolationFactor, this.session.status === 'paused' ? 0 : frameSeconds);
    this.publish();
    if (this.session.status === 'ended') this.handleEndedFrame(frameSeconds);
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
