const DEFAULT_MAX_FRAME_SECONDS = 0.25;
const FLOATING_POINT_TOLERANCE = 1e-9;

/**
 * Fixed-timestep accumulator. The render loop reports real elapsed time; the clock answers how many
 * fixed simulation steps must run and how far presentation is between two steps.
 *
 * - The number of steps does not depend on the frame rate (30, 60 or 144 FPS give the same result).
 * - A single frame is capped (`maxFrameSeconds`), so a long gap such as a hidden tab is dropped,
 *   never simulated later.
 * - `discardPendingTime()` is called when resuming from pause, so time spent paused is never simulated.
 */
export class SimulationClock {
  private pendingSeconds = 0;

  constructor(
    readonly stepSeconds: number,
    readonly maxFrameSeconds = DEFAULT_MAX_FRAME_SECONDS,
  ) {
    if (!(stepSeconds > 0)) throw new Error('stepSeconds must be positive');
  }

  /** Adds real elapsed time and returns how many fixed steps must be simulated now. */
  advance(frameSeconds: number): number {
    if (!Number.isFinite(frameSeconds) || frameSeconds <= 0) return 0;
    this.pendingSeconds += Math.min(frameSeconds, this.maxFrameSeconds);
    const steps = Math.floor((this.pendingSeconds + FLOATING_POINT_TOLERANCE) / this.stepSeconds);
    this.pendingSeconds = Math.max(0, this.pendingSeconds - steps * this.stepSeconds);
    return steps;
  }

  /** Progress in [0, 1) between the previous and the current simulation step, for interpolation. */
  get interpolationFactor(): number {
    return Math.min(this.pendingSeconds / this.stepSeconds, 0.999);
  }

  discardPendingTime(): void {
    this.pendingSeconds = 0;
  }
}
