import type { LoopSoundId, SoundId } from './soundCatalog';

/** What the sound director needs from an audio backend (Web Audio in the app, a recorder in tests). */
export interface SoundOutput {
  play(id: SoundId, options?: { readonly volume?: number; readonly playbackRate?: number }): void;
  setLoop(id: LoopSoundId, isPlaying: boolean, volume?: number): void;
  stopAllLoops(): void;
}
