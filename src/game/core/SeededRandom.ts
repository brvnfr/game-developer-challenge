/**
 * Deterministic pseudo-random generator (mulberry32). Each match owns one instance created from its seed,
 * so the same seed and inputs always replay the same match (tests, reproducible scenarios).
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Random seed for normal (non-test) matches. */
  static createSeed(): number {
    return (Math.random() * 2 ** 32) >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let mixed = this.state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [minimum, maximum). */
  between(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.next();
  }

  /** Integer in [minimum, maximum], both inclusive. */
  integerBetween(minimum: number, maximum: number): number {
    return minimum + Math.floor(this.next() * (maximum - minimum + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Randomly -1 or 1. */
  sign(): 1 | -1 {
    return this.chance(0.5) ? 1 : -1;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Cannot pick from an empty list');
    return items[Math.floor(this.next() * items.length)] as T;
  }
}
