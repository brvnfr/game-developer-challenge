import title from '@assets/png/retina/ui/menu/title_pirate_battle.png';
import { ControlsHelp } from '@/ui/ControlsHelp';
import { useFocusOnMount } from '@/ui/useFocusOnMount';

/** Main menu (minimal version; Options, Ranking and Match History arrive in later milestones). */
export function MainMenuScreen({ onPlay }: { readonly onPlay: () => void }) {
  const playButtonRef = useFocusOnMount<HTMLButtonElement>();
  return (
    <main className="menu-screen">
      <div className="panel menu-panel">
        <h1 className="menu-panel__title">
          <img src={title} alt="Pirate Battle" />
        </h1>
        <p className="menu-panel__tagline">Set sail. Take command.</p>
        <button ref={playButtonRef} type="button" className="primary-button" onClick={onPlay}>
          Play
        </button>
        <ControlsHelp />
      </div>
    </main>
  );
}
