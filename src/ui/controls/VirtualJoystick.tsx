import { useRef, type PointerEvent } from 'react';
import forwardIcon from '@assets/png/retina/ui/controls/icon_forward.png';
import type { InputState } from '@/game/input/InputState';

/** Inside this fraction of the travel the ship coasts (no throttle, no steering): resting a thumb is safe. */
const DEAD_ZONE = 0.18;

/**
 * Helm for touch screens: push the knob the way the ship should sail. The direction is a heading in the world
 * (the arena is never rotated, so screen and world directions match) and the distance from the centre is the
 * throttle; the rules turn the ship towards it with the normal rudder limits. The knob follows the finger by
 * moving its element directly, so dragging never re-renders React.
 */
export function VirtualJoystick({ input }: { readonly input: InputState }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const sourceId = (event: PointerEvent) => `joystick:${event.pointerId}`;

  const moveKnob = (x: number, y: number, angle: number | null) => {
    const knob = knobRef.current;
    if (!knob) return;
    knob.style.transform = `translate(${x}px, ${y}px)`;
    knob.style.setProperty('--knob-angle', angle === null ? '0rad' : `${angle + Math.PI / 2}rad`);
    knob.setAttribute('data-active', angle === null ? 'false' : 'true');
  };

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const base = baseRef.current;
    if (!base) return;
    const bounds = base.getBoundingClientRect();
    const travel = bounds.width * 0.32;
    let deltaX = event.clientX - (bounds.left + bounds.width / 2);
    let deltaY = event.clientY - (bounds.top + bounds.height / 2);
    const distance = Math.hypot(deltaX, deltaY);
    if (distance > travel) {
      deltaX *= travel / distance;
      deltaY *= travel / distance;
    }
    const reach = Math.min(1, distance / travel);
    const heading = Math.atan2(deltaY, deltaX);
    if (reach <= DEAD_ZONE) {
      input.stopSteering(sourceId(event));
      moveKnob(deltaX, deltaY, null);
      return;
    }
    input.steer(sourceId(event), { heading, throttle: (reach - DEAD_ZONE) / (1 - DEAD_ZONE) });
    moveKnob(deltaX, deltaY, heading);
  };

  const start = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers cannot be captured; steering still follows them while they stay on the pad.
    }
    track(event);
  };

  const stop = (event: PointerEvent<HTMLDivElement>) => {
    input.stopSteering(sourceId(event));
    moveKnob(0, 0, null);
  };

  return (
    <div
      ref={baseRef}
      className="joystick"
      data-testid="control-joystick"
      aria-hidden="true"
      onPointerDown={start}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId) || event.buttons > 0) track(event);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      <div className="joystick__ring" />
      <div ref={knobRef} className="joystick__knob" data-active="false">
        <img src={forwardIcon} alt="" draggable={false} />
      </div>
    </div>
  );
}
