import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

const FAILED_REQUESTS = { patterns: [/Failed to load resource/] };

test.describe('match registration (E2E-11)', () => {
  test('a completed match is saved once and appears in Match History and the ranking', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 3, sessionSeconds: 60, spawnSeconds: 10, captainName: 'Anne Bonny' });
    await game.playUntilSunk();
    await expect(game.registration()).toHaveAttribute('data-state', 'saved');
    await expect(game.registration()).toHaveText("Saved to the Captain's Log.");
    const matchId = await game.lastResultId();

    await page.getByRole('button', { name: 'Main Menu' }).click();
    await game.openCaptainsLog('Match History');
    const history = page.getByRole('table', { name: /Match history of Anne Bonny/ });
    await expect(history.getByRole('row')).toHaveCount(2);
    await expect(history.getByRole('cell', { name: 'Ship destroyed' })).toBeVisible();

    await page.getByRole('tab', { name: 'Ranking' }).click();
    const ranking = page.getByRole('table', { name: /Ranking for 60 second battles · 10 second spawn interval/ });
    await expect(ranking.getByRole('row')).toHaveCount(2); // only matches with the same settings
    await expect(ranking.getByText('You')).toBeVisible();
    expect(await game.storedCopiesOf(matchId)).toBe(1);
  });

  test.describe('server unavailable', () => {
    test.use({ allowConsoleErrors: FAILED_REQUESTS });

    test('the match stays pending across a refresh and is saved after the server recovers', async ({ page }) => {
      const game = new GamePage(page);
      await game.open({ scenario: 'network-error', seed: 3, sessionSeconds: 60, spawnSeconds: 10 });
      await game.playUntilSunk();
      await expect(game.registration()).toHaveAttribute('data-state', 'retrying');
      await expect(game.registration()).toContainText('Not saved yet: Could not reach the server.');
      const matchId = await game.lastResultId();

      // A new match can start while the old one is pending.
      await page.getByRole('button', { name: 'Play Again' }).click();
      await game.waitForMatch();
      await page.keyboard.press('Escape');
      await game.pauseDialog().getByRole('button', { name: 'Main Menu' }).click();
      await expect(page.getByTestId('pending-count')).toHaveText('1 battle is waiting to be saved.');

      // The URL keeps the scenario, so the server is still down after the refresh.
      await game.reload();
      await expect(page.getByTestId('pending-count')).toHaveText('1 battle is waiting to be saved.');
      await game.openCaptainsLog('Match History');
      await expect(page.getByTestId('pending-submissions')).toContainText('0 points · Ship destroyed');

      await page.getByRole('button', { name: 'Main Menu' }).click();
      await game.selectNetworkScenario('Success'); // the server is back: pending matches are sent again
      await expect(page.getByTestId('pending-count')).toBeHidden({ timeout: 10_000 });
      await game.openCaptainsLog('Match History');
      await expect(game.historyList()).toHaveAttribute('data-state', 'ready');
      await expect(page.getByTestId('pending-submissions')).toBeHidden();
      expect(await game.storedCopiesOf(matchId)).toBe(1);
    });

    test('both tabs update by themselves when a pending match is finally saved', async ({ page }) => {
      const game = new GamePage(page);
      await game.open({ scenario: 'unavailable-then-recover', seed: 3, sessionSeconds: 60, spawnSeconds: 10 });
      await game.playUntilSunk();
      await page.getByRole('button', { name: 'Main Menu' }).click();
      await game.openCaptainsLog('Match History');
      // The first requests fail; the registrar retries the save in the background and the list follows.
      await expect(page.getByRole('table', { name: /Match history/ }).getByRole('row')).toHaveCount(2, {
        timeout: 20_000,
      });
      await expect(page.getByTestId('pending-submissions')).toBeHidden();
      // The ranking's own first three requests fail too: its error offers Retry, which then works.
      await page.getByRole('tab', { name: 'Ranking' }).click();
      await game.rankingList().getByRole('button', { name: 'Retry' }).click();
      await expect(page.getByRole('table', { name: /Ranking for 60 second battles/ }).getByText('You')).toBeVisible();
    });
  });
});
