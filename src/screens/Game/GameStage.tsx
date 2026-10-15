import { useEffect, useRef, useState } from 'react';
import type { AudioEngine } from '@/game/audio/AudioEngine';
import type { UserSettings } from '@/game/config/types';
import type { GameTextures } from '@/game/render/assets/GameTextures';
import type { SceneOverlays } from '@/game/render/scene/GameScene';
import { GameRuntime } from '@/game/runtime/GameRuntime';
import type { PauseReason } from '@/game/sim/events/GameEvent';
import type { MatchResult } from '@/game/sim/match/types';
import type { MatchView } from '@/game/bridge/MatchView';
import { useExternalStore } from '@/game/bridge/useExternalStore';
import { Hud } from '@/ui/hud/Hud';
import { MatchStartBanner } from '@/ui/hud/MatchStartBanner';
import { SoundToggleButton, SoundToggleIcon } from '@/ui/SoundToggle';
import { GameControls, type ControlMode, type WeaponReloads } from '@/ui/controls/GameControls';
import { runtimeOptionsFor, type TestModeOptions } from '@/testing/testMode';
import { useMediaQuery } from '@/ui/useMediaQuery';
import { PauseOverlay } from './PauseOverlay';
import { RotateDeviceNotice } from './RotateDeviceNotice';

interface GameStageProps {
  readonly textures: GameTextures;
  readonly settings: UserSettings;
  readonly testMode: TestModeOptions;
  readonly overlays: SceneOverlays;
  /** Which on-screen controls to show: touch (helm joystick) or keyboard (buttons with their keys). */
  readonly controlMode: ControlMode;
  readonly audio: AudioEngine | null;
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
  overlays,
  controlMode,
  audio,
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
      ...runtimeOptionsFor(testMode),
      textures,
      settings,
      sound: audio,
      overlays,
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
  }, [textures, settings, testMode, overlays, audio]);

  return (
    <div className="game-stage">
      <div ref={hostRef} className="game-stage__canvas" />
      {runtime && (
        <GameOverlays runtime={runtime} audio={audio} controlMode={controlMode} onExitToMenu={onExitToMenu} />
      )}
    </div>
  );
}

/** The "Battle stations!" call stays over the arena for the first two seconds of play. */
const START_BANNER_SECONDS = 2;

/** Reload indicators of the on-screen cannon buttons: volleys so far and each weapon's cooldown in this match. */
function reloadsOf(runtime: GameRuntime, match: MatchView): WeaponReloads {
  const { frontCannon, broadside } = runtime.match.config.player;
  return {
    fireFront: { volleys: match.frontVolleys, seconds: frontCannon.cooldownSeconds },
    fireLeft: { volleys: match.leftVolleys, seconds: broadside.cooldownSeconds },
    fireRight: { volleys: match.rightVolleys, seconds: broadside.cooldownSeconds },
  };
}

const PAUSE_REASON_TEXT: Readonly<Record<PauseReason, string>> = {
  manual: 'Take a breath, captain.',
  blur: 'The game paused because the window lost focus.',
  hidden: 'The game paused because the tab was hidden.',
  orientation: 'The match waited while your phone was upright. Take the helm when you are ready.',
};

function GameOverlays({
  runtime,
  audio,
  controlMode,
  onExitToMenu,
}: {
  readonly runtime: GameRuntime;
  readonly audio: AudioEngine | null;
  readonly controlMode: ControlMode;
  readonly onExitToMenu: () => void;
}) {
  const match = useExternalStore(runtime.store);
  // Touch devices play in landscape: held upright, the match pauses behind a full-screen notice.
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const mustTurn = controlMode === 'touch' && isPortrait;
  useEffect(() => {
    if (mustTurn) runtime.pause('orientation');
  }, [mustTurn, runtime]);

  if (mustTurn) return <RotateDeviceNotice onMainMenu={onExitToMenu} />;
  return (
    <>
      <Hud
        store={runtime.store}
        onPause={() => runtime.pause('manual')}
        extraControls={audio && <SoundToggleIcon engine={audio} className="hud__sound" />}
      />
      {match.status === 'running' && match.durationSeconds - match.remainingSeconds < START_BANNER_SECONDS && (
        <MatchStartBanner durationSeconds={match.durationSeconds} />
      )}
      {(match.status === 'running' || match.status === 'paused') && (
        <GameControls
          input={runtime.input}
          mode={controlMode}
          reloads={reloadsOf(runtime, match)}
          isHidden={match.status === 'paused'}
        />
      )}
      {match.status === 'paused' && (
        <PauseOverlay
          reasonText={PAUSE_REASON_TEXT[match.pauseReason ?? 'manual']}
          onResume={() => runtime.resume()}
          onRestart={() => runtime.restart()}
          onMainMenu={onExitToMenu}
          extraActions={audio && <SoundToggleButton engine={audio} />}
        />
      )}
    </>
  );
}
