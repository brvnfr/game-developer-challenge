import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExternalStore } from '@/game/bridge/ExternalStore';
import type { MatchView } from '@/game/bridge/MatchView';
import { Hud } from './Hud';

const initialView: MatchView = {
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
};

describe('Hud', () => {
  it('re-renders only when a displayed value changes, not on every frame', () => {
    const store = new ExternalStore(initialView);
    const onRender = vi.fn();
    render(<Hud store={store} onPause={vi.fn()} onRender={onRender} />);
    const rendersAfterMount = onRender.mock.calls.length;

    act(() => {
      for (let frame = 0; frame < 300; frame++) store.publish({ ...initialView });
    });
    expect(onRender.mock.calls.length).toBe(rendersAfterMount);

    act(() => {
      store.publish({ ...initialView, remainingSeconds: 119 });
    });
    expect(onRender.mock.calls.length).toBe(rendersAfterMount + 1);
    expect(screen.getByTestId('hud-time')).toHaveTextContent('1:59');
  });

  it('exposes score, time and status to assistive technology and announces changes politely', () => {
    const store = new ExternalStore(initialView);
    render(<Hud store={store} onPause={vi.fn()} />);
    const summary = screen.getByRole('region', { name: 'Match status' });
    expect(summary).toHaveTextContent('2 minutes');
    act(() => {
      store.publish({ ...initialView, status: 'paused', pauseReason: 'manual' });
    });
    expect(screen.getByRole('status')).toHaveTextContent('Match paused.');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeDisabled();
  });

  it('calls onPause from the pause button', () => {
    const store = new ExternalStore(initialView);
    const onPause = vi.fn();
    render(<Hud store={store} onPause={onPause} />);
    screen.getByRole('button', { name: 'Pause' }).click();
    expect(onPause).toHaveBeenCalledOnce();
  });
});
