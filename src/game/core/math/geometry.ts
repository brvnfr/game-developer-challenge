import { Vector2 } from './Vector2';

/** Axis-aligned rectangle. */
export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

function closestPointInBox(point: Vector2, box: BoundingBox): Vector2 {
  return new Vector2(Math.min(Math.max(point.x, box.minX), box.maxX), Math.min(Math.max(point.y, box.minY), box.maxY));
}

export function circleOverlapsBox(center: Vector2, radius: number, box: BoundingBox): boolean {
  const offset = center.subtract(closestPointInBox(center, box));
  return offset.dot(offset) < radius * radius;
}

/**
 * Smallest translation that moves the circle out of the box, or null when they do not overlap.
 * A center inside the box leaves through the nearest side.
 */
export function circleBoxSeparation(center: Vector2, radius: number, box: BoundingBox): Vector2 | null {
  const offset = center.subtract(closestPointInBox(center, box));
  const distanceSquared = offset.dot(offset);
  if (distanceSquared >= radius * radius) return null;
  if (distanceSquared > 0) {
    const distance = Math.sqrt(distanceSquared);
    return offset.scale((radius - distance) / distance);
  }
  const distanceToLeft = center.x - box.minX;
  const distanceToRight = box.maxX - center.x;
  const distanceToTop = center.y - box.minY;
  const distanceToBottom = box.maxY - center.y;
  const nearest = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);
  if (nearest === distanceToLeft) return new Vector2(-(distanceToLeft + radius), 0);
  if (nearest === distanceToRight) return new Vector2(distanceToRight + radius, 0);
  if (nearest === distanceToTop) return new Vector2(0, -(distanceToTop + radius));
  return new Vector2(0, distanceToBottom + radius);
}

/**
 * First point where the segment start→end enters the circle, as a fraction of the segment in [0, 1],
 * or null when it never does. A segment that starts inside the circle returns 0.
 */
export function segmentCircleEntry(start: Vector2, end: Vector2, center: Vector2, radius: number): number | null {
  const direction = end.subtract(start);
  const fromCenter = start.subtract(center);
  const startOutside = fromCenter.dot(fromCenter) - radius * radius;
  if (startOutside <= 0) return 0;
  const quadraticA = direction.dot(direction);
  if (quadraticA === 0) return null;
  const quadraticB = 2 * fromCenter.dot(direction);
  const discriminant = quadraticB * quadraticB - 4 * quadraticA * startOutside;
  if (discriminant < 0) return null;
  const entry = (-quadraticB - Math.sqrt(discriminant)) / (2 * quadraticA);
  return entry >= 0 && entry <= 1 ? entry : null;
}

/** First point where the segment start→end enters the box (slab method), as a fraction in [0, 1], or null. */
export function segmentBoxEntry(start: Vector2, end: Vector2, box: BoundingBox): number | null {
  let entry = 0;
  let exit = 1;
  const axes = [
    { origin: start.x, delta: end.x - start.x, minimum: box.minX, maximum: box.maxX },
    { origin: start.y, delta: end.y - start.y, minimum: box.minY, maximum: box.maxY },
  ];
  for (const { origin, delta, minimum, maximum } of axes) {
    if (Math.abs(delta) < 1e-12) {
      if (origin < minimum || origin > maximum) return null;
      continue;
    }
    const nearSide = (minimum - origin) / delta;
    const farSide = (maximum - origin) / delta;
    entry = Math.max(entry, Math.min(nearSide, farSide));
    exit = Math.min(exit, Math.max(nearSide, farSide));
    if (entry > exit) return null;
  }
  return entry;
}
