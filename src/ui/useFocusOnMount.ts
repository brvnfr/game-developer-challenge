import { useEffect, useRef } from 'react';

/**
 * Moves keyboard focus to the returned element when the component mounts. Used when a new screen or
 * dialog appears, so keyboard and screen-reader users land on its main action.
 */
export function useFocusOnMount<Element extends HTMLElement>() {
  const elementRef = useRef<Element>(null);
  useEffect(() => {
    elementRef.current?.focus();
  }, []);
  return elementRef;
}
