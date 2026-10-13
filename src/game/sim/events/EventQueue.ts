import type { GameEvent, GameEventOf, GameEventType } from './GameEvent';

/** Events produced by the simulation since the last drain. */
export class EventQueue {
  private pending: GameEvent[] = [];

  push(event: GameEvent): void {
    this.pending.push(event);
  }

  /** Returns the pending events and clears the queue. */
  drain(): GameEvent[] {
    const drained = this.pending;
    this.pending = [];
    return drained;
  }

  /** Pending events of one type pushed since `index`, without consuming them. */
  ofTypeSince<Type extends GameEventType>(type: Type, index: number): GameEventOf<Type>[] {
    return this.pending.slice(index).filter((event): event is GameEventOf<Type> => event.type === type);
  }

  get size(): number {
    return this.pending.length;
  }
}
