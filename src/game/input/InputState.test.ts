import { describe, expect, it } from 'vitest';
import { IDLE_COMMANDS } from '@/game/sim/PlayerCommands';
import { InputState } from './InputState';
import { findActionForKeyCode, KEY_BINDINGS } from './keyBindings';

describe('InputState', () => {
  it('turns held actions into commands, allowing sailing and firing together', () => {
    const input = new InputState();
    input.press('keyboard', 'sailForward');
    input.press('keyboard', 'turnRight');
    input.press('touch:1', 'fireLeft');
    expect(input.toCommands()).toEqual({
      ...IDLE_COMMANDS,
      isSailingForward: true,
      turnDirection: 1,
      isFiringLeft: true,
    });
  });

  it('cancels opposite turns', () => {
    const input = new InputState();
    input.press('keyboard', 'turnLeft');
    input.press('touch:2', 'turnRight');
    expect(input.toCommands().turnDirection).toBe(0);
    input.release('touch:2', 'turnRight');
    expect(input.toCommands().turnDirection).toBe(-1);
  });

  it('keeps an action active while any source still holds it', () => {
    const input = new InputState();
    input.press('keyboard', 'sailForward');
    input.press('touch:1', 'sailForward');
    input.release('keyboard', 'sailForward');
    expect(input.isActive('sailForward')).toBe(true);
    input.releaseSource('touch:1');
    expect(input.isActive('sailForward')).toBe(false);
  });

  it('drops everything on clear (pause and focus loss)', () => {
    const input = new InputState();
    input.press('keyboard', 'sailForward');
    input.press('keyboard', 'fireFront');
    input.clear();
    expect(input.toCommands()).toEqual(IDLE_COMMANDS);
  });
});

describe('key bindings', () => {
  it('binds every action to at least one key with a label', () => {
    for (const binding of Object.values(KEY_BINDINGS)) {
      expect(binding.keyCodes.length).toBeGreaterThan(0);
      expect(binding.keyLabels).toHaveLength(binding.keyCodes.length);
    }
  });

  it.each([
    ['KeyW', 'sailForward'],
    ['ArrowLeft', 'turnLeft'],
    ['Space', 'fireFront'],
    ['KeyQ', 'fireLeft'],
    ['KeyE', 'fireRight'],
    ['Escape', 'togglePause'],
    ['KeyZ', undefined],
  ])('maps %s to %s', (keyCode, expectedAction) => {
    expect(findActionForKeyCode(keyCode)).toBe(expectedAction);
  });
});
