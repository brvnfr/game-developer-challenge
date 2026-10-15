import type { PlayerCommands, SteeringCommand } from '@/game/sim/PlayerCommands';
import { Listeners } from '@/shared/Listeners';
import { GAME_ACTIONS, type GameAction } from './keyBindings';

/**
 * Aggregates held actions from any number of input sources (the keyboard, each touch pointer…).
 * An action stays active while at least one source holds it, so keyboard and touch can be combined and
 * releasing one finger never cancels another source.
 */
export class InputState {
  private readonly holdersByAction = new Map<GameAction, Set<string>>(
    GAME_ACTIONS.map((action) => [action, new Set<string>()]),
  );
  /** Joystick steering per source; the most recent source wins. */
  private readonly steeringBySource = new Map<string, SteeringCommand>();
  private readonly listeners = new Listeners();
  private heldKey = '';

  press(sourceId: string, action: GameAction): void {
    this.holdersByAction.get(action)?.add(sourceId);
    this.notifyIfHeldChanged();
  }

  release(sourceId: string, action: GameAction): void {
    this.holdersByAction.get(action)?.delete(sourceId);
    this.notifyIfHeldChanged();
  }

  /**
   * Calls `listener` whenever the set of held actions changes (not on key repeats or steering moves), so the
   * on-screen controls can show what is pressed without polling every frame. Returns the unsubscribe function.
   */
  readonly subscribe = this.listeners.subscribe;

  /** Held actions as a stable key ("fireFront sailForward"; empty when nothing is held). */
  getHeldKey = (): string => this.heldKey;

  /** Sets (or moves) a source's joystick steering. */
  steer(sourceId: string, steering: SteeringCommand): void {
    this.steeringBySource.delete(sourceId);
    this.steeringBySource.set(sourceId, steering);
  }

  stopSteering(sourceId: string): void {
    this.steeringBySource.delete(sourceId);
  }

  /** Releases everything held by one source (e.g. a cancelled pointer or a detached keyboard). */
  releaseSource(sourceId: string): void {
    for (const holders of this.holdersByAction.values()) holders.delete(sourceId);
    this.steeringBySource.delete(sourceId);
    this.notifyIfHeldChanged();
  }

  isActive(action: GameAction): boolean {
    return (this.holdersByAction.get(action)?.size ?? 0) > 0;
  }

  /** Drops every held action. Called on pause and focus loss so nothing carries over to the resume. */
  clear(): void {
    for (const holders of this.holdersByAction.values()) holders.clear();
    this.steeringBySource.clear();
    this.notifyIfHeldChanged();
  }

  /** Commands for the next simulation step. */
  toCommands(): PlayerCommands {
    const isTurningLeft = this.isActive('turnLeft');
    const isTurningRight = this.isActive('turnRight');
    return {
      isSailingForward: this.isActive('sailForward'),
      turnDirection: isTurningLeft === isTurningRight ? 0 : isTurningLeft ? -1 : 1,
      isFiringFront: this.isActive('fireFront'),
      isFiringLeft: this.isActive('fireLeft'),
      isFiringRight: this.isActive('fireRight'),
      steering: [...this.steeringBySource.values()].at(-1) ?? null,
    };
  }

  private notifyIfHeldChanged(): void {
    const key = GAME_ACTIONS.filter((action) => this.isActive(action)).join(' ');
    if (key === this.heldKey) return;
    this.heldKey = key;
    this.listeners.notify();
  }
}
