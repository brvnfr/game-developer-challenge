import { act, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from '@/game/config/defaults';
import type { GameTextures } from '@/game/render/assets/GameTextures';
import { readTestMode } from '@/testing/testMode';

const lifecycle = vi.hoisted(() => ({ created: 0, disposed: 0, live: new Set<object>() }));

vi.mock('@/game/runtime/GameRuntime', async () => {
  const { ExternalStore } = await import('@/game/bridge/ExternalStore');
  const { InputState } = await import('@/game/input/InputState');
  class FakeGameRuntime {
    readonly input = new InputState();
    readonly store = new ExternalStore({
      status: 'running',
      pauseReason: null,
      score: 0,
      health: 100,
      maxHealth: 100,
      remainingSeconds: 120,
      durationSeconds: 120,
      enemiesAlive: 0,
      endReason: null,
      result: null,
    });
    constructor() {
      lifecycle.created++;
      lifecycle.live.add(this);
    }
    mount(): Promise<void> {
      return Promise.resolve();
    }
    dispose(): void {
      lifecycle.disposed++;
      lifecycle.live.delete(this);
    }
    readonly pause = vi.fn();
    readonly resume = vi.fn();
    readonly restart = vi.fn();
  }
  return { GameRuntime: FakeGameRuntime };
});

const { GameStage } = await import('./GameStage');

describe('GameStage lifecycle', () => {
  it('keeps exactly one live runtime under Strict Mode and disposes it on unmount', async () => {
    const view = render(
      <StrictMode>
        <GameStage
          textures={{} as GameTextures}
          settings={DEFAULT_USER_SETTINGS}
          testMode={readTestMode('')}
          showTouchControls={false}
          onMatchEnded={vi.fn()}
          onExitToMenu={vi.fn()}
        />
      </StrictMode>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(lifecycle.created).toBe(2); // Strict Mode mounts, unmounts and mounts again
    expect(lifecycle.disposed).toBe(1);
    expect(lifecycle.live.size).toBe(1);

    view.unmount();
    expect(lifecycle.live.size).toBe(0);
    expect(lifecycle.disposed).toBe(2);
  });
});
