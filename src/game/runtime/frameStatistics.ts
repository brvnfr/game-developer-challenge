/** Value below which `fraction` of the sorted samples fall (nearest-rank method). */
export function percentile(sortedValues: readonly number[], fraction: number): number {
  if (sortedValues.length === 0) return 0;
  const rank = Math.ceil(fraction * sortedValues.length);
  return sortedValues[Math.min(sortedValues.length, Math.max(1, rank)) - 1] ?? 0;
}

export interface FrameTimeSummary {
  readonly frames: number;
  readonly averageFps: number;
  readonly averageFrameMs: number;
  readonly p50FrameMs: number;
  readonly p95FrameMs: number;
  readonly p99FrameMs: number;
  readonly maxFrameMs: number;
  /** Frames longer than 1/30 s: visible stutter at a 60 Hz target. */
  readonly framesOver33Ms: number;
}

const round = (value: number, decimals = 2) => Number(value.toFixed(decimals));

/** Summarises the intervals between frames (milliseconds). */
export function summarizeFrameTimes(frameIntervalsMs: readonly number[]): FrameTimeSummary {
  const sorted = [...frameIntervalsMs].sort((first, second) => first - second);
  const totalMs = sorted.reduce((sum, value) => sum + value, 0);
  const averageFrameMs = sorted.length > 0 ? totalMs / sorted.length : 0;
  return {
    frames: sorted.length,
    averageFps: totalMs > 0 ? round((sorted.length * 1000) / totalMs, 1) : 0,
    averageFrameMs: round(averageFrameMs),
    p50FrameMs: round(percentile(sorted, 0.5)),
    p95FrameMs: round(percentile(sorted, 0.95)),
    p99FrameMs: round(percentile(sorted, 0.99)),
    maxFrameMs: round(sorted.at(-1) ?? 0),
    framesOver33Ms: sorted.filter((value) => value > 1000 / 30).length,
  };
}
