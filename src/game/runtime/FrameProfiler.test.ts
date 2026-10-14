import { describe, expect, it } from 'vitest';
import { FrameProfiler } from './FrameProfiler';

function fakeClock() {
  let nowMs = 0;
  return { now: () => nowMs, advance: (ms: number) => (nowMs += ms) };
}

const COUNTS = { enemies: 3, projectiles: 7, effects: 2, displayObjects: 120 };

describe('FrameProfiler', () => {
  it('measures frame intervals, frame work and one entity sample per second', () => {
    const clock = fakeClock();
    const profiler = new FrameProfiler(clock.now);
    for (let frame = 0; frame < 121; frame++) {
      const start = profiler.beginFrame();
      clock.advance(2); // the game's own work
      profiler.endFrame(start, () => ({ ...COUNTS, projectiles: frame }));
      clock.advance(14.67);
    }
    const report = profiler.report();
    expect(report.frames.frames).toBe(120);
    expect(report.frames.averageFps).toBeCloseTo(60, 0);
    expect(report.updateWork.p95Ms).toBe(2);
    expect(report.timeline).toHaveLength(2);
    expect(report.timeline[0]?.fps).toBeCloseTo(60, -1);
    expect(report.peakEntities.projectiles).toBeGreaterThan(100);
    expect(report.durationSeconds).toBeCloseTo(2, 0);
  });

  it('starts over after reset', () => {
    const clock = fakeClock();
    const profiler = new FrameProfiler(clock.now);
    profiler.endFrame(profiler.beginFrame(), () => COUNTS);
    clock.advance(16);
    profiler.endFrame(profiler.beginFrame(), () => COUNTS);
    profiler.reset();
    expect(profiler.report()).toMatchObject({ durationSeconds: 0, frames: { frames: 0 }, timeline: [] });
  });
});
