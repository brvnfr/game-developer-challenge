import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '@/storage/LocalStore';
import { AUDIO_SETTINGS_KEY, AudioEngine } from './AudioEngine';
import { SOUND_IDS } from './soundCatalog';

/** Just enough of the Web Audio API to observe what the engine does. */
function createFakeContext() {
  const started: { loop: boolean }[] = [];
  const node = () => ({
    connect: (target: unknown) => target ?? node(),
    disconnect: () => undefined,
    gain: { value: 1 },
  });
  const context = {
    state: 'running',
    destination: {},
    createGain: node,
    createBufferSource: () => {
      const source = {
        buffer: null as unknown,
        loop: false,
        playbackRate: { value: 1 },
        connect: (target: unknown) => target,
        start: () => started.push({ loop: source.loop }),
        stop: () => undefined,
        addEventListener: () => undefined,
      };
      return source;
    },
    decodeAudioData: () => Promise.resolve({}),
    resume: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  return { context: context as unknown as AudioContext, started };
}

function createEngine(storage = new MemoryStorage()) {
  const fake = createFakeContext();
  const engine = new AudioEngine({
    baseUrl: '/',
    storage,
    createContext: () => fake.context,
    fetchFile: () => Promise.resolve(new ArrayBuffer(8)),
  });
  return { engine, started: fake.started, storage };
}

describe('AudioEngine', () => {
  it('stays silent until unlocked by a gesture, then loads every sound', async () => {
    const { engine, started } = createEngine();
    engine.play('score_point');
    expect(started).toHaveLength(0);
    expect(engine.isUnlocked).toBe(false);

    engine.unlock();
    await engine.whenLoaded();
    expect(engine.loadedSoundCount).toBe(SOUND_IDS.length);
    engine.play('score_point');
    expect(engine.playLog).toEqual(['score_point']);
  });

  it('unlocks on the first pointer or key press', () => {
    const { engine } = createEngine();
    const target = new EventTarget();
    engine.attachUnlockListeners(target);
    target.dispatchEvent(new Event('keydown'));
    expect(engine.isUnlocked).toBe(true);
  });

  it('mutes everything, stops the loops and remembers the choice', async () => {
    const { engine, storage } = createEngine();
    engine.unlock();
    await engine.whenLoaded();
    engine.setLoop('ocean_ambience_loop', true);
    expect(engine.isLoopPlaying('ocean_ambience_loop')).toBe(true);
    engine.setMuted(true);
    expect(engine.isLoopPlaying('ocean_ambience_loop')).toBe(false);
    engine.play('score_point');
    expect(engine.playLog).toEqual(['ocean_ambience_loop']);
    expect(storage.getItem(AUDIO_SETTINGS_KEY)).toBe('{"isMuted":true}');
    expect(createEngine(storage).engine.isMuted).toBe(true);
  });

  it('starts a loop once however often it is requested', async () => {
    const { engine, started } = createEngine();
    engine.unlock();
    await engine.whenLoaded();
    for (let frame = 0; frame < 5; frame++) engine.setLoop('ship_sailing_loop', true);
    expect(started.filter((source) => source.loop)).toHaveLength(1);
  });

  it('is a silent no-op without Web Audio', () => {
    const engine = new AudioEngine({ baseUrl: '/', storage: null, createContext: null });
    engine.unlock();
    engine.play('score_point');
    expect(engine.isUnlocked).toBe(false);
    expect(engine.playLog).toEqual([]);
  });
});
