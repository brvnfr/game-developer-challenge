import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG, DEFAULT_USER_SETTINGS } from '@/game/config/defaults';
import { createMatchConfig } from '@/game/config/matchConfig';
import type { GameConfig, UserSettings } from '@/game/config/types';
import { Vector2 } from '@/game/core/math/Vector2';
import { Arena } from '../arena/Arena';
import type { ArenaDefinition } from '../arena/ArenaDefinition';
import { DEFAULT_ARENA } from '../arena/defaultArena';
import { IDLE_COMMANDS, type PlayerCommands } from '../PlayerCommands';
import { eventsOfType, OPEN_SEA } from '../testing/fixtures';
import { MatchSession } from './MatchSession';

const FIXED_END_TIME = new Date('2026-10-20T12:00:00.000Z');
const INVULNERABLE_BALANCE: GameConfig = {
  ...DEFAULT_GAME_CONFIG,
  player: { ...DEFAULT_GAME_CONFIG.player, maxHealth: 1e9 },
};

interface SessionOptions {
  readonly settings?: UserSettings;
  readonly seed?: number;
  readonly arena?: ArenaDefinition;
  readonly balance?: GameConfig;
}

function createSession({
  settings = { sessionTimeSeconds: 60, spawnIntervalSeconds: 3 },
  seed = 7,
  arena = DEFAULT_ARENA,
  balance,
}: SessionOptions = {}) {
  let createdIds = 0;
  return new MatchSession({
    config: createMatchConfig(settings, balance),
    arena: new Arena(arena),
    seed,
    createMatchId: () => `match-${++createdIds}`,
    now: () => FIXED_END_TIME,
  });
}

function playFor(
  session: MatchSession,
  seconds: number,
  commandsForStep: (step: number) => PlayerCommands = () => IDLE_COMMANDS,
) {
  const stepCount = Math.round(seconds * 60);
  for (let step = 0; step < stepCount; step++) session.step(commandsForStep(session.stepsSimulated));
}

const ALL_INPUTS_HELD: PlayerCommands = {
  isSailingForward: true,
  turnDirection: 1,
  isFiringFront: true,
  isFiringLeft: true,
  isFiringRight: true,
};

describe('MatchSession lifecycle', () => {
  it('does nothing before it is started', () => {
    const session = createSession();
    session.step(ALL_INPUTS_HELD);
    expect(session.stepsSimulated).toBe(0);
    expect(session.status).toBe('ready');
  });

  it('ends by time after exactly the configured active duration', () => {
    const session = createSession({
      settings: { sessionTimeSeconds: 60, spawnIntervalSeconds: 10 },
      balance: INVULNERABLE_BALANCE,
    });
    session.start();
    playFor(session, 59.99);
    expect(session.status).toBe('running');
    playFor(session, 0.02);
    expect(session.status).toBe('ended');
    expect(session.result).toMatchObject({
      endReason: 'timeUp',
      durationMs: 60_000,
      matchId: 'match-1',
      endedAt: FIXED_END_TIME.toISOString(),
    });
    expect(session.result?.settings).toEqual({ sessionTimeSeconds: 60, spawnIntervalSeconds: 10 });
  });

  it('ends when the player is destroyed, and a ram never scores', () => {
    const session = createSession({
      settings: { sessionTimeSeconds: 60, spawnIntervalSeconds: 10 },
      arena: OPEN_SEA,
      seed: 1,
    });
    session.start();
    session.player.takeDamage(session.player.maxHealth - 5);
    session.simulationContext.ships.createChaser(session.player.position.add(new Vector2(30, 0)), Math.PI);
    session.step();
    expect(session.status).toBe('ended');
    expect(session.result?.endReason).toBe('playerDestroyed');
    expect(session.result?.score).toBe(0);
    expect(session.snapshot().health).toBe(0);
  });

  it('freezes the whole simulation once ended', () => {
    const session = createSession({
      settings: { sessionTimeSeconds: 60, spawnIntervalSeconds: 1 },
      balance: INVULNERABLE_BALANCE,
    });
    session.start();
    playFor(session, 61);
    expect(session.status).toBe('ended');
    const describeState = () =>
      JSON.stringify({
        ships: session.world.ships.map((ship) => [ship.id, ship.position, ship.health]),
        projectiles: session.world.projectiles.map((projectile) => [projectile.id, projectile.position]),
        score: session.score,
        steps: session.stepsSimulated,
      });
    const stateAtEnd = describeState();
    session.drainEvents();
    playFor(session, 5, () => ALL_INPUTS_HELD);
    expect(describeState()).toBe(stateAtEnd);
    expect(session.drainEvents()).toEqual([]);
    expect(session.pause('manual')).toBe(false);
  });

  it('suspends time, cooldowns, spawns and movement while paused', () => {
    const session = createSession({ settings: { sessionTimeSeconds: 60, spawnIntervalSeconds: 1 } });
    session.start();
    playFor(session, 2, () => ({ ...IDLE_COMMANDS, isSailingForward: true, isFiringFront: true }));
    const remainingSeconds = session.remainingSeconds;
    const enemiesSpawned = session.enemiesSpawned;
    const position = session.player.position;
    const cooldown = session.player.weapon('front')?.cooldownRemaining;

    expect(session.pause('blur')).toBe(true);
    expect(session.snapshot()).toMatchObject({ status: 'paused', pauseReason: 'blur' });
    playFor(session, 10, () => ALL_INPUTS_HELD);
    expect(session.remainingSeconds).toBe(remainingSeconds);
    expect(session.enemiesSpawned).toBe(enemiesSpawned);
    expect(session.player.position).toEqual(position);
    expect(session.player.weapon('front')?.cooldownRemaining).toBe(cooldown);
    expect(session.player.throttle).toBe(0);

    expect(session.resume()).toBe(true);
    session.drainEvents();
    session.step();
    expect(eventsOfType(session.drainEvents(), 'weaponFired').some((event) => event.shipId === session.player.id)).toBe(
      false,
    );
  });

  it('scores one point per enemy destroyed by the player, without duplicates', () => {
    const session = createSession({
      settings: { sessionTimeSeconds: 60, spawnIntervalSeconds: 10 },
      arena: OPEN_SEA,
      seed: 1,
    });
    session.start();
    const target = session.simulationContext.ships.createShooter(
      session.player.position.add(new Vector2(150, 0)),
      Math.PI,
    );
    target.takeDamage(target.maxHealth - 1);
    playFor(session, 0.5, () => ({ ...IDLE_COMMANDS, isFiringFront: true }));
    expect(target.isAlive).toBe(false);
    expect(session.score).toBe(1);
    expect(eventsOfType(session.drainEvents(), 'scoreChanged')).toEqual([{ type: 'scoreChanged', score: 1 }]);
  });

  it('exposes a discrete snapshot for the HUD', () => {
    const session = createSession({ settings: { sessionTimeSeconds: 90, spawnIntervalSeconds: 3 } });
    expect(session.snapshot()).toMatchObject({
      status: 'ready',
      remainingSeconds: 90,
      health: 100,
      maxHealth: 100,
      score: 0,
    });
    session.start();
    playFor(session, 0.5);
    expect(session.snapshot().remainingSeconds).toBe(90);
    playFor(session, 0.5);
    expect(session.snapshot().remainingSeconds).toBe(89);
  });
});

