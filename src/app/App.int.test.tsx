import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { MatchResult } from '@/game/sim/match/types';
import { createTestMockServer, TEST_API_BASE_URL } from '@/mocks/node';
import { createQueryClient } from '@/remote/queryClient';
import { createRemoteServices, type RemoteServices } from '@/remote/RemoteServices';
import { MemoryStorage } from '@/storage/LocalStore';
import { App } from './App';
import { createMemoryServices } from './AppServices';

const FINISHED_MATCH: MatchResult = {
  matchId: 'match-1',
  score: 70,
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
    overlays,
    onMatchEnded,
    onExitToMenu,
  }: {
    settings: { sessionTimeSeconds: number; spawnIntervalSeconds: number };
    overlays: { aimLanes: boolean; hitboxes: boolean };
    onMatchEnded: (result: MatchResult) => void;
    onExitToMenu: () => void;
  }) => (
    <main aria-label="Pirate Battle match">
      <p data-testid="match-settings">
        {settings.sessionTimeSeconds}/{settings.spawnIntervalSeconds}
      </p>
      <p data-testid="match-overlays">
        aim lanes {String(overlays.aimLanes)}, hitboxes {String(overlays.hitboxes)}
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

const { mockServer, network } = createTestMockServer();
const openClients: RemoteServices[] = [];

beforeAll(() => network.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  for (const remote of openClients.splice(0)) remote.queryClient.clear();
  mockServer.resetAll();
  mockServer.scenarios.select({ baseLatencyMs: 0 });
});
afterAll(() => network.close());

