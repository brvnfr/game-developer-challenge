import { describe, expect, it } from 'vitest';
import { angleDifference, clamp, wrapAngle } from './angles';
import {
  circleBoxSeparation,
  circleOverlapsBox,
  segmentBoxEntry,
  segmentCircleEntry,
  type BoundingBox,
} from './geometry';
import { Vector2 } from './Vector2';

const square: BoundingBox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
const point = (x: number, y: number) => new Vector2(x, y);

describe('Vector2', () => {
  it('supports the basic vector operations without mutating', () => {
    const vector = point(3, 4);
    expect(vector.length).toBe(5);
    expect(vector.add(point(1, 1))).toEqual(point(4, 5));
    expect(vector.subtract(point(1, 1))).toEqual(point(2, 3));
    expect(vector.scale(2)).toEqual(point(6, 8));
    expect(vector.normalized().length).toBeCloseTo(1);
    expect(vector).toEqual(point(3, 4));
    expect(Vector2.ZERO.normalized()).toEqual(Vector2.ZERO);
  });

  it('converts between headings and directions (y axis pointing down)', () => {
    expect(Vector2.fromAngle(Math.PI / 2).y).toBeCloseTo(1);
    expect(point(0, 0).angleTo(point(0, 10))).toBeCloseTo(Math.PI / 2);
    expect(point(1, 0).leftPerpendicular()).toEqual(point(0, -1));
    expect(point(0, 0).lerp(point(10, 0), 0.25)).toEqual(point(2.5, 0));
  });
});

describe('circle against box', () => {
  it('detects overlap and treats exact tangency as no overlap', () => {
    expect(circleOverlapsBox(point(110, 50), 11, square)).toBe(true);
    expect(circleOverlapsBox(point(110, 50), 10, square)).toBe(false);
    expect(circleOverlapsBox(point(50, 50), 1, square)).toBe(true);
  });

  it('separates a circle through the nearest side, even from inside the box', () => {
    expect(circleBoxSeparation(point(105, 50), 10, square)).toEqual(point(5, 0));
    expect(circleBoxSeparation(point(50, 95), 10, square)).toEqual(point(0, 15));
    expect(circleBoxSeparation(point(130, 50), 10, square)).toBeNull();
  });

  it('separates diagonally from a corner', () => {
    const center = point(103, 104);
    const separation = circleBoxSeparation(center, 10, square);
    expect(separation).not.toBeNull();
    expect(center.add(separation ?? Vector2.ZERO).distanceTo(point(100, 100))).toBeCloseTo(10);
  });
});

describe('segment entry', () => {
  it('finds where a segment enters a circle', () => {
    expect(segmentCircleEntry(point(0, 0), point(100, 0), point(50, 0), 10)).toBeCloseTo(0.4);
    expect(segmentCircleEntry(point(0, 20), point(100, 20), point(50, 0), 10)).toBeNull();
    expect(segmentCircleEntry(point(48, 0), point(100, 0), point(50, 0), 10)).toBe(0);
  });

  it('catches a fast segment crossing a small circle (no tunnelling)', () => {
    expect(segmentCircleEntry(point(-500, 0), point(500, 0), point(0, 0), 2)).not.toBeNull();
  });

  it('finds where a segment enters a box', () => {
    expect(segmentBoxEntry(point(-50, 50), point(50, 50), square)).toBeCloseTo(0.5);
    expect(segmentBoxEntry(point(-50, 150), point(50, 150), square)).toBeNull();
    expect(segmentBoxEntry(point(50, 50), point(60, 60), square)).toBe(0);
    expect(segmentBoxEntry(point(50, -10), point(50, -1), square)).toBeNull();
  });
});

describe('angles', () => {
  it('wraps angles to (-PI, PI]', () => {
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(0.5)).toBeCloseTo(0.5);
  });

  it('computes the shortest signed rotation', () => {
    expect(angleDifference(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
    expect(angleDifference(0.1, -0.1)).toBeCloseTo(-0.2);
  });

  it('clamps values', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
  });
});
