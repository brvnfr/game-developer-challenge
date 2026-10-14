import { AudioEngine } from '@/game/audio/AudioEngine';
import type { RemoteServices } from '@/remote/RemoteServices';
import { browserLocalStorage, browserSessionStorage, MemoryStorage, type KeyValueStorage } from '@/storage/LocalStore';
import {
  LastResultRepository,
  PlayerProfileRepository,
  ScreenMemory,
  SettingsRepository,
} from '@/storage/repositories';

/**
 * Services used by the screens: local persistence plus the ranking/history API. Injected into `App` so tests can
 * run against in-memory storage and the Node mock server.
 */
export interface AppServices {
  readonly settings: SettingsRepository;
  readonly playerProfile: PlayerProfileRepository;
  readonly lastResult: LastResultRepository;
  readonly screenMemory: ScreenMemory;
  readonly remote: RemoteServices;
  /** Sound effects and music; silent until the first user gesture. */
  readonly audio: AudioEngine;
}

function createServices(
  persistent: KeyValueStorage | null,
  perTab: KeyValueStorage | null,
  remote: RemoteServices,
  audio: AudioEngine,
): AppServices {
  return {
    audio,
    settings: new SettingsRepository(persistent),
    playerProfile: new PlayerProfileRepository(persistent),
    lastResult: new LastResultRepository(persistent),
    screenMemory: new ScreenMemory(perTab),
    remote,
  };
}

/** Services backed by localStorage (options, profile, last result) and sessionStorage (open screen). */
export function createBrowserServices(remote: RemoteServices, audio: AudioEngine): AppServices {
  return createServices(browserLocalStorage(), browserSessionStorage(), remote, audio);
}

/** Services backed by memory only, for integration tests. */
export function createMemoryServices(
  remote: RemoteServices,
  persistent: KeyValueStorage = new MemoryStorage(),
  perTab: KeyValueStorage = new MemoryStorage(),
): AppServices {
  return createServices(
    persistent,
    perTab,
    remote,
    new AudioEngine({ baseUrl: '/', storage: persistent, createContext: null }),
  );
}
