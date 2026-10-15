import { useSyncExternalStore, type PointerEvent } from 'react';
import fireFrontIcon from '@assets/png/retina/ui/controls/icon_fire_front.png';
import fireLeftIcon from '@assets/png/retina/ui/controls/icon_fire_left.png';
import fireRightIcon from '@assets/png/retina/ui/controls/icon_fire_right.png';
import forwardIcon from '@assets/png/retina/ui/controls/icon_forward.png';
import turnLeftIcon from '@assets/png/retina/ui/controls/icon_turn_left.png';
import turnRightIcon from '@assets/png/retina/ui/controls/icon_turn_right.png';
import type { InputState } from '@/game/input/InputState';
import { KEY_BINDINGS, type GameAction } from '@/game/input/keyBindings';
import { VirtualJoystick } from './VirtualJoystick';
import './game-controls.css';

/** `touch`: helm joystick and cannon buttons. `keyboard`: every control as a button with its key, lit while held. */
export type ControlMode = 'touch' | 'keyboard';

/** One cannon's reload: how many volleys it has fired (each new one restarts the sweep) and how long it takes. */
export interface ReloadState {
  readonly volleys: number;
  readonly seconds: number;
}

export type WeaponReloads = Readonly<Record<'fireFront' | 'fireLeft' | 'fireRight', ReloadState>>;

interface ControlButtonDefinition {
  readonly action: GameAction;
  readonly icon: string;
}

/** Left to right; the middle button of each group sits higher, like the bow of the ship. */
const MOVEMENT_BUTTONS: readonly ControlButtonDefinition[] = [
  { action: 'turnLeft', icon: turnLeftIcon },
  { action: 'sailForward', icon: forwardIcon },
  { action: 'turnRight', icon: turnRightIcon },
];

const WEAPON_BUTTONS: readonly ControlButtonDefinition[] = [
  { action: 'fireLeft', icon: fireLeftIcon },
  { action: 'fireFront', icon: fireFrontIcon },
  { action: 'fireRight', icon: fireRightIcon },
];

/** The actions held right now, from any source; re-renders only when that set changes. */
function useHeldActions(input: InputState): ReadonlySet<string> {
  const heldKey = useSyncExternalStore(input.subscribe, input.getHeldKey);
  return new Set(heldKey.split(' '));
}

/**
 * On-screen controls. Every button lights up while its action is held — by a finger, the mouse or the
 * keyboard — so the player sees what the ship is doing. Each pointer is its own input source, so one thumb can
 * steer while the other fires; lifting or cancelling a finger releases what it held.
 */
export function GameControls({
  input,
  mode,
  reloads,
  isHidden,
}: {
  readonly input: InputState;
  readonly mode: ControlMode;
  readonly reloads: WeaponReloads;
  /** While paused the controls stay mounted but hidden, so the reload sweeps freeze instead of restarting. */
  readonly isHidden: boolean;
}) {
  const held = useHeldActions(input);
  const showKeys = mode === 'keyboard';
  return (
    <div
      className={`game-controls game-controls--${mode}${isHidden ? ' game-controls--hidden' : ''}`}
      data-testid="game-controls"
      data-mode={mode}
    >
      {mode === 'touch' ? (
        <VirtualJoystick input={input} />
      ) : (
        <div className="game-controls__group">
          {MOVEMENT_BUTTONS.map((button) => (
            <ControlButton
              key={button.action}
              definition={button}
              input={input}
              isHeld={held.has(button.action)}
              showKey={showKeys}
            />
          ))}
        </div>
      )}
      <div className="game-controls__group">
        {WEAPON_BUTTONS.map((button) => (
          <ControlButton
            key={button.action}
            definition={button}
            input={input}
            isHeld={held.has(button.action)}
            showKey={showKeys}
            reload={reloads[button.action as keyof WeaponReloads]}
          />
        ))}
      </div>
    </div>
  );
}

function ControlButton({
  definition,
  input,
  isHeld,
  showKey,
  reload,
}: {
  readonly definition: ControlButtonDefinition;
  readonly input: InputState;
  readonly isHeld: boolean;
  readonly showKey: boolean;
  readonly reload?: ReloadState;
}) {
  const binding = KEY_BINDINGS[definition.action];
  const sourceId = (event: PointerEvent) => `pointer:${event.pointerId}`;
  const press = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers (e.g. assistive tooling) cannot be captured; the button still works.
    }
    input.press(sourceId(event), definition.action);
  };
  const release = (event: PointerEvent<HTMLButtonElement>) => {
    input.release(sourceId(event), definition.action);
  };
  return (
    <button
      type="button"
      className={`round-button game-controls__button game-controls__button--${definition.action}`}
      aria-label={binding.description}
      data-testid={`control-${definition.action}`}
      data-held={isHeld}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      <img src={definition.icon} alt="" draggable={false} />
      {reload && reload.volleys > 0 && (
        // A CSS sweep the length of the cooldown, restarted (new key) by every volley: no per-frame React work.
        <span
          key={reload.volleys}
          className="game-controls__reload"
          style={{ animationDuration: `${reload.seconds}s` }}
          data-testid={`reload-${definition.action}`}
        />
      )}
      {showKey && (
        <kbd className="game-controls__key" aria-hidden="true">
          {binding.keyLabels[0]}
        </kbd>
      )}
    </button>
  );
}
