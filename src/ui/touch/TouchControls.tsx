import type { PointerEvent } from 'react';
import fireFrontIcon from '@assets/png/retina/ui/controls/icon_fire_front.png';
import fireLeftIcon from '@assets/png/retina/ui/controls/icon_fire_left.png';
import fireRightIcon from '@assets/png/retina/ui/controls/icon_fire_right.png';
import forwardIcon from '@assets/png/retina/ui/controls/icon_forward.png';
import turnLeftIcon from '@assets/png/retina/ui/controls/icon_turn_left.png';
import turnRightIcon from '@assets/png/retina/ui/controls/icon_turn_right.png';
import type { InputState } from '@/game/input/InputState';
import type { GameAction } from '@/game/input/keyBindings';
import './touch-controls.css';

interface TouchButtonDefinition {
  readonly action: GameAction;
  readonly label: string;
  readonly icon: string;
}

const MOVEMENT_BUTTONS: readonly TouchButtonDefinition[] = [
  { action: 'turnLeft', label: 'Turn left', icon: turnLeftIcon },
  { action: 'sailForward', label: 'Sail forward', icon: forwardIcon },
  { action: 'turnRight', label: 'Turn right', icon: turnRightIcon },
];

const WEAPON_BUTTONS: readonly TouchButtonDefinition[] = [
  { action: 'fireLeft', label: 'Fire left broadside', icon: fireLeftIcon },
  { action: 'fireFront', label: 'Fire front cannon', icon: fireFrontIcon },
  { action: 'fireRight', label: 'Fire right broadside', icon: fireRightIcon },
];

/**
 * On-screen controls for touch devices. Every pointer is an independent input source, so several fingers
 * can sail, turn and fire at the same time; lifting, cancelling or sliding off a button releases it.
 */
export function TouchControls({ input }: { readonly input: InputState }) {
  return (
    <div className="touch-controls" data-testid="touch-controls">
      <div className="touch-controls__group touch-controls__group--movement">
        {MOVEMENT_BUTTONS.map((button) => (
          <TouchButton key={button.action} definition={button} input={input} />
        ))}
      </div>
      <div className="touch-controls__group touch-controls__group--weapons">
        {WEAPON_BUTTONS.map((button) => (
          <TouchButton key={button.action} definition={button} input={input} />
        ))}
      </div>
    </div>
  );
}

function TouchButton({
  definition,
  input,
}: {
  readonly definition: TouchButtonDefinition;
  readonly input: InputState;
}) {
  const sourceId = (event: PointerEvent) => `touch:${event.pointerId}`;
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
      className={`round-button touch-controls__button touch-controls__button--${definition.action}`}
      aria-label={definition.label}
      data-testid={`touch-${definition.action}`}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      <img src={definition.icon} alt="" draggable={false} />
    </button>
  );
}
