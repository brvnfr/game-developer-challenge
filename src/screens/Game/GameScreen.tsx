import { useMemo } from 'react';
import type { AudioEngine } from '@/game/audio/AudioEngine';
import type { UserSettings } from '@/game/config/types';
import type { SceneOverlays } from '@/game/render/scene/GameScene';
import type { MatchResult } from '@/game/sim/match/types';
import type { TestModeOptions } from '@/testing/testMode';
import { GameStage } from './GameStage';
import { LoadingView } from './LoadingView';
import { useGameAssets } from './useGameAssets';
import './game-screen.css';

interface GameScreenProps {
  readonly settings: UserSettings;
  readonly testMode: TestModeOptions;
  /** Developer overlays chosen in Developer tools. */
  readonly overlays: SceneOverlays;
  readonly audio: AudioEngine | null;
  readonly onMatchEnded: (result: MatchResult) => void;
  readonly onExitToMenu: () => void;
}

/** Loads the assets (with progress and retry) and then starts the match. Leaving this screen abandons the match. */
export function GameScreen({ settings, testMode, overlays, audio, onMatchEnded, onExitToMenu }: GameScreenProps) {
  const { state, retry } = useGameAssets();
  const showTouchControls = useMemo(
    () => testMode.forceTouchControls || window.matchMedia('(pointer: coarse)').matches,
    [testMode],
  );

  return (
    <main className="game-screen" aria-label="Pirate Battle match">
      <h1 className="visually-hidden">Pirate Battle — match in progress</h1>
      {state.status === 'ready' ? (
        <GameStage
          textures={state.textures}
          settings={settings}
          testMode={testMode}
          overlays={overlays}
          showTouchControls={showTouchControls}
          audio={audio}
          onMatchEnded={onMatchEnded}
          onExitToMenu={onExitToMenu}
        />
      ) : (
        <LoadingView state={state} onRetry={retry} onBack={onExitToMenu} />
      )}
    </main>
  );
}
