import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '@/storage/LocalStore';
import { ScenarioController, SCENARIO_SETTINGS_KEY } from './scenarios';

describe('ScenarioController', () => {
  it('starts on the success scenario and remembers the selection', () => {
    const storage = new MemoryStorage();
    const controller = new ScenarioController(storage);
    expect(controller.settings.scenarioId).toBe('success');
    controller.select({ scenarioId: 'slow', seed: 9 });
    expect(new ScenarioController(storage).settings).toMatchObject({ scenarioId: 'slow', seed: 9 });
    expect(storage.getItem(SCENARIO_SETTINGS_KEY)).toContain('slow');
  });

  it('URL/test overrides win over the stored selection', () => {
    const storage = new MemoryStorage();
    new ScenarioController(storage).select({ scenarioId: 'slow' });
    expect(new ScenarioController(storage, { scenarioId: 'empty' }).settings.scenarioId).toBe('empty');
  });

  it('produces the same delays for the same seed', () => {
    const delays = (seed: number) => {
      const controller = new ScenarioController(new MemoryStorage(), { scenarioId: 'variable-latency', seed });
      return Array.from({ length: 5 }, () => controller.plan('ranking').delayMs);
    };
    expect(delays(4)).toEqual(delays(4));
    expect(delays(4)).not.toEqual(delays(5));
    for (const delayMs of delays(4)) {
      expect(delayMs).toBeGreaterThanOrEqual(100);
      expect(delayMs).toBeLessThanOrEqual(2_500);
    }
  });

  it('out-of-order makes odd requests slow and even requests fast', () => {
    const controller = new ScenarioController(new MemoryStorage(), { scenarioId: 'out-of-order' });
    const delays = [1, 2, 3, 4].map(() => controller.plan('history').delayMs);
    expect(delays[0]).toBeGreaterThan(delays[1] ?? 0);
    expect(delays[2]).toBeGreaterThan(delays[3] ?? 0);
  });

  it('unavailable-then-recover fails the first three requests per endpoint, and selecting restarts the count', () => {
    const controller = new ScenarioController(new MemoryStorage(), { scenarioId: 'unavailable-then-recover' });
    const faults = () => Array.from({ length: 4 }, () => controller.plan('register', 'm1').fault?.kind ?? null);
    expect(faults()).toEqual(['status', 'status', 'status', null]);
    expect(controller.plan('ranking').fault).not.toBeNull();
    controller.select({ scenarioId: 'unavailable-then-recover' });
    expect(controller.plan('register', 'm1').fault).not.toBeNull();
  });

  it('register-timeout-after-commit stores the first save of each match but never answers it', () => {
    const controller = new ScenarioController(new MemoryStorage(), { scenarioId: 'register-timeout-after-commit' });
    expect(controller.plan('register', 'a')).toMatchObject({
      fault: { kind: 'noAnswer' },
      appliesFaultAfterCommit: true,
    });
    expect(controller.plan('register', 'a').fault).toBeNull();
    expect(controller.plan('register', 'b').fault).toEqual({ kind: 'noAnswer' });
    expect(controller.plan('ranking').fault).toBeNull();
  });

  it('only the targeted endpoint fails in ranking-fail and history-fail', () => {
    const rankingFails = new ScenarioController(new MemoryStorage(), { scenarioId: 'ranking-fail' });
    expect(rankingFails.plan('ranking').fault).toMatchObject({ status: 500 });
    expect(rankingFails.plan('history').fault).toBeNull();
    const historyFails = new ScenarioController(new MemoryStorage(), { scenarioId: 'history-fail' });
    expect(historyFails.plan('history').fault).toMatchObject({ status: 500 });
    expect(historyFails.plan('register', 'x').fault).toBeNull();
  });

  it('reset goes back to the default scenario and keeps it after a reload', () => {
    const storage = new MemoryStorage();
    const controller = new ScenarioController(storage, { scenarioId: 'timeout' });
    controller.reset();
    expect(controller.settings.scenarioId).toBe('success');
    expect(new ScenarioController(storage).settings.scenarioId).toBe('success');
  });
});
