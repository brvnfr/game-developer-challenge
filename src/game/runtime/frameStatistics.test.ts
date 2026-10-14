import { describe, expect, it } from 'vitest';
import { percentile, summarizeFrameTimes } from './frameStatistics';

describe('percentile', () => {
  it('uses the nearest rank', () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1);
    expect(percentile(values, 0.95)).toBe(95);
    expect(percentile(values, 0.5)).toBe(50);
    expect(percentile([7], 0.99)).toBe(7);
    expect(percentile([], 0.95)).toBe(0);
  });
});

describe('summarizeFrameTimes', () => {
  it('reports FPS, percentiles and long frames', () => {
    const intervals = [...Array.from({ length: 95 }, () => 16.67), 20, 25, 30, 40, 50];
    const summary = summarizeFrameTimes(intervals);
    expect(summary.frames).toBe(100);
    expect(summary.p50FrameMs).toBe(16.67);
    expect(summary.p95FrameMs).toBe(16.67);
    expect(summary.p99FrameMs).toBe(40);
    expect(summary.maxFrameMs).toBe(50);
    expect(summary.framesOver33Ms).toBe(2);
    expect(summary.averageFps).toBeCloseTo(1000 / ((95 * 16.67 + 165) / 100), 0);
  });

  it('handles an empty run', () => {
    expect(summarizeFrameTimes([])).toMatchObject({ frames: 0, averageFps: 0, p95FrameMs: 0 });
  });
});
