import { expect, test } from '@playwright/test';
import type { ProfileReport } from '../../src/game/runtime/FrameProfiler';
import { describeEnvironment } from './environment';
import { PLATFORM_LABEL, writeReport } from './reportFiles';

const MATCH_SECONDS = 180;
const SPAWN_SECONDS = 3;
const SEED = 7;
/** Keeps the player alive for the whole 3 minutes so the arena fills up; every other value is the default. */
const PLAYER_HEALTH = 10_000;
const TRACE_SECONDS = 5;

test('3-minute match in the production build: frame rate, p95 frame time and entities', async ({ page, browser }) => {
  const query = new URLSearchParams({
    test: '1',
    profile: '1',
    seed: String(SEED),
    session: String(MATCH_SECONDS),
    spawn: String(SPAWN_SECONDS),
    playerHealth: String(PLAYER_HEALTH),
    latency: '0',
  });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'pirate-battle.player.v1',
      JSON.stringify({ playerId: 'perf-player', name: 'Perf Captain', hasChosenName: true }),
    );
  });
  await page.goto(`/?${query.toString()}`);
  const environment = await describeEnvironment(page, browser);
  await page.getByRole('button', { name: 'Play' }).click();
  await page.waitForFunction(() => window.__PIRATE_BATTLE__?.state()?.status === 'running', null, { timeout: 30_000 });
  await page.evaluate(() => window.__PIRATE_BATTLE__?.resetProfile());

  // Sail in wide loops and keep every cannon firing: many projectiles, hits, explosions and wrecks on screen.
  for (const key of ['KeyW', 'Space', 'KeyQ', 'KeyE']) await page.keyboard.down(key);
  let turnKey = 'KeyA';
  await page.keyboard.down(turnKey);

  // A short Chrome performance trace in the middle of the match, as profiling evidence.
  let traceTaken = false;
  const startedAt = Date.now();
  let profile: ProfileReport | null = null;
  // Without a GPU (software WebGL) frames are slow and a long frame is capped by the simulation clock, so the
  // match can take longer than 180 s of wall time: allow up to four times as much.
  while (Date.now() - startedAt < MATCH_SECONDS * 4 * 1000) {
    await page.waitForTimeout(1_000);
    const elapsed = (Date.now() - startedAt) / 1000;
    if (Math.round(elapsed) % 12 === 0) {
      await page.keyboard.up(turnKey);
      turnKey = turnKey === 'KeyA' ? 'KeyD' : 'KeyA';
      await page.keyboard.down(turnKey);
    }
    if (!traceTaken && elapsed > 90) {
      traceTaken = true;
      await browser.startTracing(page, {
        screenshots: false,
        categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.frame'],
      });
      await page.waitForTimeout(TRACE_SECONDS * 1000);
      const trace = await browser.stopTracing();
      writeReport(`match-3min-trace-${PLATFORM_LABEL}.json`, trace.toString('utf8'));
    }
    const snapshot = await page.evaluate(() => {
      const api = window.__PIRATE_BATTLE__;
      const state = api?.state();
      return state
        ? { status: state.status, profile: state.status === 'ended' ? (api?.profile() ?? null) : null }
        : null;
    });
    if (snapshot?.status === 'ended') {
      profile = snapshot.profile;
      break;
    }
  }
  const finalState = await page.evaluate(() => window.__PIRATE_BATTLE__?.state() ?? null);
  const memory = await page.evaluate(() => {
    const performanceMemory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    return performanceMemory ? Math.round(performanceMemory.usedJSHeapSize / 1024 / 1024) : null;
  });

  expect(profile, 'the match should reach its time limit').not.toBeNull();
  if (!profile) return;
  const report = {
    environment,
    match: {
      sessionSeconds: MATCH_SECONDS,
      spawnIntervalSeconds: SPAWN_SECONDS,
      seed: SEED,
      playerMaxHealth: PLAYER_HEALTH,
      input: 'W held, turning left/right alternately every 12 s, Space + Q + E held (all cannons)',
      score: finalState?.score ?? null,
      enemiesSpawned: finalState?.enemiesSpawned ?? null,
      statistics: finalState?.statistics ?? null,
    },
    wallClockSeconds: Math.round((Date.now() - startedAt) / 1000),
    usedJsHeapMbAtEnd: memory,
    profile,
  };
  const file = writeReport(`match-3min-${PLATFORM_LABEL}.json`, report);
  console.log(`Performance report: ${file}`);
  console.log(
    `FPS ${profile.frames.averageFps} · p95 ${profile.frames.p95FrameMs} ms · p99 ${profile.frames.p99FrameMs} ms · ` +
      `frame work p95 ${profile.updateWork.p95Ms} ms · peak enemies ${profile.peakEntities.enemies}, ` +
      `projectiles ${profile.peakEntities.projectiles}, display objects ${profile.peakEntities.displayObjects}`,
  );
});
