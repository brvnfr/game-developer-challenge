import { Listeners } from '@/shared/Listeners';

/**
 * Minimal external store compatible with React's `useSyncExternalStore`. Listeners are notified only when
 * the state actually changes (shallow comparison), so publishing every frame does not re-render React.
 */
export class ExternalStore<State extends object> {
  private state: State;
  private readonly listeners = new Listeners();
  private notificationCount = 0;

  constructor(initialState: State) {
    this.state = initialState;
  }

  readonly getSnapshot = (): State => this.state;

  readonly subscribe = this.listeners.subscribe;

  /** Number of change notifications sent so far (diagnostics and tests). */
  get notifications(): number {
    return this.notificationCount;
  }

  get listenerCount(): number {
    return this.listeners.count;
  }

  /** Replaces the state if any top-level field differs, then notifies the listeners. */
  publish(nextState: State): void {
    if (ExternalStore.isShallowEqual(this.state, nextState)) return;
    this.state = nextState;
    this.notificationCount++;
    this.listeners.notify();
  }

  private static isShallowEqual(first: object, second: object): boolean {
    const firstEntries = Object.entries(first);
    if (firstEntries.length !== Object.keys(second).length) return false;
    return firstEntries.every(([key, value]) => Object.is(value, (second as Record<string, unknown>)[key]));
  }
}
