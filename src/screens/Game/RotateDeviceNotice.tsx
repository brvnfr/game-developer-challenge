import { Button } from '@/ui/components/Button';
import { useFocusOnMount } from '@/ui/useFocusOnMount';
import './rotate-device.css';

/**
 * Full-screen notice for touch devices held upright: the arena is played in landscape and the match stays
 * paused (resuming after turning the phone back needs a tap on Resume). It covers the HUD and controls so the
 * screen shows only what to do; the only control, Main Menu, receives focus.
 */
export function RotateDeviceNotice({ onMainMenu }: { readonly onMainMenu: () => void }) {
  const mainMenuRef = useFocusOnMount<HTMLButtonElement>();
  return (
    <div
      className="rotate-device"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rotate-device-title"
      aria-describedby="rotate-device-text"
      data-testid="rotate-device"
    >
      <svg className="rotate-device__phone" viewBox="0 0 120 120" aria-hidden="true">
        {/* A phone that keeps turning sideways, with the sea and a ship on its screen. */}
        <g className="rotate-device__turn">
          <rect x="38" y="14" width="44" height="92" rx="9" className="rotate-device__body" />
          <rect x="43" y="24" width="34" height="70" rx="3" className="rotate-device__screen" />
          <path d="M47 68 h26 l-5 8 h-16 z" className="rotate-device__ship" />
          <path d="M60 42 v26" className="rotate-device__mast" />
          <path d="M62 45 l12 18 h-12 z" className="rotate-device__ship" />
          <circle cx="60" cy="100" r="2.6" className="rotate-device__dot" />
        </g>
        <path d="M24 34 a44 44 0 0 1 28 -24" className="rotate-device__arrow" />
        <path d="M46 4 l7 6 -9 3" className="rotate-device__arrow" />
      </svg>
      <p className="rotate-device__kicker" aria-hidden="true">
        Hard to starboard!
      </p>
      <h2 id="rotate-device-title" className="rotate-device__title">
        Turn your phone sideways
      </h2>
      <p id="rotate-device-text" className="rotate-device__text">
        Pirate Battle sails in landscape. Your match is paused and will wait for you.
      </p>
      <Button ref={mainMenuRef} variant="small" onClick={onMainMenu}>
        Main Menu
      </Button>
    </div>
  );
}
