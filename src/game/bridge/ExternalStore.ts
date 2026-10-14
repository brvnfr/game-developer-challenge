type Listener = () => void;

/**
 * Minimal external store compatible with React's `useSyncExternalStore`. Listeners are notified only when
 * the state actually changes (shallow comparison), so publishing every frame does not re-render React.
 */
export class ExternalStore<State extends object> {
  private state: State;
  private readonly listeners = new Set<Listener>();
  private notificationCount = 0;

  constructor(initialState: State) {
    this.state = initialState;
  }

  readonly getSnapshot = (): State => this.state;

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Number of change notifications sent so far (diagnostics and tests). */
  get notifications(): number {
    return this.notificationCount;
  }

  get listenerCount(): number {
    return this.listeners.size;
  }

  /** Replaces the state if any top-level field differs, then notifies the listeners. */
  publish(nextState: State): void {
    if (ExternalStore.isShallowEqual(this.state, nextState)) return;
    this.state = nextState;
    this.notificationCount++;
    for (const listener of this.listeners) listener();
  }

  private static isShallowEqual(first: object, second: object): boolean {
    const firstEntries = Object.entries(first);
    if (firstEntries.length !== Object.keys(second).length) return false;
    return firstEntries.every(([key, value]) => Object.is(value, (second as Record<string, unknown>)[key]));
  }
}
