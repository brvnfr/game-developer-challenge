import { useEffect, useRef, useState } from 'react';
import type { UserSettings } from '@/game/config/types';
import type { GameTextures } from '@/game/render/assets/GameTextures';
import { GameRuntime } from '@/game/runtime/GameRuntime';
import type { MatchResult } from '@/game/sim/match/types';
import { useExternalStore } from '@/game/bridge/useExternalStore';
import { Hud } from '@/ui/hud/Hud';
import { TouchControls } from '@/ui/touch/TouchControls';
import type { TestModeOptions } from '@/testing/testMode';
import { useMediaQuery } from '@/ui/useMediaQuery';
import { PauseOverlay } from './PauseOverlay';
import { RotateDeviceNotice } from './RotateDeviceNotice';

interface GameStageProps {
  readonly textures: GameTextures;
  readonly settings: UserSettings;
  readonly testMode: TestModeOptions;
  readonly showTouchControls: boolean;
  readonly onMatchEnded: (result: MatchResult) => void;
  readonly onExitToMenu: () => void;
}

/**
 * Hosts the PixiJS canvas and the React overlays of a match. The runtime is created in an effect and
 * disposed in its cleanup, so Strict Mode's mount → unmount → mount leaves exactly one live runtime.
 */
export function GameStage({
  textures,
  settings,
  testMode,
  showTouchControls,
  onMatchEnded,
  onExitToMenu,
}: GameStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [runtime, setRuntime] = useState<GameRuntime | null>(null);
  const onMatchEndedRef = useRef(onMatchEnded);
  useEffect(() => {
    onMatchEndedRef.current = onMatchEnded;
  }, [onMatchEnded]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const gameRuntime = new GameRuntime({
      textures,
      settings,
      ...(testMode.seed === undefined ? {} : { seed: testMode.seed }),
      timeSource: testMode.manualTime ? 'manual' : 'realTime',
      onMatchEnded: (result) => onMatchEndedRef.current(result),
    });
    let isMounted = true;
    gameRuntime
      .mount(host)
      .then(() => {
        if (isMounted) setRuntime(gameRuntime);
      })
      .catch((error: unknown) => {
        console.error('The game could not start', error);
      });
    return () => {
      isMounted = false;
      setRuntime(null);
      gameRuntime.dispose();
    };
  }, [textures, settings, testMode]);

  return (
    <div className="game-stage">
      <div ref={hostRef} className="game-stage__canvas" />
      {runtime && <GameOverlays runtime={runtime} showTouchControls={showTouchControls} onExitToMenu={onExitToMenu} />}
    </div>
  );
}

const PAUSE_REASON_TEXT: Record<string, string> = {
  manual: 'Take a breath, captain.',
  blur: 'The game paused because the window lost focus.',
  hidden: 'The game paused because the tab was hidden.',
  orientation: 'The game paused while your device was in portrait.',
};

function GameOverlays({
  runtime,
  showTouchControls,
  onExitToMenu,
}: {
  readonly runtime: GameRuntime;
  readonly showTouchControls: boolean;
  readonly onExitToMenu: () => void;
}) {
  const match = useExternalStore(runtime.store);
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const mustRotate = showTouchControls && isPortrait;
  useEffect(() => {
    if (mustRotate) runtime.pause('orientation');
  }, [mustRotate, runtime]);

  if (mustRotate) return <RotateDeviceNotice onMainMenu={onExitToMenu} />;
  return (
    <>
      <Hud store={runtime.store} onPause={() => runtime.pause('manual')} />
      {showTouchControls && match.status === 'running' && <TouchControls input={runtime.input} />}
      {match.status === 'paused' && (
        <PauseOverlay
          reasonText={PAUSE_REASON_TEXT[match.pauseReason ?? 'manual'] ?? ''}
          onResume={() => runtime.resume()}
          onRestart={() => runtime.restart()}
          onMainMenu={onExitToMenu}
        />
      )}
    </>
  );
}
