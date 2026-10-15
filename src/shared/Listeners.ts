type Listener = () => void;

/**
 * The listeners of a value that changes over time: `subscribe` has the shape React's `useSyncExternalStore`
 * expects, and the owner calls `notify` after each change. Shared by the match store, the input state, the
 * audio engine and the match outbox.
 */
export class Listeners {
  private readonly listeners = new Set<Listener>();

  /** Adds a listener; returns the function that removes it. */
  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  get count(): number {
    return this.listeners.size;
  }

  notify(): void {
    for (const listener of this.listeners) listener();
  }
}
