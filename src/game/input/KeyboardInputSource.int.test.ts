import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputState } from './InputState';
import { KeyboardInputSource } from './KeyboardInputSource';

function dispatchKey(type: 'keydown' | 'keyup', code: string, options: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...options });
  window.dispatchEvent(event);
  return event;
}

describe('KeyboardInputSource', () => {
  let keyboard: KeyboardInputSource | null = null;
  afterEach(() => keyboard?.detach());

  function createKeyboard(onTogglePause = vi.fn()) {
    const input = new InputState();
    keyboard = new KeyboardInputSource(window, input, onTogglePause);
    return { input, keyboard, onTogglePause };
  }

  it('captures bound keys only while attached', () => {
    const { input, keyboard: source } = createKeyboard();
    const beforeAttach = dispatchKey('keydown', 'KeyW');
    expect(input.isActive('sailForward')).toBe(false);
    expect(beforeAttach.defaultPrevented).toBe(false);

    source.attach();
    const whileAttached = dispatchKey('keydown', 'KeyW');
    expect(input.isActive('sailForward')).toBe(true);
    expect(whileAttached.defaultPrevented).toBe(true);
    dispatchKey('keyup', 'KeyW');
    expect(input.isActive('sailForward')).toBe(false);

    source.detach();
    dispatchKey('keydown', 'Space');
    expect(input.isActive('fireFront')).toBe(false);
  });

  it('leaves unbound keys alone and ignores typing in form fields', () => {
    const { input, keyboard: source } = createKeyboard();
    source.attach();
    expect(dispatchKey('keydown', 'Tab').defaultPrevented).toBe(false);
    const field = document.createElement('input');
    document.body.append(field);
    field.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true, cancelable: true }));
    expect(input.isActive('sailForward')).toBe(false);
    field.remove();
  });

  it('toggles pause once per key press and ignores actions while not accepting them', () => {
    const { input, keyboard: source, onTogglePause } = createKeyboard();
    source.attach();
    dispatchKey('keydown', 'Escape');
    dispatchKey('keydown', 'Escape', { repeat: true });
    expect(onTogglePause).toHaveBeenCalledTimes(1);
    source.isAcceptingActions = false;
    dispatchKey('keydown', 'KeyW');
    expect(input.isActive('sailForward')).toBe(false);
  });

  it('releases its keys when detached', () => {
    const { input, keyboard: source } = createKeyboard();
    source.attach();
    dispatchKey('keydown', 'KeyD');
    source.detach();
    expect(input.isActive('turnRight')).toBe(false);
  });
});
