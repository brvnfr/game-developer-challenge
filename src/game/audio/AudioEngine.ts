import { z } from 'zod';
import { Listeners } from '@/shared/Listeners';
import { LocalStore, type KeyValueStorage } from '@/storage/LocalStore';
import type { PlayOptions, SoundOutput } from './SoundOutput';
import { SOUND_IDS, soundFileName, type LoopSoundId, type SoundId } from './soundCatalog';

export const AUDIO_SETTINGS_KEY = 'pirate-battle.audio.v1';
const PLAY_LOG_LIMIT = 100;

export interface AudioEngineOptions {
  /** Base URL of the app (import.meta.env.BASE_URL); sounds are under `${baseUrl}assets/audio/`. */
  readonly baseUrl: string;
  readonly storage: KeyValueStorage | null;
  /** Null where Web Audio is unavailable (the game then simply stays silent). */
  readonly createContext?: (() => AudioContext) | null;
  readonly fetchFile?: (url: string) => Promise<ArrayBuffer>;
}

/** One sound playing: its source and the gain node that sets its volume. */
interface Voice {
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
}

const settingsSchema = z.object({ isMuted: z.boolean() });

const defaultCreateContext = typeof AudioContext === 'undefined' ? null : () => new AudioContext();
const defaultFetchFile = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.arrayBuffer();
};

/**
 * Plays the game's sounds with Web Audio. Browsers only allow audio after a user gesture, so the AudioContext
 * is created on the first pointer or key press (`attachUnlockListeners`) and the sounds are loaded then, in the
 * background. Audio is optional: missing files or an unavailable Web Audio never affect the game.
 * The mute choice is persisted. The engine lives as long as the page; matches only start and stop loops.
 */
export class AudioEngine implements SoundOutput {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buffers = new Map<SoundId, AudioBuffer>();
  private readonly loops = new Map<LoopSoundId, Voice>();
  private readonly store: LocalStore<{ isMuted: boolean }>;
  private readonly listeners = new Listeners();
  private readonly log: SoundId[] = [];
  private muted: boolean;
  private loading: Promise<void> | null = null;

  constructor(private readonly options: AudioEngineOptions) {
    this.store = new LocalStore(AUDIO_SETTINGS_KEY, settingsSchema, options.storage);
    this.muted = this.store.read()?.isMuted ?? false;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get isUnlocked(): boolean {
    return this.context !== null;
  }

  get loadedSoundCount(): number {
    return this.buffers.size;
  }

  /** Sounds actually played, most recent last (observed by tests). */
  get playLog(): readonly SoundId[] {
    return this.log;
  }

  /** For useSyncExternalStore (the mute choice). */
  readonly subscribe = this.listeners.subscribe;

  readonly getMutedSnapshot = (): boolean => this.muted;

  setMuted(isMuted: boolean): void {
    if (isMuted === this.muted) return;
    this.muted = isMuted;
    this.store.write({ isMuted });
    if (isMuted) this.stopAllLoops();
    this.listeners.notify();
  }

  /** Unlocks audio on the first gesture. Returns a function that removes the listeners. */
  attachUnlockListeners(target: Pick<Window, 'addEventListener' | 'removeEventListener'>): () => void {
    const unlock = () => {
      this.unlock();
      detach();
    };
    const detach = () => {
      target.removeEventListener('pointerdown', unlock);
      target.removeEventListener('keydown', unlock);
    };
    target.addEventListener('pointerdown', unlock);
    target.addEventListener('keydown', unlock);
    return detach;
  }

  /** Creates (or resumes) the AudioContext and starts loading the sounds. Safe to call many times. */
  unlock(): void {
    const createContext = this.options.createContext === undefined ? defaultCreateContext : this.options.createContext;
    if (!createContext) return;
    if (!this.context) {
      try {
        this.context = createContext();
      } catch {
        return;
      }
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
    this.loading ??= this.loadAll();
  }

  /** Waits until every sound that could be loaded is ready (tests and tooling). */
  async whenLoaded(): Promise<void> {
    await this.loading;
  }

  play(id: SoundId, { volume = 1, playbackRate = 1 }: PlayOptions = {}): void {
    if (this.muted) return;
    const voice = this.startVoice(id, volume, { playbackRate });
    if (!voice) return;
    voice.source.addEventListener('ended', () => voice.gain.disconnect(), { once: true });
    this.record(id);
  }

  /** Starts or stops a looping sound; calling it every frame with the same value does nothing. */
  setLoop(id: LoopSoundId, isPlaying: boolean, volume = 1): void {
    const active = this.loops.get(id);
    if (!isPlaying || this.muted) {
      if (active) this.stopLoop(id, active);
      return;
    }
    if (active) {
      active.gain.gain.value = volume;
      return;
    }
    const voice = this.startVoice(id, volume, { isLooping: true });
    if (!voice) return;
    this.loops.set(id, voice);
    this.record(id);
  }

  stopAllLoops(): void {
    for (const [id, loop] of this.loops) this.stopLoop(id, loop);
  }

  isLoopPlaying(id: LoopSoundId): boolean {
    return this.loops.has(id);
  }

  /** Starts a loaded sound through its own gain node; null before the sound (or the audio) is ready. */
  private startVoice(
    id: SoundId,
    volume: number,
    { playbackRate = 1, isLooping = false }: { readonly playbackRate?: number; readonly isLooping?: boolean },
  ): Voice | null {
    const buffer = this.buffers.get(id);
    if (!buffer || !this.context || !this.master) return null;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = isLooping;
    source.playbackRate.value = playbackRate;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(this.master);
    source.start();
    return { source, gain };
  }

  private stopLoop(id: LoopSoundId, loop: Voice): void {
    try {
      loop.source.stop();
    } catch {
      // Already stopped.
    }
    loop.gain.disconnect();
    this.loops.delete(id);
  }

  private async loadAll(): Promise<void> {
    const fetchFile = this.options.fetchFile ?? defaultFetchFile;
    await Promise.all(
      SOUND_IDS.map(async (id) => {
        try {
          const data = await fetchFile(`${this.options.baseUrl}assets/audio/${soundFileName(id)}`);
          const context = this.context;
          if (!context) return;
          this.buffers.set(id, await context.decodeAudioData(data));
        } catch {
          // A missing or undecodable sound is skipped; the game stays playable.
        }
      }),
    );
  }

  private record(id: SoundId): void {
    this.log.push(id);
    if (this.log.length > PLAY_LOG_LIMIT) this.log.shift();
  }
}
