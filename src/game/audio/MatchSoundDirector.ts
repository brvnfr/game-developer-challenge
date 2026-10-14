import type { GameEvent } from '@/game/sim/events/GameEvent';
import type { SoundId } from './soundCatalog';
import type { SoundOutput } from './SoundOutput';

/** What the director needs to know about the match each frame. */
export interface MatchSoundState {
  readonly isRunning: boolean;
  readonly isPlayerSailing: boolean;
  readonly healthRatio: number;
  readonly remainingSeconds: number;
}

const LOW_HEALTH_RATIO = 0.3;
const TIME_WARNING_SECONDS = 10;
const CANNON_SOUNDS = ['cannon_fire_1', 'cannon_fire_2', 'cannon_fire_3'] as const;
const HIT_SOUNDS = ['ship_wood_hit_1', 'ship_wood_hit_2'] as const;
const SPLASH_SOUNDS = ['cannonball_water_hit_1', 'cannonball_water_hit_2'] as const;
const EXPLOSION_SOUNDS = ['ship_explosion_1', 'ship_explosion_2'] as const;

interface Cue {
  readonly id: SoundId;
  readonly volume: number;
  readonly playbackRate?: number;
}

/**
 * Turns the simulation's events into sound effects and keeps the loops in step with the match:
 * the ocean ambience while it runs, the sailing loop while the player sails, warnings for low health and the
 * last ten seconds. A sound is played at most once per frame, however many events ask for it, so a big
 * broadside or a wave of hits never becomes a wall of noise. Variations rotate instead of being random, so a
 * seeded run always sounds the same.
 */
export class MatchSoundDirector {
  private rotation = 0;
  private hasWarnedLowHealth = false;
  private hasWarnedTime = false;

  constructor(
    private readonly output: SoundOutput,
    private readonly playerId: number,
  ) {}

  handleEvents(events: readonly GameEvent[]): void {
    const playedThisFrame = new Set<SoundId>();
    for (const event of events) {
      for (const cue of this.cuesFor(event)) {
        if (playedThisFrame.has(cue.id)) continue;
        playedThisFrame.add(cue.id);
        this.output.play(cue.id, { volume: cue.volume, playbackRate: cue.playbackRate ?? 1 });
      }
    }
  }

  update(state: MatchSoundState): void {
    this.output.setLoop('ocean_ambience_loop', state.isRunning, 0.35);
    this.output.setLoop('ship_sailing_loop', state.isRunning && state.isPlayerSailing, 0.45);
    if (!state.isRunning) return;
    if (state.healthRatio > 0 && state.healthRatio < LOW_HEALTH_RATIO && !this.hasWarnedLowHealth) {
      this.hasWarnedLowHealth = true;
      this.output.play('health_low', { volume: 0.8 });
    }
    if (state.remainingSeconds > 0 && state.remainingSeconds <= TIME_WARNING_SECONDS && !this.hasWarnedTime) {
      this.hasWarnedTime = true;
      this.output.play('time_warning', { volume: 0.8 });
    }
  }

  /** Silences the loops (pause, end of the match, leaving the screen). */
  stop(): void {
    this.output.stopAllLoops();
  }

  private next<Choice>(choices: readonly [Choice, ...Choice[]]): Choice {
    this.rotation++;
    return choices[this.rotation % choices.length] ?? choices[0];
  }

  private cuesFor(event: GameEvent): readonly Cue[] {
    switch (event.type) {
      case 'matchStarted':
        return [{ id: 'game_start', volume: 0.7 }];
      case 'matchPaused':
        return [{ id: 'game_pause', volume: 0.7 }];
      case 'matchResumed':
        return [{ id: 'game_resume', volume: 0.7 }];
      case 'matchEnded':
        return [{ id: event.reason === 'timeUp' ? 'game_complete' : 'game_over', volume: 0.8 }];
      case 'weaponFired':
        if (event.shipId !== this.playerId) return [{ id: this.next(CANNON_SOUNDS), volume: 0.45, playbackRate: 1.12 }];
        return event.weaponSlot === 'front'
          ? [{ id: this.next(CANNON_SOUNDS), volume: 0.8 }]
          : [{ id: 'cannon_broadside', volume: 0.9 }];
      case 'projectileHit':
        return [{ id: this.next(HIT_SOUNDS), volume: 0.8 }];
      case 'projectileExpired':
        if (event.reason === 'rangeExhausted') return [{ id: this.next(SPLASH_SOUNDS), volume: 0.35 }];
        if (event.reason === 'hitIsland') return [{ id: 'cannonball_water_hit_2', volume: 0.25, playbackRate: 0.8 }];
        return [];
      case 'shipDestroyed':
        if (event.kind === 'player') return [{ id: 'ship_sinking', volume: 0.9 }];
        if (event.cause === 'ram') {
          return [
            { id: 'ship_collision', volume: 0.9 },
            { id: 'ship_explosion_1', volume: 0.8 },
          ];
        }
        return [{ id: this.next(EXPLOSION_SOUNDS), volume: 0.8 }];
      case 'scoreChanged':
        return [{ id: 'score_point', volume: 0.6 }];
      case 'enemySpawned':
      case 'shipDamaged':
        return [];
    }
  }
}
