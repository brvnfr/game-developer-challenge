/**
 * "Sail towards this heading": the virtual joystick of touch screens. The rules turn the ship towards it with
 * the same rudder limits as any turn (no overshoot) and sail at `throttle`.
 */
export interface SteeringCommand {
  /** Radians, world frame (0 = east, π/2 = south). */
  readonly heading: number;
  /** 0–1. */
  readonly throttle: number;
}

/** Player intent for one simulation step, produced by the input layer (keyboard or touch). */
export interface PlayerCommands {
  readonly isSailingForward: boolean;
  /** -1 = turn left, 1 = turn right, 0 = keep heading. */
  readonly turnDirection: -1 | 0 | 1;
  readonly isFiringFront: boolean;
  readonly isFiringLeft: boolean;
  readonly isFiringRight: boolean;
  /** Joystick steering; ignored while a turn or sail key/button is held. */
  readonly steering: SteeringCommand | null;
}

export const IDLE_COMMANDS: PlayerCommands = Object.freeze({
  isSailingForward: false,
  turnDirection: 0,
  isFiringFront: false,
  isFiringLeft: false,
  isFiringRight: false,
  steering: null,
});
