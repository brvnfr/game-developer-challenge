import { describe, expect, it } from 'vitest';
import { SeededRandom } from './SeededRandom';

const sample = (random: SeededRandom, count: number) => Array.from({ length: count }, () => random.next());

describe('SeededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    expect(sample(new SeededRandom(42), 20)).toEqual(sample(new SeededRandom(42), 20));
  });

  it('produces different sequences for different seeds', () => {
    expect(new SeededRandom(1).next()).not.toBe(new SeededRandom(2).next());
  });

  it('keeps every value within the requested range', () => {
    const random = new SeededRandom(7);
    for (let draw = 0; draw < 1000; draw++) {
      const fraction = random.next();
      expect(fraction).toBeGreaterThanOrEqual(0);
      expect(fraction).toBeLessThan(1);
      expect([3, 4, 5]).toContain(random.integerBetween(3, 5));
      const value = random.between(-2, 2);
      expect(value).toBeGreaterThanOrEqual(-2);
      expect(value).toBeLessThan(2);
      expect([1, -1]).toContain(random.sign());
    }
  });

  it('shuffles without losing items and picks from the list', () => {
    const random = new SeededRandom(9);
    const items = [1, 2, 3, 4, 5, 6];
    expect(random.shuffled(items).sort()).toEqual(items);
    expect(items).toContain(random.pick(items));
    expect(() => random.pick([])).toThrow();
  });
});
