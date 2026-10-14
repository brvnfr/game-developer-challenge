import { createMatchConfig } from '@/game/config/matchConfig';
import type { UserSettings } from '@/game/config/types';
import { SeededRandom } from '@/game/core/SeededRandom';
import { Arena } from '@/game/sim/arena/Arena';
import type { ArenaDefinition } from '@/game/sim/arena/ArenaDefinition';
import { DEFAULT_ARENA } from '@/game/sim/arena/defaultArena';
import { MatchSession } from '@/game/sim/match/MatchSession';
import type { MatchSetup } from '@/game/sim/match/MatchSetup';

export interface MatchFactoryOptions {
  readonly arenaDefinition?: ArenaDefinition;
  /** Fixed seed (tests and reproducible scenarios); a random seed is used otherwise. */
  readonly seed?: number;
  readonly createMatchId?: () => string;
  readonly now?: () => Date;
  /** Starting layout of every match created (reproducible test scenarios). */
  readonly setup?: MatchSetup;
}

/** Creates matches from the current settings. Each call takes a fresh configuration snapshot. */
export class MatchFactory {
  readonly arena: Arena;

  constructor(private readonly options: MatchFactoryOptions = {}) {
    this.arena = new Arena(options.arenaDefinition ?? DEFAULT_ARENA);
  }

  create(settings: UserSettings): MatchSession {
    return new MatchSession({
      config: createMatchConfig(settings),
      arena: this.arena,
      seed: this.options.seed ?? SeededRandom.createSeed(),
      createMatchId: this.options.createMatchId ?? (() => crypto.randomUUID()),
      now: this.options.now ?? (() => new Date()),
      setup: this.options.setup,
    });
  }
}
