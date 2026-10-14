import title from '@assets/png/retina/ui/menu/title_pirate_battle.png';
import { useState } from 'react';
import type { MatchResult } from '@/game/sim/match/types';
import { useOutbox } from '@/remote/hooks';
import { useRemoteServices } from '@/remote/remoteServicesContext';
import { Button } from '@/ui/components/Button';
import { MenuLayout } from '@/ui/components/MenuLayout';
import { ControlsHelp } from '@/ui/ControlsHelp';
import { summarizeResult } from '@/ui/matchResultText';
import { useFocusOnMount } from '@/ui/useFocusOnMount';
import { NetworkScenariosDialog } from './NetworkScenariosDialog';

interface MainMenuScreenProps {
  readonly captainName: string;
  readonly lastResult: MatchResult | null;
  readonly onPlay: () => void;
  readonly onOptions: () => void;
  readonly onRanking: () => void;
  readonly onMatchHistory: () => void;
}

/** Main menu: Play, Options, the Captain's Log tabs, the last battle and the control instructions. */
export function MainMenuScreen({
  captainName,
  lastResult,
  onPlay,
  onOptions,
  onRanking,
  onMatchHistory,
}: MainMenuScreenProps) {
  const playButtonRef = useFocusOnMount<HTMLButtonElement>();
  const { mockServer } = useRemoteServices();
  const pendingCount = useOutbox().pending.length;
  const [isNetworkDialogOpen, setNetworkDialogOpen] = useState(false);
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
      {pendingCount > 0 && (
        <p className="menu-panel__pending" data-testid="pending-count">
          {pendingCount === 1 ? '1 battle is' : `${pendingCount} battles are`} waiting to be saved.
        </p>
      )}
      <div className="menu-panel__log-actions">
        <Button variant="small" onClick={onRanking}>
          Ranking
        </Button>
        <Button variant="small" onClick={onMatchHistory}>
          Match History
        </Button>
      </div>
      {mockServer && (
        <button type="button" className="link-button" onClick={() => setNetworkDialogOpen(true)}>
          Network scenarios
        </button>
      )}
      {mockServer && isNetworkDialogOpen && (
        <NetworkScenariosDialog mockServer={mockServer} onClose={() => setNetworkDialogOpen(false)} />
      )}
    </MenuLayout>
  );
}
