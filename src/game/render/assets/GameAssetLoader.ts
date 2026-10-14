import { Assets, Texture, type Spritesheet } from 'pixi.js';
import { GameTextures } from './GameTextures';
import { createGameBundle, GAME_BUNDLE, pickAtlasResolution } from './manifest';

export const DEFAULT_LOAD_TIMEOUT_MS = 20_000;

function isSpritesheet(asset: Spritesheet | Texture | undefined): asset is Spritesheet {
  return asset !== undefined && 'textures' in asset;
}

export class AssetLoadError extends Error {
  constructor(
    message: string,
    readonly reason: 'timeout' | 'network',
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AssetLoadError';
  }
}

/**
 * Loads the game atlases once and reuses them for every match. Progress is reported in [0, 1].
 * A failed load leaves nothing cached (PixiJS drops failed requests), so `load()` can simply be retried.
 * Concurrent calls share the same request.
 */
export class GameAssetLoader {
  private static bundleRegistered = false;
  private static loadedTextures: GameTextures | null = null;
  private static pendingLoad: Promise<GameTextures> | null = null;

  constructor(
    private readonly baseUrl: string = import.meta.env.BASE_URL,
    private readonly timeoutMs: number = DEFAULT_LOAD_TIMEOUT_MS,
  ) {}

  /** Textures already loaded in this page, if any. */
  static get cachedTextures(): GameTextures | null {
    return GameAssetLoader.loadedTextures;
  }

  load(onProgress: (progress: number) => void = () => undefined): Promise<GameTextures> {
    if (GameAssetLoader.loadedTextures) {
      onProgress(1);
      return Promise.resolve(GameAssetLoader.loadedTextures);
    }
    GameAssetLoader.pendingLoad ??= this.loadBundle(onProgress).finally(() => {
      GameAssetLoader.pendingLoad = null;
    });
    return GameAssetLoader.pendingLoad;
  }

  private async loadBundle(onProgress: (progress: number) => void): Promise<GameTextures> {
    if (!GameAssetLoader.bundleRegistered) {
      const bundle = createGameBundle(this.baseUrl, pickAtlasResolution(window.devicePixelRatio));
      Assets.addBundle(GAME_BUNDLE, bundle.assets);
      GameAssetLoader.bundleRegistered = true;
    }
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new AssetLoadError('Loading the game assets took too long.', 'timeout'));
      }, this.timeoutMs);
    });
    try {
      const assets = (await Promise.race([Assets.loadBundle(GAME_BUNDLE, onProgress), timeout])) as Record<
        string,
        Spritesheet | Texture | undefined
      >;
      const { ships, tiles, ui, water } = assets;
      if (!isSpritesheet(ships) || !isSpritesheet(tiles) || !isSpritesheet(ui) || !(water instanceof Texture)) {
        throw new AssetLoadError('Some game assets are missing.', 'network');
      }
      GameAssetLoader.loadedTextures = new GameTextures(ships, tiles, ui, water);
      return GameAssetLoader.loadedTextures;
    } catch (error) {
      await Assets.unloadBundle(GAME_BUNDLE).catch(() => undefined);
      if (error instanceof AssetLoadError) throw error;
      throw new AssetLoadError('The game assets could not be downloaded.', 'network', { cause: error });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
