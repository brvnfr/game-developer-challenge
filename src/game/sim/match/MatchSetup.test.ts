import { describe, expect, it } from 'vitest';
import { createMatchConfig } from '@/game/config/matchConfig';
import { Arena } from '../arena/Arena';
import { IDLE_COMMANDS, type PlayerCommands } from '../PlayerCommands';
import { OPEN_SEA } from '../testing/fixtures';
import { MatchSession } from './MatchSession';
import type { MatchSetup } from './MatchSetup';

function createSession(setup?: MatchSetup) {
  return new MatchSession({
    config: createMatchConfig({ sessionTimeSeconds: 60, spawnIntervalSeconds: 10 }),
    arena: new Arena(OPEN_SEA),
    seed: 3,
    createMatchId: () => 'match',
    now: () => new Date('2026-10-14T00:00:00.000Z'),
    setup,
  });
}

const FIRE_FRONT: PlayerCommands = { ...IDLE_COMMANDS, isFiringFront: true };
const FIRE_LEFT: PlayerCommands = { ...IDLE_COMMANDS, isFiringLeft: true };

describe('match setup', () => {
  it('starts the player at the arena start without a setup', () => {
    const session = createSession();
    expect(session.player.position).toEqual(session.arena.playerStart);
    expect(session.world.livingEnemies()).toHaveLength(0);
  });

  it('places the player and the initial enemies, which then follow the normal rules', () => {
    const session = createSession({
      player: { x: 300, y: 400, heading: Math.PI / 2 },
      enemies: [{ kind: 'chaser', x: 900, y: 400, heading: Math.PI }],
    });
    expect(session.player.position).toMatchObject({ x: 300, y: 400 });
    expect(session.player.heading).toBe(Math.PI / 2);
    const [chaser] = session.world.livingEnemies();
    expect(chaser?.kind).toBe('chaser');
    session.start();
    for (let step = 0; step < 60; step++) session.step();
    expect(chaser?.position.x).toBeLessThan(900); // it chases the player
    expect(session.enemiesSpawned).toBe(0); // initial enemies are not spawner waves
  });
});

describe('match statistics', () => {
  it('counts the player volleys per weapon and the projectiles they fire', () => {
    const session = createSession({ player: { x: 400, y: 400, heading: 0 } });
    session.start();
    for (let step = 0; step < 60; step++) session.step(FIRE_FRONT); // 1 s: shots at 0, 0.45 and 0.9 s
    for (let step = 0; step < 60; step++) session.step(FIRE_LEFT);
    const statistics = session.statisticsSnapshot;
    expect(statistics.playerVolleys).toEqual({ front: 3, left: 1, right: 0 });
    expect(statistics.playerProjectilesFired).toBe(3 + 3);
  });

  it('counts hits, kills and rams separately', () => {
    const session = createSession({
      player: { x: 300, y: 400, heading: 0 },
      enemies: [{ kind: 'chaser', x: 700, y: 400, heading: Math.PI }],
    });
    session.start();
    for (let step = 0; step < 600 && session.world.livingEnemies().length > 0; step++) session.step();
    const statistics = session.statisticsSnapshot;
    expect(statistics.enemiesDestroyedByRam).toBe(1);
    expect(statistics.enemiesDestroyedByPlayer).toBe(0);
    expect(statistics.damageTakenByPlayer).toBe(session.config.chaser.ramDamage);
    expect(session.score).toBe(0);
  });
});
