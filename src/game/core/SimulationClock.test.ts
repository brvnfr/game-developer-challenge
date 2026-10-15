import { describe, expect, it } from 'vitest';
import { SimulationClock } from './SimulationClock';

const STEP_SECONDS = 1 / 60;

function countStepsAt(framesPerSecond: number, seconds: number, clock = new SimulationClock(STEP_SECONDS)): number {
  let steps = 0;
  const frameCount = Math.round(seconds * framesPerSecond);
  for (let frame = 0; frame < frameCount; frame++) steps += clock.advance(1 / framesPerSecond);
  return steps;
}

describe('SimulationClock', () => {
  it.each([30, 60, 144, 240])('runs the same number of steps at %i FPS', (framesPerSecond) => {
    expect(countStepsAt(framesPerSecond, 10)).toBe(600);
  });

  it('caps a very long frame so a hidden-tab gap is never simulated', () => {
    const clock = new SimulationClock(STEP_SECONDS, 0.25);
    expect(clock.advance(10)).toBe(15);
  });

  it('discards pending time on request (used when resuming from pause)', () => {
    const clock = new SimulationClock(STEP_SECONDS);
    clock.advance(STEP_SECONDS * 0.9);
    expect(clock.interpolationFactor).toBeGreaterThan(0.8);
    clock.discardPendingTime();
    expect(clock.interpolationFactor).toBe(0);
    expect(clock.advance(STEP_SECONDS * 0.5)).toBe(0);
  });

  it('ignores invalid frame durations', () => {
    const clock = new SimulationClock(STEP_SECONDS);
    expect(clock.advance(-1)).toBe(0);
    expect(clock.advance(Number.NaN)).toBe(0);
    expect(clock.advance(0)).toBe(0);
    expect(clock.interpolationFactor).toBe(0);
  });

  it('rejects a non-positive step', () => {
    expect(() => new SimulationClock(0)).toThrow();
  });
});
