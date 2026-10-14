import { describe, expect, it, vi } from 'vitest';
import { ExternalStore } from './ExternalStore';

describe('ExternalStore', () => {
  it('notifies listeners only when a field actually changes', () => {
    const store = new ExternalStore({ score: 0, health: 100 });
    const listener = vi.fn();
    store.subscribe(listener);
    for (let frame = 0; frame < 600; frame++) store.publish({ score: 0, health: 100 });
    expect(listener).not.toHaveBeenCalled();
    store.publish({ score: 1, health: 100 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({ score: 1, health: 100 });
    expect(store.notifications).toBe(1);
  });

  it('stops notifying after unsubscribing', () => {
    const store = new ExternalStore({ value: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.publish({ value: 1 });
    expect(listener).not.toHaveBeenCalled();
    expect(store.listenerCount).toBe(0);
  });
});
