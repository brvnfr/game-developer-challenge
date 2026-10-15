import { z } from 'zod';
import { DEFAULT_USER_SETTINGS } from '@/game/config/defaults';
import { validateSettings } from '@/game/config/settingsValidation';
import type { UserSettings } from '@/game/config/types';
import type { MatchResult } from '@/game/sim/match/types';
import { suggestPlayerName, validatePlayerName } from '@/profile/playerName';
import { browserSessionStorage, LocalStore, type KeyValueStorage } from './LocalStore';

const STORAGE_PREFIX = 'pirate-battle';

const settingsSchema = z.object({ sessionTimeSeconds: z.number(), spawnIntervalSeconds: z.number() });

/** Options chosen by the player (Game session time, Enemy spawn time). */
export class SettingsRepository {
  private readonly store: LocalStore<UserSettings>;

  constructor(storage?: KeyValueStorage | null) {
    this.store = new LocalStore(`${STORAGE_PREFIX}.settings.v1`, settingsSchema, storage);
  }

  /** Saved settings, or the defaults when nothing valid is stored. */
  load(): UserSettings {
    const saved = this.store.read();
    if (!saved) return DEFAULT_USER_SETTINGS;
    const validation = validateSettings(saved);
    return validation.isValid ? validation.settings : DEFAULT_USER_SETTINGS;
  }

  save(settings: UserSettings): boolean {
    return this.store.write(settings);
  }
}

export interface PlayerProfile {
  readonly playerId: string;
  readonly name: string;
  /** False until the player confirms a name (asked on the first Play). */
  readonly hasChosenName: boolean;
}

const profileSchema = z.object({ playerId: z.string().min(1), name: z.string(), hasChosenName: z.boolean() });

/** Local identity of the player: a generated id plus the captain name shown in the ranking. */
export class PlayerProfileRepository {
  private readonly store: LocalStore<PlayerProfile>;

  constructor(
    storage?: KeyValueStorage | null,
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {
    this.store = new LocalStore(`${STORAGE_PREFIX}.player.v1`, profileSchema, storage);
  }

  /** Loads the profile, creating and saving a new one on first use. */
  load(): PlayerProfile {
    const saved = this.store.read();
    if (saved && validatePlayerName(saved.name).isValid) return saved;
    const created: PlayerProfile = {
      playerId: saved?.playerId ?? this.createId(),
      name: suggestPlayerName(),
      hasChosenName: false,
    };
    this.store.write(created);
    return created;
  }

  /** Validates and saves a new captain name. Returns the updated profile, or the validation error. */
  rename(rawName: string): { readonly profile: PlayerProfile } | { readonly error: string } {
    const validation = validatePlayerName(rawName);
    if (!validation.isValid) return { error: validation.error };
    const profile: PlayerProfile = { ...this.load(), name: validation.name, hasChosenName: true };
    this.store.write(profile);
    return { profile };
  }
}

const resultSchema = z.object({
  matchId: z.string(),
  score: z.number(),
  durationMs: z.number(),
  endReason: z.enum(['timeUp', 'playerDestroyed']),
  endedAt: z.string(),
  settings: settingsSchema,
  seed: z.number(),
  highlights: z
    .object({
      cannonballsFired: z.number(),
      hits: z.number(),
      damageDealt: z.number(),
      damageTaken: z.number(),
    })
    .optional(),
});

/** Result of the last completed match (abandoned matches never reach it). */
export class LastResultRepository {
  private readonly store: LocalStore<MatchResult>;

  constructor(storage?: KeyValueStorage | null) {
    this.store = new LocalStore(`${STORAGE_PREFIX}.last-result.v1`, resultSchema, storage);
  }

  load(): MatchResult | null {
    return this.store.read();
  }

  save(result: MatchResult): boolean {
    return this.store.write(result);
  }
}

/** Developer tools (opened from a discreet button on the main menu): which match overlays are on. */
export interface DeveloperToolsSettings {
  /** Dashed lanes showing where each cannon fires and how far. */
  readonly showAimLanes: boolean;
  /** Hull circles of every ship, projectile radii and island colliders. */
  readonly showHitboxes: boolean;
}

export const DEFAULT_DEVELOPER_TOOLS: DeveloperToolsSettings = {
  showAimLanes: false,
  showHitboxes: false,
};

const developerToolsSchema = z.object({
  showAimLanes: z.boolean(),
  showHitboxes: z.boolean(),
});

/** Developer tools choices, kept in localStorage for this browser. */
export class DeveloperToolsRepository {
  private readonly store: LocalStore<DeveloperToolsSettings>;

  constructor(storage?: KeyValueStorage | null) {
    this.store = new LocalStore(`${STORAGE_PREFIX}.dev-tools.v2`, developerToolsSchema, storage);
  }

  load(): DeveloperToolsSettings {
    return this.store.read() ?? DEFAULT_DEVELOPER_TOOLS;
  }

  save(settings: DeveloperToolsSettings): boolean {
    return this.store.write(settings);
  }
}

const screenSchema = z.enum(['result']);

/** Remembers, for this tab only, that the result screen was open, so a refresh shows it again. */
export class ScreenMemory {
  private readonly store: LocalStore<'result'>;

  constructor(storage: KeyValueStorage | null = browserSessionStorage()) {
    this.store = new LocalStore(`${STORAGE_PREFIX}.screen.v1`, screenSchema, storage);
  }

  isResultOpen(): boolean {
    return this.store.read() === 'result';
  }

  rememberResultOpen(): void {
    this.store.write('result');
  }

  forget(): void {
    this.store.clear();
  }
}
