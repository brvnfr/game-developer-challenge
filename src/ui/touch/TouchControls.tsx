import type { PointerEvent } from 'react';
import fireFrontIcon from '@assets/png/retina/ui/controls/icon_fire_front.png';
import fireLeftIcon from '@assets/png/retina/ui/controls/icon_fire_left.png';
import fireRightIcon from '@assets/png/retina/ui/controls/icon_fire_right.png';
import type { InputState } from '@/game/input/InputState';
import type { GameAction } from '@/game/input/keyBindings';
import { VirtualJoystick } from './VirtualJoystick';
import './touch-controls.css';

interface TouchButtonDefinition {
  readonly action: GameAction;
  readonly label: string;
  readonly icon: string;
}

/** One cannon's reload: how many volleys it has fired (each new one restarts the sweep) and how long it takes. */
export interface ReloadState {
  readonly volleys: number;
  readonly seconds: number;
}

export type WeaponReloads = Readonly<Record<'fireFront' | 'fireLeft' | 'fireRight', ReloadState>>;

const WEAPON_BUTTONS: readonly TouchButtonDefinition[] = [
  { action: 'fireLeft', label: 'Fire left broadside', icon: fireLeftIcon },
  { action: 'fireFront', label: 'Fire front cannon', icon: fireFrontIcon },
  { action: 'fireRight', label: 'Fire right broadside', icon: fireRightIcon },
];

/**
 * On-screen controls for touch devices: a helm joystick on the left, the three cannons on the right. Every
 * pointer is an independent input source, so one thumb can steer while the other fires; lifting or cancelling
 * a finger releases what it held.
 */
export function TouchControls({
  input,
  reloads,
  isHidden,
}: {
  readonly input: InputState;
  readonly reloads: WeaponReloads;
  /** While paused the controls stay mounted but hidden, so the reload sweeps freeze instead of restarting. */
  readonly isHidden: boolean;
}) {
  return (
    <div className={isHidden ? 'touch-controls touch-controls--hidden' : 'touch-controls'} data-testid="touch-controls">
      <VirtualJoystick input={input} />
      <div className="touch-controls__group touch-controls__group--weapons">
        {WEAPON_BUTTONS.map((button) => (
          <TouchButton
            key={button.action}
            definition={button}
            input={input}
            reload={reloads[button.action as keyof WeaponReloads]}
          />
        ))}
      </div>
    </div>
  );
}

function TouchButton({
  definition,
  input,
  reload,
}: {
  readonly definition: TouchButtonDefinition;
  readonly input: InputState;
  readonly reload: ReloadState;
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
      {reload.volleys > 0 && (
        // A CSS sweep the length of the cooldown, restarted (new key) by every volley: no per-frame React work.
        <span
          key={reload.volleys}
          className="touch-controls__reload"
          style={{ animationDuration: `${reload.seconds}s` }}
          data-testid={`reload-${definition.action}`}
        />
      )}
    </button>
  );
}
