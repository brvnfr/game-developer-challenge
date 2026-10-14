import { browserLocalStorage, browserSessionStorage, MemoryStorage, type KeyValueStorage } from '@/storage/LocalStore';
import {
  LastResultRepository,
  PlayerProfileRepository,
  ScreenMemory,
  SettingsRepository,
} from '@/storage/repositories';

/** Local persistence used by the screens. Injected into `App` so tests can run against in-memory storage. */
export interface AppServices {
  readonly settings: SettingsRepository;
  readonly playerProfile: PlayerProfileRepository;
  readonly lastResult: LastResultRepository;
  readonly screenMemory: ScreenMemory;
}

function createServices(persistent: KeyValueStorage | null, perTab: KeyValueStorage | null): AppServices {
  return {
    settings: new SettingsRepository(persistent),
    playerProfile: new PlayerProfileRepository(persistent),
    lastResult: new LastResultRepository(persistent),
    screenMemory: new ScreenMemory(perTab),
  };
}

/** Services backed by localStorage (options, profile, last result) and sessionStorage (open screen). */
export function createBrowserServices(): AppServices {
  return createServices(browserLocalStorage(), browserSessionStorage());
}

/** Services backed by memory only, for integration tests. */
export function createMemoryServices(
  persistent: KeyValueStorage = new MemoryStorage(),
  perTab: KeyValueStorage = new MemoryStorage(),
): AppServices {
  return createServices(persistent, perTab);
}
