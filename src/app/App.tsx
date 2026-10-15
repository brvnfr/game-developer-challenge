import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AudioEngine } from '@/game/audio/AudioEngine';
import type { UserSettings } from '@/game/config/types';
import type { SceneOverlays } from '@/game/render/scene/GameScene';
import type { MatchResult } from '@/game/sim/match/types';
import { RemoteServicesProvider } from '@/remote/RemoteServicesProvider';
import { toRegisterRequest } from '@/remote/toRegisterRequest';
import { CaptainsLogScreen, type LogTab } from '@/screens/CaptainsLog/CaptainsLogScreen';
import { GameScreen } from '@/screens/Game/GameScreen';
import { MainMenuScreen } from '@/screens/MainMenu/MainMenuScreen';
import { PlayerNameDialog } from '@/screens/MainMenu/PlayerNameDialog';
import { OptionsScreen, type OptionsSaveOutcome } from '@/screens/Options/OptionsScreen';
import { ResultScreen } from '@/screens/Result/ResultScreen';
import type { DeveloperToolsSettings, PlayerProfile } from '@/storage/repositories';
import { readTestMode } from '@/testing/testMode';
import type { AppServices } from './AppServices';

type Screen =
  | { readonly name: 'menu' }
  | { readonly name: 'options' }
  | { readonly name: 'log'; readonly tab: LogTab }
  | { readonly name: 'game'; readonly matchNumber: number }
  | { readonly name: 'result'; readonly result: MatchResult; readonly matchNumber: number };

/** A soft click for every button in the menus and dialogs (not for the touch controls, which repeat). */
function useButtonClickSound(audio: AudioEngine): void {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button') : null;
      if (target && !target.closest('[data-testid="game-controls"]')) audio.play('ui_click', { volume: 0.5 });
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [audio]);
}

/** The result screen comes back after a refresh; any other screen restarts at the menu (a match is abandoned). */
function initialScreen(services: AppServices): Screen {
  const lastResult = services.lastResult.load();
  if (services.screenMemory.isResultOpen() && lastResult) return { name: 'result', result: lastResult, matchNumber: 0 };
  services.screenMemory.forget();
  return { name: 'menu' };
}

/**
 * Screen flow: menu ⇄ options, menu ⇄ Captain's Log, menu → game → result → (play again | menu). Leaving the
 * game screen unmounts it, which disposes the runtime and abandons the match without a result.
 */
export function App({ services }: { readonly services: AppServices }) {
  useButtonClickSound(services.audio);
  return (
    <RemoteServicesProvider services={services.remote}>
      <Screens services={services} />
    </RemoteServicesProvider>
  );
}

function Screens({ services }: { readonly services: AppServices }) {
  const testMode = useMemo(() => readTestMode(), []);
  const [settings, setSettings] = useState<UserSettings>(() => services.settings.load());
  const [profile, setProfile] = useState<PlayerProfile>(() => services.playerProfile.load());
  const [lastResult, setLastResult] = useState<MatchResult | null>(() => services.lastResult.load());
  const [screen, setScreen] = useState<Screen>(() => initialScreen(services));
  const [isNamePromptOpen, setNamePromptOpen] = useState(false);
  const [developerTools, setDeveloperTools] = useState<DeveloperToolsSettings>(() => services.developerTools.load());
  const changeDeveloperTools = useCallback(
    (next: DeveloperToolsSettings) => {
      services.developerTools.save(next);
      setDeveloperTools(next);
    },
    [services],
  );
  const overlays = useMemo<SceneOverlays>(
    () => ({ aimLanes: developerTools.showAimLanes, hitboxes: developerTools.showHitboxes }),
    [developerTools.showAimLanes, developerTools.showHitboxes],
  );
  // Test mode may pin the settings through the URL; otherwise each match snapshots the saved options.
  const matchSettings = testMode.settings ?? settings;

  const showMenu = () => {
    services.screenMemory.forget();
    setScreen({ name: 'menu' });
  };
  const startMatch = (matchNumber: number) => {
    services.screenMemory.forget();
    setScreen({ name: 'game', matchNumber });
  };
  const finishMatch = (result: MatchResult, matchNumber: number) => {
    // Queued for the Captain's Log in the background; nothing waits for the server.
    services.remote.registrar.register(toRegisterRequest(result, profile));
    services.lastResult.save(result);
    services.screenMemory.rememberResultOpen();
    setLastResult(result);
    setScreen({ name: 'result', result, matchNumber });
  };
  const renameCaptain = (name: string) => {
    const outcome = services.playerProfile.rename(name);
    if ('error' in outcome) return { error: outcome.error };
    setProfile(outcome.profile);
    return { profile: outcome.profile };
  };
  const saveOptions = (newSettings: UserSettings, captainName: string): OptionsSaveOutcome => {
    const isSettingsPersisted = services.settings.save(newSettings);
    setSettings(newSettings);
    const renamed = renameCaptain(captainName);
    return isSettingsPersisted && !('error' in renamed) ? 'saved' : 'notPersisted';
  };

  switch (screen.name) {
    case 'menu':
      return (
        <>
          <MainMenuScreen
            captainName={profile.name}
            lastResult={lastResult}
            onPlay={() => {
              if (profile.hasChosenName) startMatch(1);
              else setNamePromptOpen(true);
            }}
            onOptions={() => setScreen({ name: 'options' })}
            onRanking={() => setScreen({ name: 'log', tab: 'ranking' })}
            onMatchHistory={() => setScreen({ name: 'log', tab: 'history' })}
            developerTools={developerTools}
            onDeveloperToolsChange={changeDeveloperTools}
          />
          {isNamePromptOpen && (
            <PlayerNameDialog
              suggestedName={profile.name}
              onConfirm={(name) => {
                const renamed = renameCaptain(name);
                if ('error' in renamed) return renamed.error;
                setNamePromptOpen(false);
                startMatch(1);
                return undefined;
              }}
              onCancel={() => setNamePromptOpen(false)}
            />
          )}
        </>
      );
    case 'options':
      return (
        <OptionsScreen
          audio={services.audio}
          savedSettings={settings}
          savedCaptainName={profile.name}
          onSave={saveOptions}
          onMainMenu={showMenu}
        />
      );
    case 'log':
      return (
        <CaptainsLogScreen
          initialTab={screen.tab}
          playerId={profile.playerId}
          playerName={profile.name}
          currentSettings={matchSettings}
          highlightMatchId={lastResult?.matchId ?? null}
          onMainMenu={showMenu}
        />
      );
    case 'game':
      return (
        <GameScreen
          key={screen.matchNumber}
          settings={matchSettings}
          testMode={testMode}
          overlays={overlays}
          audio={services.audio}
          onMatchEnded={(result) => finishMatch(result, screen.matchNumber)}
          onExitToMenu={showMenu}
        />
      );
    case 'result':
      return (
        <ResultScreen
          result={screen.result}
          onPlayAgain={() => startMatch(screen.matchNumber + 1)}
          onMainMenu={showMenu}
        />
      );
  }
}
