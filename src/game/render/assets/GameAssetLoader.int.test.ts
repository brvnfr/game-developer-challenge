import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pixiAssets = vi.hoisted(() => ({
  addBundle: vi.fn(),
  loadBundle: vi.fn(),
  unloadBundle: vi.fn(() => Promise.resolve()),
}));
const FakeTexture = vi.hoisted(
  () =>
    class FakeTexture {
      readonly label = 'water';
    },
);
vi.mock('pixi.js', () => ({ Assets: pixiAssets, Texture: FakeTexture }));

const fakeSheet = (name: string) => ({ textures: { [name]: { label: name } } });

async function freshLoader(timeoutMs = 1000) {
  vi.resetModules();
  const module = await import('./GameAssetLoader');
  return { loader: new module.GameAssetLoader('/', timeoutMs), module };
}

describe('GameAssetLoader', () => {
  beforeEach(() => {
    pixiAssets.addBundle.mockClear();
    pixiAssets.loadBundle.mockReset();
    pixiAssets.unloadBundle.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports progress, then reuses the loaded textures without downloading again', async () => {
    pixiAssets.loadBundle.mockImplementation((_bundle: string, onProgress: (progress: number) => void) => {
      onProgress(0.5);
      onProgress(1);
      return Promise.resolve({ ships: fakeSheet('ship_1'), tiles: fakeSheet('tile_1'), terrain: fakeSheet('island_grass'), ui: fakeSheet('panel_menu'), water: new FakeTexture() });
    });
    const { loader, module } = await freshLoader();
    const progress: number[] = [];
    const textures = await loader.load((value) => progress.push(value));
    expect(progress).toEqual([0.5, 1]);
    expect(module.GameAssetLoader.cachedTextures).toBe(textures);
    await loader.load();
    expect(pixiAssets.loadBundle).toHaveBeenCalledTimes(1);
    expect(pixiAssets.addBundle).toHaveBeenCalledTimes(1);
  });

  it('fails with a readable error, clears the partial load and succeeds on retry', async () => {
    pixiAssets.loadBundle.mockRejectedValueOnce(new Error('404'));
    pixiAssets.loadBundle.mockResolvedValueOnce({ ships: fakeSheet('ship_1'), tiles: fakeSheet('tile_1'), terrain: fakeSheet('island_grass'), ui: fakeSheet('panel_menu'), water: new FakeTexture() });
    const { loader, module } = await freshLoader();
    await expect(loader.load()).rejects.toMatchObject({ name: 'AssetLoadError', reason: 'network' });
    expect(pixiAssets.unloadBundle).toHaveBeenCalledOnce();
    expect(module.GameAssetLoader.cachedTextures).toBeNull();
    await expect(loader.load()).resolves.toBeDefined();
  });

  it('times out a load that never finishes', async () => {
    vi.useFakeTimers();
    pixiAssets.loadBundle.mockReturnValue(new Promise(() => undefined));
    const { loader } = await freshLoader(500);
    const pending = loader.load();
    const assertion = expect(pending).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(600);
    await assertion;
  });

  it('shares one request between concurrent callers', async () => {
    let resolveLoad: (value: unknown) => void = () => undefined;
    pixiAssets.loadBundle.mockReturnValue(new Promise((resolve) => (resolveLoad = resolve)));
    const { loader } = await freshLoader();
    const first = loader.load();
    const second = loader.load();
    resolveLoad({ ships: fakeSheet('ship_1'), tiles: fakeSheet('tile_1'), terrain: fakeSheet('island_grass'), ui: fakeSheet('panel_menu'), water: new FakeTexture() });
    expect(await first).toBe(await second);
    expect(pixiAssets.loadBundle).toHaveBeenCalledTimes(1);
  });
});
