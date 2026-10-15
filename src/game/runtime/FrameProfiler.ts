import { summarizeFrameTimes, type FrameTimeSummary } from './frameStatistics';

/** Entities alive at one moment (simulation and scene). */
export interface EntityCounts {
  readonly enemies: number;
  readonly projectiles: number;
  readonly effects: number;
  /** Every PixiJS display object under the scene root. */
  readonly displayObjects: number;
}

export interface EntitySample extends EntityCounts {
  /** Seconds since profiling started. */
  readonly atSeconds: number;
  /** Frames drawn during the last second. */
  readonly fps: number;
}

export interface ProfileReport {
  readonly durationSeconds: number;
  readonly frames: FrameTimeSummary;
  /**
   * Main-thread time of each frame: simulation steps, scene update and PixiJS's draw submission. GPU
   * rasterisation happens elsewhere and is excluded; it shows up in the frame intervals instead.
   */
  readonly updateWork: { readonly averageMs: number; readonly p95Ms: number; readonly maxMs: number };
  readonly peakEntities: EntityCounts;
  readonly timeline: readonly EntitySample[];
}

/**
 * Records frame timing and entity counts during real-time play, for the performance report. It only observes:
 * the runtime calls it around each frame when profiling is enabled (test mode with `profile=1`).
 */
export class FrameProfiler {
  private frameIntervalsMs: number[] = [];
  private updateDurationsMs: number[] = [];
  private timeline: EntitySample[] = [];
  private startedAtMs: number | null = null;
  private lastFrameAtMs: number | null = null;
  private lastSampleAtMs = 0;
  private framesSinceSample = 0;

  constructor(private readonly now: () => number = () => performance.now()) {}

  reset(): void {
    this.frameIntervalsMs = [];
    this.updateDurationsMs = [];
    this.timeline = [];
    this.startedAtMs = null;
    this.lastFrameAtMs = null;
    this.framesSinceSample = 0;
  }

  /** Called at the start of every rendered frame; returns the time to pass to `endFrame`. */
  beginFrame(): number {
    const frameStart = this.now();
    if (this.startedAtMs === null) {
      this.startedAtMs = frameStart;
      this.lastSampleAtMs = frameStart;
    }
    if (this.lastFrameAtMs !== null) this.frameIntervalsMs.push(frameStart - this.lastFrameAtMs);
    this.lastFrameAtMs = frameStart;
    this.framesSinceSample++;
    return frameStart;
  }

  /** Called after the frame was drawn: records its main-thread work and, once per second, the entity counts. */
  endFrame(frameStart: number, countEntities: () => EntityCounts): void {
    const frameEnd = this.now();
    this.updateDurationsMs.push(frameEnd - frameStart);
    const sinceSampleMs = frameEnd - this.lastSampleAtMs;
    if (sinceSampleMs < 1000 || this.startedAtMs === null) return;
    this.timeline.push({
      atSeconds: Number(((frameEnd - this.startedAtMs) / 1000).toFixed(1)),
      fps: Number(((this.framesSinceSample * 1000) / sinceSampleMs).toFixed(1)),
      ...countEntities(),
    });
    this.lastSampleAtMs = frameEnd;
    this.framesSinceSample = 0;
  }

  report(): ProfileReport {
    const work = summarizeFrameTimes(this.updateDurationsMs);
    const peak = (key: keyof EntityCounts) => Math.max(0, ...this.timeline.map((sample) => sample[key]));
    return {
      durationSeconds:
        this.startedAtMs === null || this.lastFrameAtMs === null
          ? 0
          : Number(((this.lastFrameAtMs - this.startedAtMs) / 1000).toFixed(1)),
      frames: summarizeFrameTimes(this.frameIntervalsMs),
      updateWork: { averageMs: work.averageFrameMs, p95Ms: work.p95FrameMs, maxMs: work.maxFrameMs },
      peakEntities: {
        enemies: peak('enemies'),
        projectiles: peak('projectiles'),
        effects: peak('effects'),
        displayObjects: peak('displayObjects'),
      },
      timeline: [...this.timeline],
    };
  }
}