function renderApp(persistent = new MemoryStorage(), perTab = new MemoryStorage()) {
  const remote = createRemoteServices({
    baseUrl: TEST_API_BASE_URL,
    timeoutMs: 1_000,
    storage: persistent,
    mockServer,
    queryClient: createQueryClient({ retryDelay: () => 10 }),
    roundDelaysMs: [50],
  });
  openClients.push(remote);
  const view = render(<App services={createMemoryServices(remote, persistent, perTab)} />);
  return { ...view, persistent, perTab, remote, user: userEvent.setup() };
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

  it('opens the control instructions in a dialog from the Controls button (small screens) and returns focus', async () => {
    const { user } = renderApp();
    const opener = screen.getByRole('button', { name: 'Controls' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Controls' });
    expect(within(dialog).getByText('Fire front cannon')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Controls' })).toBeNull();
    expect(opener).toHaveFocus();
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
    expect(screen.getByTestId('result-score')).toHaveTextContent('70');
    expect(screen.getByTestId('result-time')).toHaveTextContent('2:00');
    expect(screen.getByTestId('result-reason')).toHaveTextContent('Time up');

    unmount();
    const refreshed = renderApp(persistent, perTab);
    expect(screen.getByTestId('result-score')).toHaveTextContent('70');
    await refreshed.user.click(screen.getByRole('button', { name: 'Main Menu' }));
    expect(screen.getByTestId('last-battle')).toHaveTextContent('70 points · 2:00 · Time up');
  });

  it('a refresh during a match goes back to the menu', async () => {
    const { user, persistent, perTab, unmount } = renderApp();
    await nameCaptainAndPlay(user);
    unmount();
    renderApp(persistent, perTab);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });
});

describe('Developer tools', () => {
  it('stay out of the way: only a small gear button on the menu, network scenarios inside, every overlay off', async () => {
    const { user } = renderApp();
    expect(screen.getByRole('button', { name: 'Developer tools' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Network scenarios' })).toBeNull();
    await nameCaptainAndPlay(user);
    expect(screen.getByTestId('match-overlays')).toHaveTextContent('aim lanes false, hitboxes false');
  });

  it('switch overlays on for the next match and remember them after a refresh', async () => {
    const { user, persistent, unmount } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Developer tools' }));
    const dialog = screen.getByRole('dialog', { name: 'Developer tools' });
    expect(within(dialog).getByRole('checkbox', { name: 'Aim lanes' })).toHaveFocus();
    await user.click(within(dialog).getByRole('checkbox', { name: 'Aim lanes' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Hitboxes' }));
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await nameCaptainAndPlay(user);
    expect(screen.getByTestId('match-overlays')).toHaveTextContent('aim lanes true, hitboxes true');

    unmount();
    const refreshed = renderApp(persistent);
    await refreshed.user.click(screen.getByRole('button', { name: 'Developer tools' }));
    expect(screen.getByRole('checkbox', { name: 'Aim lanes' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Hitboxes' })).toBeChecked();
  });

  it('opens the network scenarios from the developer tools and returns to them', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Developer tools' }));
    await user.click(screen.getByRole('button', { name: 'Network scenarios' }));
    const network = screen.getByRole('dialog', { name: 'Network scenarios' });
    await user.click(within(network).getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('dialog', { name: 'Developer tools' })).toBeVisible();
  });

  it('"Turn overlays off" switches every overlay off', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Developer tools' }));
    await user.click(screen.getByRole('checkbox', { name: 'Aim lanes' }));
    await user.click(screen.getByRole('button', { name: 'Turn overlays off' }));
    expect(screen.getByRole('checkbox', { name: 'Aim lanes' })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await nameCaptainAndPlay(user);
    expect(screen.getByTestId('match-overlays')).toHaveTextContent('aim lanes false, hitboxes false');
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

describe("Captain's Log", () => {
  it('opens on the chosen tab, lists the ranking of the current settings and switches tabs with the keyboard', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Ranking' }));
    expect(screen.getByRole('heading', { name: "Captain's Log" })).toHaveFocus();
    const rankingTab = screen.getByRole('tab', { name: 'Ranking' });
    expect(rankingTab).toHaveAttribute('aria-selected', 'true');
    const table = await screen.findByRole('table', { name: /Ranking for 120 second battles/ });
    expect(within(table).getAllByRole('row')).toHaveLength(6); // header + 5 entries
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByRole('table', { name: /page 2 of 3/ })).toBeInTheDocument();

    rankingTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Match History' })).toHaveFocus();
    expect(await screen.findByText('No battles recorded yet. Finish a match to start your log.')).toBeInTheDocument();
  });

  it('a completed match is saved and appears in Match History and the ranking, marked as yours', async () => {
    const { user } = renderApp();
    await nameCaptainAndPlay(user);
    await user.click(screen.getByRole('button', { name: 'Finish match' }));
    await waitFor(() => expect(screen.getByTestId('registration')).toHaveAttribute('data-state', 'saved'));

    await user.click(screen.getByRole('button', { name: 'Main Menu' }));
    await user.click(screen.getByRole('button', { name: 'Match History' }));
    const history = await screen.findByRole('table', { name: /Match history of Anne Bonny/ });
    expect(within(history).getAllByRole('row')).toHaveLength(2);
    expect(within(history).getByText('Time up')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Ranking' }));
    expect(await screen.findByText('You')).toBeInTheDocument();
  });

  it('shows an accessible error with Retry when the ranking fails, and recovers', async () => {
    mockServer.scenarios.select({ scenarioId: 'ranking-fail' });
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Ranking' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load the ranking.');
    mockServer.scenarios.select({ scenarioId: 'success' });
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('table', { name: /Ranking for/ })).toBeInTheDocument();
  });

  it('keeps a match pending while the server is down, without blocking a new match', async () => {
    mockServer.scenarios.select({ scenarioId: 'network-error' });
    const { user } = renderApp();
    await nameCaptainAndPlay(user);
    await user.click(screen.getByRole('button', { name: 'Finish match' }));
    await waitFor(() => expect(screen.getByTestId('registration')).toHaveAttribute('data-state', 'retrying'));
    expect(screen.getByTestId('registration')).toHaveTextContent('Could not reach the server');
    await user.click(screen.getByRole('button', { name: 'Play Again' }));
    expect(screen.getByRole('main', { name: 'Pirate Battle match' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abandon match' }));
    expect(screen.getByTestId('pending-count')).toHaveTextContent('1 battle is waiting to be saved.');

    await user.click(screen.getByRole('button', { name: 'Match History' }));
    const pending = await screen.findByTestId('pending-submissions');
    expect(pending).toHaveTextContent('70 points · Time up — Could not reach the server');
    mockServer.scenarios.select({ scenarioId: 'success' });
    await user.click(within(pending).getByRole('button', { name: 'Retry now' }));
    await waitFor(() => expect(screen.queryByTestId('pending-submissions')).not.toBeInTheDocument());
    expect(await screen.findByRole('table', { name: /Match history/ })).toBeInTheDocument();
  });
});
