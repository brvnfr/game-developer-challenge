import { describe, expect, it } from 'vitest';
import { Vector2 } from '@/game/core/math/Vector2';
import type { GameEvent } from '@/game/sim/events/GameEvent';
import { MatchSoundDirector, type MatchSoundState } from './MatchSoundDirector';
import type { LoopSoundId, SoundId } from './soundCatalog';
import type { SoundOutput } from './SoundOutput';

class RecordingOutput implements SoundOutput {
  readonly played: SoundId[] = [];
  readonly loops = new Set<LoopSoundId>();
  play(id: SoundId): void {
    this.played.push(id);
  }
  setLoop(id: LoopSoundId, isPlaying: boolean): void {
    if (isPlaying) this.loops.add(id);
    else this.loops.delete(id);
  }
  stopAllLoops(): void {
    this.loops.clear();
  }
}

const PLAYER_ID = 1;
const AT = new Vector2(0, 0);
const RUNNING: MatchSoundState = { isRunning: true, isPlayerSailing: false, healthRatio: 1, remainingSeconds: 100 };

function setup() {
  const output = new RecordingOutput();
  return { output, director: new MatchSoundDirector(output, PLAYER_ID) };
}

const fired = (shipId: number, weaponSlot: 'front' | 'left' | 'cannon'): GameEvent => ({
  type: 'weaponFired',
  shipId,
  weaponSlot,
  projectileIds: [9],
  position: AT,
  heading: 0,
});

describe('MatchSoundDirector', () => {
  it('plays a cannon for the front gun and the broadside sound for side volleys', () => {
    const { output, director } = setup();
    director.handleEvents([fired(PLAYER_ID, 'front')]);
    director.handleEvents([fired(PLAYER_ID, 'left')]);
    expect(output.played[0]).toMatch(/^cannon_fire_[123]$/);
    expect(output.played[1]).toBe('cannon_broadside');
  });

  it('plays each sound at most once per frame', () => {
    const { output, director } = setup();
    director.handleEvents([fired(PLAYER_ID, 'left'), fired(PLAYER_ID, 'left'), { type: 'scoreChanged', score: 1 }]);
    expect(output.played).toEqual(['cannon_broadside', 'score_point']);
  });

  it('distinguishes rams, kills and the player sinking', () => {
    const { output, director } = setup();
    director.handleEvents([{ type: 'shipDestroyed', shipId: 5, kind: 'chaser', cause: 'ram', position: AT }]);
    director.handleEvents([{ type: 'shipDestroyed', shipId: PLAYER_ID, kind: 'player', cause: 'ram', position: AT }]);
    expect(output.played).toEqual(['ship_collision', 'ship_explosion_1', 'ship_sinking']);
  });

  it('ends with game_complete on time up and game_over on destruction', () => {
    const { output, director } = setup();
    director.handleEvents([{ type: 'matchEnded', reason: 'timeUp' }]);
    director.handleEvents([{ type: 'matchEnded', reason: 'playerDestroyed' }]);
    expect(output.played).toEqual(['game_complete', 'game_over']);
  });

  it('keeps the ocean loop while running and the sailing loop only while sailing', () => {
    const { output, director } = setup();
    director.update(RUNNING);
    expect([...output.loops]).toEqual(['ocean_ambience_loop']);
    director.update({ ...RUNNING, isPlayerSailing: true });
    expect(output.loops.has('ship_sailing_loop')).toBe(true);
    director.update({ ...RUNNING, isRunning: false });
    expect(output.loops.size).toBe(0);
  });

  it('warns once for low health and once for the last ten seconds', () => {
    const { output, director } = setup();
    director.update({ ...RUNNING, healthRatio: 0.2, remainingSeconds: 9 });
    director.update({ ...RUNNING, healthRatio: 0.1, remainingSeconds: 5 });
    expect(output.played).toEqual(['health_low', 'time_warning']);
  });
});
