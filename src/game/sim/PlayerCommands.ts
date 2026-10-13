/** Player intent for one simulation step, produced by the input layer (keyboard or touch). */
export interface PlayerCommands {
  readonly isSailingForward: boolean;
  /** -1 = turn left, 1 = turn right, 0 = keep heading. */
  readonly turnDirection: -1 | 0 | 1;
  readonly isFiringFront: boolean;
  readonly isFiringLeft: boolean;
  readonly isFiringRight: boolean;
}

export const IDLE_COMMANDS: PlayerCommands = Object.freeze({
  isSailingForward: false,
  turnDirection: 0,
  isFiringFront: false,
  isFiringLeft: false,
  isFiringRight: false,
});
