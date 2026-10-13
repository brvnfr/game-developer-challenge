/** Immutable 2D vector in world space (pixels). The y axis points down, as on screen. */
export class Vector2 {
  static readonly ZERO = new Vector2(0, 0);

  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  /** Unit vector for a heading in radians: 0 points to +x, PI/2 points down (+y). */
  static fromAngle(angle: number): Vector2 {
    return new Vector2(Math.cos(angle), Math.sin(angle));
  }

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  scale(factor: number): Vector2 {
    return new Vector2(this.x * factor, this.y * factor);
  }

  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  get length(): number {
    return Math.hypot(this.x, this.y);
  }

  normalized(): Vector2 {
    const length = this.length;
    return length === 0 ? Vector2.ZERO : new Vector2(this.x / length, this.y / length);
  }

  distanceTo(other: Vector2): number {
    return Math.hypot(other.x - this.x, other.y - this.y);
  }

  /** Heading (radians) of the direction from this point to `other`. */
  angleTo(other: Vector2): number {
    return Math.atan2(other.y - this.y, other.x - this.x);
  }

  /** Point at `fraction` (0..1) of the way to `other`. */
  lerp(other: Vector2, fraction: number): Vector2 {
    return new Vector2(this.x + (other.x - this.x) * fraction, this.y + (other.y - this.y) * fraction);
  }

  /** Perpendicular pointing to the left of this direction on screen (y down). */
  leftPerpendicular(): Vector2 {
    return new Vector2(this.y, -this.x);
  }

  equals(other: Vector2): boolean {
    return this.x === other.x && this.y === other.y;
  }
}
