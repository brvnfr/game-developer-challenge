/** Continuous gameplay actions, active while the key or touch button is held. */
export const GAME_ACTIONS = ['sailForward', 'turnLeft', 'turnRight', 'fireFront', 'fireLeft', 'fireRight'] as const;
export type GameAction = (typeof GAME_ACTIONS)[number];

/** Edge-triggered command handled outside the continuous input state. */
export type ControlCommand = 'togglePause';

export type BoundAction = GameAction | ControlCommand;

export interface KeyBinding {
  /** `KeyboardEvent.code` values (physical keys, independent of the keyboard layout). */
  readonly keyCodes: readonly string[];
  /** Labels shown in the control instructions. */
  readonly keyLabels: readonly string[];
  readonly description: string;
}

/** Single source of truth for keyboard controls, used by the input layer and by the on-screen instructions. */
export const KEY_BINDINGS: Readonly<Record<BoundAction, KeyBinding>> = {
  sailForward: { keyCodes: ['KeyW', 'ArrowUp'], keyLabels: ['W', '↑'], description: 'Sail forward' },
  turnLeft: { keyCodes: ['KeyA', 'ArrowLeft'], keyLabels: ['A', '←'], description: 'Turn left' },
  turnRight: { keyCodes: ['KeyD', 'ArrowRight'], keyLabels: ['D', '→'], description: 'Turn right' },
  fireFront: { keyCodes: ['Space'], keyLabels: ['Space'], description: 'Fire front cannon' },
  fireLeft: { keyCodes: ['KeyQ'], keyLabels: ['Q'], description: 'Fire left broadside (3 shots)' },
  fireRight: { keyCodes: ['KeyE'], keyLabels: ['E'], description: 'Fire right broadside (3 shots)' },
  togglePause: { keyCodes: ['KeyP', 'Escape'], keyLabels: ['P', 'Esc'], description: 'Pause' },
};

const ACTION_BY_KEY_CODE: ReadonlyMap<string, BoundAction> = new Map(
  (Object.entries(KEY_BINDINGS) as [BoundAction, KeyBinding][]).flatMap(([action, binding]) =>
    binding.keyCodes.map((keyCode) => [keyCode, action] as const),
  ),
);

export function findActionForKeyCode(keyCode: string): BoundAction | undefined {
  return ACTION_BY_KEY_CODE.get(keyCode);
}
