import { useCallback, useEffect, useState } from 'react';
import { GameAssetLoader } from '@/game/render/assets/GameAssetLoader';
import type { GameTextures } from '@/game/render/assets/GameTextures';

export type GameAssetsState =
  | { readonly status: 'loading'; readonly progress: number }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly textures: GameTextures };

function initialState(): GameAssetsState {
  const cached = GameAssetLoader.cachedTextures;
  return cached ? { status: 'ready', textures: cached } : { status: 'loading', progress: 0 };
}

/** Loads (or reuses) the game textures, exposing progress, errors and a retry action. */
export function useGameAssets(): { readonly state: GameAssetsState; readonly retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<GameAssetsState>(initialState);

  useEffect(() => {
    if (GameAssetLoader.cachedTextures) return;
    let isCurrent = true;
    new GameAssetLoader()
      .load((progress) => {
        if (isCurrent) setState({ status: 'loading', progress });
      })
      .then((textures) => {
        if (isCurrent) setState({ status: 'ready', textures });
      })
      .catch((error: unknown) => {
        if (isCurrent)
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'The game assets could not be loaded.',
          });
      });
    return () => {
      isCurrent = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading', progress: 0 });
    setAttempt((current) => current + 1);
  }, []);
  return { state, retry };
}
