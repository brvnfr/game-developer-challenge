import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { MatchResult } from '@/game/sim/match/types';
import { MemoryStorage } from '@/storage/LocalStore';
import { App } from './App';
import { createMemoryServices } from './AppServices';

const FINISHED_MATCH: MatchResult = {
  matchId: 'match-1',
  score: 7,
  durationMs: 120_000,
  endReason: 'timeUp',
  endedAt: '2026-10-13T12:00:00.000Z',
  settings: { sessionTimeSeconds: 120, spawnIntervalSeconds: 3 },
  seed: 1,
};

// The real game screen needs WebGL; here a stand-in reports the settings it received and can end the match.
vi.mock('@/screens/Game/GameScreen', () => ({
  GameScreen: ({
    settings,
    onMatchEnded,
    onExitToMenu,
  }: {
    settings: { sessionTimeSeconds: number; spawnIntervalSeconds: number };
    onMatchEnded: (result: MatchResult) => void;
    onExitToMenu: () => void;
  }) => (
    <main aria-label="Pirate Battle match">
      <p data-testid="match-settings">
        {settings.sessionTimeSeconds}/{settings.spawnIntervalSeconds}
      </p>
      <button type="button" onClick={() => onMatchEnded(FINISHED_MATCH)}>
        Finish match
      </button>
      <button type="button" onClick={onExitToMenu}>
        Abandon match
      </button>
    </main>
  ),
}));

function renderApp(persistent = new MemoryStorage(), perTab = new MemoryStorage()) {
  const view = render(<App services={createMemoryServices(persistent, perTab)} />);
  return { ...view, persistent, perTab, user: userEvent.setup() };
}

async function nameCaptainAndPlay(user: ReturnType<typeof userEvent.setup>, name = 'Anne Bonny') {
  await user.click(screen.getByRole('button', { name: 'Play' }));
  const dialog = screen.getByRole('dialog', { name: 'Name your captain' });
  const field = within(dialog).getByLabelText('Captain name');
  await user.clear(field);
  await user.type(field, name);
  await user.click(within(dialog).getByRole('button', { name: 'Set sail' }));
}

describe('App screen flow', () => {
  it('opens on the main menu with Play, Options and the control instructions', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Pirate Battle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Options' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'How to play' })).toBeInTheDocument();
  });

  it('asks for a captain name on the first Play only', async () => {
    const { user } = renderApp();
    await nameCaptainAndPlay(user);
    expect(screen.getByRole('main', { name: 'Pirate Battle match' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abandon match' }));
    expect(screen.getByTestId('captain-name')).toHaveTextContent('Anne Bonny');
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Pirate Battle match' })).toBeInTheDocument();
  });

  it('keeps the name dialog open with an accessible error for an invalid name, and Escape cancels it', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Play' }));
    const field = screen.getByLabelText('Captain name');
    expect(field).toHaveFocus();
    await user.clear(field);
    await user.click(screen.getByRole('button', { name: 'Set sail' }));
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Captain name is required.');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
  });

  it('abandoning a match records nothing', async () => {
    const { user, persistent } = renderApp();
    await nameCaptainAndPlay(user);
    await user.click(screen.getByRole('button', { name: 'Abandon match' }));
    expect(persistent.getItem('pirate-battle.last-result.v1')).toBeNull();
    expect(screen.queryByTestId('last-battle')).not.toBeInTheDocument();
  });

  it('shows and persists the result of a completed match, also after a refresh', async () => {
    const { user, persistent, perTab, unmount } = renderApp();
    await nameCaptainAndPlay(user);
    await user.click(screen.getByRole('button', { name: 'Finish match' }));
    expect(screen.getByRole('heading', { name: 'Battle complete' })).toBeInTheDocument();
    expect(screen.getByTestId('result-score')).toHaveTextContent('7');
    expect(screen.getByTestId('result-time')).toHaveTextContent('2:00');
    expect(screen.getByTestId('result-reason')).toHaveTextContent('Time up');

    unmount();
    const refreshed = renderApp(persistent, perTab);
    expect(screen.getByTestId('result-score')).toHaveTextContent('7');
    await refreshed.user.click(screen.getByRole('button', { name: 'Main Menu' }));
    expect(screen.getByTestId('last-battle')).toHaveTextContent('7 points · 2:00 · Time up');
  });

  it('a refresh during a match goes back to the menu', async () => {
    const { user, persistent, perTab, unmount } = renderApp();
    await nameCaptainAndPlay(user);
    unmount();
    renderApp(persistent, perTab);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });
});

describe('Options', () => {
  it('steps, saves and restores the options, and new matches use them', async () => {
    const { user, persistent, unmount } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Options' }));
    expect(screen.getByLabelText('Game session time')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Decrease Enemy spawn time' }));
    const sessionField = screen.getByLabelText('Game session time');
    await user.clear(sessionField);
    await user.type(sessionField, '90');
    expect(screen.getByRole('status')).toHaveTextContent('You have unsaved changes.');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('status')).toHaveTextContent('Options saved.');

    unmount();
    const refreshed = renderApp(persistent);
    await refreshed.user.click(screen.getByRole('button', { name: 'Options' }));
    expect(screen.getByLabelText('Game session time')).toHaveValue('90');
    expect(screen.getByLabelText('Enemy spawn time')).toHaveValue('2.5');
    await refreshed.user.click(screen.getByRole('button', { name: 'Main Menu' }));
    // Saving in Options also confirms the captain name, so Play starts right away.
    await refreshed.user.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByTestId('match-settings')).toHaveTextContent('90/2.5');
  });

  it('rejects out-of-range values with an accessible message and keeps the saved options', async () => {
    const { user, persistent } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Options' }));
    const sessionField = screen.getByLabelText('Game session time');
    await user.clear(sessionField);
    await user.type(sessionField, '200');
    expect(sessionField).toHaveAttribute('aria-invalid', 'true');
    expect(sessionField).toHaveAccessibleDescription(/must be between 60 and 180 seconds/);

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('status')).toHaveTextContent('Fix the highlighted fields before saving.');
    expect(sessionField).toHaveFocus();
    expect(persistent.getItem('pirate-battle.settings.v1')).toBeNull();
  });

  it('disables the stepper buttons at the limits and resets to the defaults', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Options' }));
    const spawnField = screen.getByLabelText('Enemy spawn time');
    await user.clear(spawnField);
    await user.type(spawnField, '10');
    expect(screen.getByRole('button', { name: 'Increase Enemy spawn time' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Reset defaults' }));
    expect(spawnField).toHaveValue('3');
  });

  it('renames the captain from Options', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Options' }));
    const nameField = screen.getByLabelText('Captain name');
    await user.clear(nameField);
    await user.type(nameField, 'Grace O Malley');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Main Menu' }));
    expect(screen.getByTestId('captain-name')).toHaveTextContent('Grace O Malley');
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
