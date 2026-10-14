import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { describeEnvironment, reportLabel, warnIfSoftwareRendering } from './environment';
import { countHeapObjects } from './heapSnapshot';
import { writeReport } from './reportFiles';

/** Five cycles as required; PERF_MEMORY_CYCLES can raise it to check that the heap levels off. */
const CYCLES = Number(process.env.PERF_MEMORY_CYCLES ?? 5);
const PLAY_SECONDS = 20;

interface MemorySample {
  readonly label: string;
  readonly jsHeapUsedMb: number;
  readonly domNodes: number;
  readonly jsEventListeners: number;
  readonly documents: number;
  readonly liveRuntimes: number;
  readonly canvases: number;
}

async function collectGarbage(cdp: CDPSession): Promise<void> {
  for (let pass = 0; pass < 3; pass++) await cdp.send('HeapProfiler.collectGarbage');
}

async function sample(page: Page, cdp: CDPSession, label: string): Promise<MemorySample> {
  await collectGarbage(cdp);
  const heap = await cdp.send('Runtime.getHeapUsage');
  const counters = await cdp.send('Memory.getDOMCounters');
  const page_ = await page.evaluate(() => ({
    liveRuntimes: window.__PIRATE_BATTLE__?.liveRuntimes() ?? -1,
    canvases: document.querySelectorAll('canvas').length,
  }));
  return {
    label,
    jsHeapUsedMb: Number((heap.usedSize / 1024 / 1024).toFixed(2)),
    domNodes: counters.nodes,
    jsEventListeners: counters.jsEventListeners,
    documents: counters.documents,
    ...page_,
  };
}

test(`${CYCLES} cycles of start, play and leave do not leak`, async ({ page, browser }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'pirate-battle.player.v1',
      JSON.stringify({ playerId: 'perf-player', name: 'Perf Captain', hasChosenName: true }),
    );
  });
  await page.goto('/?test=1&seed=11&session=120&spawn=3&playerHealth=10000&latency=0');
  const environment = await describeEnvironment(page, browser);
  warnIfSoftwareRendering(environment);
  const label = reportLabel(environment);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  const samples: MemorySample[] = [await sample(page, cdp, 'menu before any match')];
  const heapObjects: Record<string, Record<string, number>> = {};

  for (let cycle = 1; cycle <= CYCLES; cycle++) {
    await page.getByRole('button', { name: 'Play' }).click();
    await page.waitForFunction(() => window.__PIRATE_BATTLE__?.state()?.status === 'running', null, {
      timeout: 30_000,
    });
    for (const key of ['KeyW', 'KeyA', 'Space', 'KeyQ', 'KeyE']) await page.keyboard.down(key);
    await page.waitForTimeout(PLAY_SECONDS * 1000);
    for (const key of ['KeyW', 'KeyA', 'Space', 'KeyQ', 'KeyE']) await page.keyboard.up(key);
    const inMatch = await page.evaluate(() => window.__PIRATE_BATTLE__?.state()?.scene ?? null);
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Main Menu' }).click();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    const afterCycle = await sample(page, cdp, `after cycle ${cycle}`);
    samples.push({ ...afterCycle, ...(inMatch ? { sceneDuringMatch: inMatch } : {}) });
    if (cycle === 1 || cycle === CYCLES) heapObjects[`after cycle ${cycle}`] = await countHeapObjects(cdp);
  }

  const afterFirst = samples[1];
  const afterLast = samples.at(-1);
  if (!afterFirst || !afterLast) throw new Error('Missing samples');
  const heapGrowthMb = Number((afterLast.jsHeapUsedMb - afterFirst.jsHeapUsedMb).toFixed(2));
  const report = {
    environment,
    method:
      `${CYCLES} cycles: Play → ${PLAY_SECONDS} s of real-time combat (all cannons) → pause → Main Menu; ` +
      'after each cycle three forced garbage collections (CDP HeapProfiler.collectGarbage), then JS heap ' +
      '(Runtime.getHeapUsage) and DOM counters (Memory.getDOMCounters).',
    samples,
    heapGrowthFromCycle1ToLastMb: heapGrowthMb,
    nativeObjectsInHeapSnapshots: heapObjects,
  };
  const file = writeReport(`memory-${CYCLES}-cycles-${label}.json`, report);
  console.log(`Memory report: ${file}`);
  console.table(
    samples.map(({ label, jsHeapUsedMb, domNodes, jsEventListeners, liveRuntimes, canvases }) => ({
      label,
      jsHeapUsedMb,
      domNodes,
      jsEventListeners,
      liveRuntimes,
      canvases,
    })),
  );

  console.log('Native objects in heap snapshots', JSON.stringify(heapObjects));
  const firstCounts = heapObjects['after cycle 1'];
  const lastCounts = heapObjects[`after cycle ${CYCLES}`];
  if (firstCounts && lastCounts) {
    for (const [name, count] of Object.entries(lastCounts))
      expect(count, name).toBeLessThanOrEqual(firstCounts[name] ?? 0);
  }
  for (const after of samples.slice(1)) {
    expect(after.liveRuntimes).toBe(0);
    expect(after.canvases).toBe(0);
  }
  // No continuous growth: the heap after the last cycle stays within 10 % (or 3 MB) of the first one,
  // and DOM nodes and listeners return to the same level.
  expect(heapGrowthMb).toBeLessThan(Math.max(3, afterFirst.jsHeapUsedMb * 0.1));
  expect(afterLast.jsEventListeners).toBeLessThanOrEqual(afterFirst.jsEventListeners + 5);
  expect(afterLast.domNodes).toBeLessThanOrEqual(afterFirst.domNodes + 50);
});
