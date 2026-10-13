import type { InputState } from './InputState';
import { findActionForKeyCode } from './keyBindings';

type KeyboardEventTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

const KEYBOARD_SOURCE_ID = 'keyboard';
const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || EDITABLE_TAGS.has(target.tagName);
}

/**
 * Feeds keyboard input into an InputState. Listeners exist only while attached (a match is on screen),
 * so game keys are never captured in menus or forms, and `preventDefault` applies only to bound keys.
 */
export class KeyboardInputSource {
  /** While false (match paused), only the pause command is handled. */
  isAcceptingActions = true;
  private attached = false;

  constructor(
    private readonly target: KeyboardEventTarget,
    private readonly input: InputState,
    private readonly onTogglePause: () => void,
  ) {}

  get isAttached(): boolean {
    return this.attached;
  }

  attach(): void {
    if (this.attached) return;
    this.target.addEventListener('keydown', this.handleKeyDown);
    this.target.addEventListener('keyup', this.handleKeyUp);
    this.attached = true;
  }

  detach(): void {
    if (!this.attached) return;
    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.target.removeEventListener('keyup', this.handleKeyUp);
    this.input.releaseSource(KEYBOARD_SOURCE_ID);
    this.attached = false;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (isEditableElement(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    const action = findActionForKeyCode(event.code);
    if (!action) return;
    event.preventDefault();
    if (action === 'togglePause') {
      if (!event.repeat) this.onTogglePause();
      return;
    }
    if (this.isAcceptingActions) this.input.press(KEYBOARD_SOURCE_ID, action);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const action = findActionForKeyCode(event.code);
    if (action && action !== 'togglePause') this.input.release(KEYBOARD_SOURCE_ID, action);
  };
}
