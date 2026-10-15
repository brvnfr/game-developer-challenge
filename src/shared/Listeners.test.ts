import { describe, expect, it } from 'vitest';
import { Listeners } from './Listeners';

describe('Listeners', () => {
  it('notifies every subscriber until it unsubscribes', () => {
    const listeners = new Listeners();
    const calls: string[] = [];
    const unsubscribeFirst = listeners.subscribe(() => calls.push('first'));
    listeners.subscribe(() => calls.push('second'));
    listeners.notify();
    unsubscribeFirst();
    listeners.notify();
    expect(calls).toEqual(['first', 'second', 'second']);
    expect(listeners.count).toBe(1);
  });
});
