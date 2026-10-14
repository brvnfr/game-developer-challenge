import { useSyncExternalStore } from 'react';
import type { AudioEngine } from '@/game/audio/AudioEngine';
import { Button } from './components/Button';
import { RoundIconButton } from './components/RoundIconButton';
import soundOffIcon from './icons/sound-off.svg';
import soundOnIcon from './icons/sound-on.svg';

function useIsMuted(engine: AudioEngine): boolean {
  return useSyncExternalStore(engine.subscribe, engine.getMutedSnapshot);
}

/** Round HUD toggle (pressed = sound on). The choice is saved and applies at once. */
export function SoundToggleIcon({ engine, className }: { readonly engine: AudioEngine; readonly className?: string }) {
  const isMuted = useIsMuted(engine);
  return (
    <RoundIconButton
      icon={isMuted ? soundOffIcon : soundOnIcon}
      label="Sound"
      aria-pressed={!isMuted}
      className={className}
      onClick={() => engine.setMuted(!isMuted)}
    />
  );
}

/** Text toggle for the Options screen. */
export function SoundToggleButton({
  engine,
  describedBy,
}: {
  readonly engine: AudioEngine;
  readonly describedBy?: string;
}) {
  const isMuted = useIsMuted(engine);
  return (
    <Button
      variant="small"
      aria-pressed={!isMuted}
      aria-describedby={describedBy}
      onClick={() => engine.setMuted(!isMuted)}
    >
      {isMuted ? 'Sound: off' : 'Sound: on'}
    </Button>
  );
}
