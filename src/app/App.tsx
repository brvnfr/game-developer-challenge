import { useMemo, useState } from 'react';
import { DEFAULT_USER_SETTINGS } from '@/game/config/defaults';
import type { MatchResult } from '@/game/sim/match/types';
import { GameScreen } from '@/screens/Game/GameScreen';
import { MainMenuScreen } from '@/screens/MainMenu/MainMenuScreen';
import { ResultScreen } from '@/screens/Result/ResultScreen';
import { readTestMode } from '@/testing/testMode';

type Screen =
  | { readonly name: 'menu' }
  | { readonly name: 'game'; readonly matchNumber: number }
  | { readonly name: 'result'; readonly result: MatchResult; readonly matchNumber: number };

/**
 * Screen flow: menu → game → result → (play again | menu). Leaving the game screen unmounts it,
 * which disposes the runtime and abandons the match without a result.
 */
export function App() {
  const testMode = useMemo(() => readTestMode(), []);
  const settings = useMemo(() => testMode.settings ?? DEFAULT_USER_SETTINGS, [testMode]);
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });
  const startMatch = (matchNumber: number) => {
    setScreen({ name: 'game', matchNumber });
  };

  switch (screen.name) {
    case 'menu':
      return <MainMenuScreen onPlay={() => startMatch(1)} />;
    case 'game':
      return (
        <GameScreen
          key={screen.matchNumber}
          settings={settings}
          testMode={testMode}
          onMatchEnded={(result) => {
            setScreen({ name: 'result', result, matchNumber: screen.matchNumber });
          }}
          onExitToMenu={() => {
            setScreen({ name: 'menu' });
          }}
        />
      );
    case 'result':
      return (
        <ResultScreen
          result={screen.result}
          onPlayAgain={() => startMatch(screen.matchNumber + 1)}
          onMainMenu={() => {
            setScreen({ name: 'menu' });
          }}
        />
      );
  }
}
