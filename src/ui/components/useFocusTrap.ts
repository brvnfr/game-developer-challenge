import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface FocusTrapOptions {
  /** Element focused when the trap starts; defaults to the first focusable element. */
  readonly initialFocusRef?: RefObject<HTMLElement | null> | undefined;
  /** Called when Escape is pressed inside the container. */
  readonly onEscape?: (() => void) | undefined;
}

/**
 * Keeps keyboard focus inside a modal container: focuses its main control on mount, wraps Tab and
 * Shift+Tab around its focusable elements and gives focus back to the previously focused element on unmount.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, options: FocusTrapOptions = {}): void {
  const { initialFocusRef, onEscape } = options;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableElements = () => [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
    (initialFocusRef?.current ?? focusableElements()[0] ?? container).focus();
    return () => previouslyFocused?.focus();
  }, [containerRef, initialFocusRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
      const first = elements[0];
      const last = elements.at(-1);
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, onEscape]);
}