describe('MatchSession determinism', () => {
  const scriptedCommands = (step: number): PlayerCommands => ({
    isSailingForward: step % 240 < 200,
    turnDirection: step % 300 < 100 ? 1 : step % 300 < 140 ? -1 : 0,
    isFiringFront: step % 30 === 0,
    isFiringLeft: step % 90 === 0,
    isFiringRight: step % 90 === 45,
  });

  const playScriptedMatch = (seed: number) => {
    const session = createSession({ settings: { sessionTimeSeconds: 60, spawnIntervalSeconds: 2 }, seed });
    session.start();
    playFor(session, 70, scriptedCommands);
    return {
      result: session.result,
      ships: session.world.ships.map((ship) => [ship.kind, Math.round(ship.position.x), Math.round(ship.position.y)]),
    };
  };

  it('replays identically with the same seed and inputs', () => {
    expect(playScriptedMatch(123)).toEqual(playScriptedMatch(123));
  });

  it('plays differently with another seed', () => {
    expect(playScriptedMatch(123).ships).not.toEqual(playScriptedMatch(456).ships);
  });
});

describe('Headless full match', () => {
  it('plays a standard match where both enemy kinds appear, nobody enters an island and the match ends', () => {
    const session = createSession({ settings: DEFAULT_USER_SETTINGS, seed: 2024 });
    session.start();
    const spawnedKinds = new Set<string>();
    let peakEntityCount = 0;
    const isRunning = () => session.status === 'running';
    for (let step = 1; isRunning(); step++) {
      if (step > 200 * 60) throw new Error('The match did not end');
      session.step({
        isSailingForward: true,
        turnDirection: step % 400 < 120 ? 1 : 0,
        isFiringFront: true,
        isFiringLeft: true,
        isFiringRight: true,
      });
      for (const event of eventsOfType(session.drainEvents(), 'enemySpawned')) spawnedKinds.add(event.kind);
      for (const ship of session.world.ships) {
        if (ship.isAlive) expect(session.simulationContext.hullPlacement.isBlocked(ship, 0.01)).toBe(false);
      }
      peakEntityCount = Math.max(peakEntityCount, session.world.ships.length + session.world.projectiles.length);
    }
    expect(spawnedKinds).toEqual(new Set(['chaser', 'shooter']));
    expect(session.result).not.toBeNull();
    expect(peakEntityCount).toBeLessThan(200);
  });
});
