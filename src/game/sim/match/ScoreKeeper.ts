import type { EventQueue } from '../events/EventQueue';

/** One point per enemy destroyed by the player's projectiles. Rams (Chaser self-destruction) never score. */
export class ScoreKeeper {
  private points = 0;

  get score(): number {
    return this.points;
  }

  /** Counts the destructions pushed to the queue since `firstEventIndex` and emits `scoreChanged`. */
  collect(events: EventQueue, firstEventIndex: number): void {
    const kills = events
      .ofTypeSince('shipDestroyed', firstEventIndex)
      .filter((event) => event.kind !== 'player' && event.cause === 'playerProjectile').length;
    for (let kill = 0; kill < kills; kill++) {
      this.points++;
      events.push({ type: 'scoreChanged', score: this.points });
    }
  }
}
