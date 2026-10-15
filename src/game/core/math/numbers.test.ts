import { describe, expect, it } from 'vitest';
import { approach, clamp } from './numbers';

describe('number helpers', () => {
  it('clamps to a range', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-2, 0, 1)).toBe(0);
    expect(clamp(0.3, 0, 1)).toBe(0.3);
  });

  it('approaches a target by at most the given step, never past it', () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(9, 10, 3)).toBe(10);
    expect(approach(10, 0, 4)).toBe(6);
    expect(approach(1, 0, 4)).toBe(0);
  });
});
