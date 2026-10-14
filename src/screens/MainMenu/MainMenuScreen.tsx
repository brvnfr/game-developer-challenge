import title from '@assets/png/retina/ui/menu/title_pirate_battle.png';
import type { MatchResult } from '@/game/sim/match/types';
import { Button } from '@/ui/components/Button';
import { MenuLayout } from '@/ui/components/MenuLayout';
import { ControlsHelp } from '@/ui/ControlsHelp';
import { summarizeResult } from '@/ui/matchResultText';
import { useFocusOnMount } from '@/ui/useFocusOnMount';

interface MainMenuScreenProps {
  readonly captainName: string;
  readonly lastResult: MatchResult | null;
  readonly onPlay: () => void;
  readonly onOptions: () => void;
}

/** Main menu: Play, Options, the captain's last battle and the control instructions. */
export function MainMenuScreen({ captainName, lastResult, onPlay, onOptions }: MainMenuScreenProps) {
  const playButtonRef = useFocusOnMount<HTMLButtonElement>();
  return (
    <MenuLayout
      labelledBy="main-menu-title"
      aside={
        <aside className="panel menu-aside" aria-label="How to play">
          <ControlsHelp />
        </aside>
      }
    >
      <h1 id="main-menu-title" className="menu-panel__title">
        <img src={title} alt="Pirate Battle" />
      </h1>
      <p className="menu-panel__tagline">Set sail. Take command.</p>
      <p className="menu-panel__captain">
        Sailing as <strong data-testid="captain-name">{captainName}</strong>
      </p>
      <div className="menu-panel__actions">
        <Button ref={playButtonRef} onClick={onPlay}>
          Play
        </Button>
        <Button onClick={onOptions}>Options</Button>
      </div>
      <p className="menu-panel__motto">Navigate the islands. Survive the battle.</p>
      {lastResult && (
        <p className="last-battle" data-testid="last-battle">
          Last battle: <strong>{summarizeResult(lastResult)}</strong>
        </p>
      )}
    </MenuLayout>
  );
}
