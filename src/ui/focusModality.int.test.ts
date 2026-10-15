import { describe, expect, it } from 'vitest';
import { trackFocusModality } from './focusModality';

function press(target: EventTarget, key: string) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

describe('focus modality', () => {
  it('shows the ring for Tab and for arrows inside widgets, never for game keys or after a pointer press', () => {
    const root = document.documentElement;
    const stop = trackFocusModality(root, window);
    expect(root.getAttribute('data-focus-ring')).toBe('hidden');

    for (const key of ['w', ' ', 'ArrowLeft', 'q']) press(document.body, key);
    expect(root.getAttribute('data-focus-ring')).toBe('hidden');

    const tabs = document.createElement('div');
    tabs.setAttribute('role', 'tablist');
    const tab = document.createElement('button');
    tabs.append(tab);
    document.body.append(tabs);
    press(tab, 'ArrowRight');
    expect(root.getAttribute('data-focus-ring')).toBe('visible');

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(root.getAttribute('data-focus-ring')).toBe('hidden');
    press(document.body, 'Tab');
    expect(root.getAttribute('data-focus-ring')).toBe('visible');

    stop();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(root.getAttribute('data-focus-ring')).toBe('visible');
    tabs.remove();
  });
});
