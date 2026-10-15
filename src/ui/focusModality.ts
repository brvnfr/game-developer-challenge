/** Keys that only move focus, wherever they are pressed. */
const FOCUS_KEYS = new Set(['Tab']);
/** Keys that move focus inside composite widgets (tabs, radio groups, form fields) but steer the ship in a match. */
const WIDGET_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);
const WIDGET_SELECTOR = '[role="tablist"], [role="radiogroup"], input, select, textarea';

export type FocusRing = 'visible' | 'hidden';

/**
 * Shows the focus ring only to people navigating with the keyboard. Focus still moves for everyone (dialogs
 * and screens focus their main action, for screen readers), but the ring appears only after Tab or after arrow
 * keys inside a widget, and disappears again on a mouse or touch press. Game keys (W, Space, arrows on the
 * canvas…) never show it. The state lives on the root's `data-focus-ring` attribute, read by `global.css`.
 */
export function trackFocusModality(
  root: HTMLElement,
  events: Pick<Window, 'addEventListener' | 'removeEventListener'>,
) {
  const show = (ring: FocusRing) => {
    if (root.getAttribute('data-focus-ring') !== ring) root.setAttribute('data-focus-ring', ring);
  };
  const handleKey = (event: KeyboardEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    if (FOCUS_KEYS.has(event.key) || (WIDGET_KEYS.has(event.key) && target?.closest(WIDGET_SELECTOR))) {
      show('visible');
    }
  };
  const handlePointer = () => show('hidden');
  show('hidden');
  events.addEventListener('keydown', handleKey, true);
  events.addEventListener('pointerdown', handlePointer, true);
  return () => {
    events.removeEventListener('keydown', handleKey, true);
    events.removeEventListener('pointerdown', handlePointer, true);
  };
}
