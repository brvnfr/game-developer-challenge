import { useState } from 'react';
import type { UserSettings } from '@/game/config/types';
import { Button } from '@/ui/components/Button';
import { MenuLayout } from '@/ui/components/MenuLayout';
import { tabId, tabPanelId } from '@/ui/components/tabIds';
import { Tabs } from '@/ui/components/Tabs';
import { useFocusOnMount } from '@/ui/useFocusOnMount';
import { HistoryPanel } from './HistoryPanel';
import { RankingPanel } from './RankingPanel';
import './captains-log.css';

export type LogTab = 'ranking' | 'history';

const TABS = [
  { id: 'ranking', label: 'Ranking' },
  { id: 'history', label: 'Match History' },
] as const;

const ID_PREFIX = 'captains-log';

interface CaptainsLogScreenProps {
  readonly initialTab: LogTab;
  readonly playerId: string;
  readonly playerName: string;
  readonly currentSettings: UserSettings;
  readonly highlightMatchId: string | null;
  readonly onMainMenu: () => void;
}

/**
 * Captain's Log: the Ranking and Match History tabs. Only the visible tab is mounted, so showing a tab again
 * refreshes its data (cached data stays on screen meanwhile).
 */
export function CaptainsLogScreen({
  initialTab,
  playerId,
  playerName,
  currentSettings,
  highlightMatchId,
  onMainMenu,
}: CaptainsLogScreenProps) {
  const [tab, setTab] = useState<LogTab>(initialTab);
  const titleRef = useFocusOnMount<HTMLHeadingElement>();
  return (
    <MenuLayout labelledBy="captains-log-title" className="captains-log">
      <h1 ref={titleRef} id="captains-log-title" className="panel__title" tabIndex={-1}>
        Captain&apos;s Log
      </h1>
      <Tabs label="Captain's Log sections" tabs={TABS} selectedId={tab} onSelect={setTab} idPrefix={ID_PREFIX} />
      <div
        role="tabpanel"
        id={tabPanelId(ID_PREFIX, tab)}
        aria-labelledby={tabId(ID_PREFIX, tab)}
        className="captains-log__panel"
      >
        <p className="captains-log__subtitle">
          {tab === 'ranking' ? 'Best battles with the same settings' : `${playerName} · your recent battles`}
        </p>
        {tab === 'ranking' ? (
          <RankingPanel currentSettings={currentSettings} playerId={playerId} />
        ) : (
          <HistoryPanel playerId={playerId} playerName={playerName} highlightMatchId={highlightMatchId} />
        )}
      </div>
      <Button onClick={onMainMenu}>Main Menu</Button>
    </MenuLayout>
  );
}
