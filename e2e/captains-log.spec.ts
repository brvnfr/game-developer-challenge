import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

/** Failure scenarios make the browser log the failed requests; that is expected here. */
const FAILED_REQUESTS = { patterns: [/Failed to load resource/] };

test.describe("Captain's Log: queries and pagination (E2E-10)", () => {
  test('shows the loading state, then the ranking of the current settings, best first', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ scenario: 'slow' });
    await game.openCaptainsLog('Ranking');
    await expect(game.rankingList()).toHaveAttribute('data-state', 'loading');
    await expect(game.rankingList()).toHaveAttribute('aria-busy', 'true');
    await expect(game.rankingList().getByRole('status')).toHaveText('Loading the ranking…');

    await expect(game.rankingList()).toHaveAttribute('data-state', 'ready', { timeout: 10_000 });
    const table = page.getByRole('table', { name: /Ranking for 120 second battles · 3 second spawn interval/ });
    await expect(table.getByRole('row')).toHaveCount(6);
    await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();
    const points = (await table.locator('.log-table__points').allTextContents()).map(Number);
    expect([...points].sort((first, second) => second - first)).toEqual(points);
  });

  test('pages through the ranking and filters it by battle settings', async ({ page }) => {
    const game = new GamePage(page);
    await game.open();
    await game.openCaptainsLog('Ranking');
    const ranks = () => page.locator('.log-table__rank').allTextContents();
    await expect.poll(ranks).toEqual(['01', '02', '03', '04', '05']);

    await page.getByRole('button', { name: 'Next page' }).click();
    await expect.poll(ranks).toEqual(['06', '07', '08', '09', '10']);
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect.poll(ranks).toEqual(['11', '12', '13']);
    await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
    await page.getByRole('button', { name: 'Previous page' }).click();
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();

    await page.getByLabel('Battle settings').selectOption({ label: '60 second battles · 3 second spawn interval' });
    await expect(page.getByRole('table', { name: /Ranking for 60 second battles/ })).toBeVisible();
    await expect.poll(ranks).toEqual(['01', '02', '03', '04', '05']);
    await expect(page.getByText('Page 1 of 2', { exact: true })).toBeVisible();
  });

  test('empty lists say so on both tabs', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ scenario: 'empty' });
    await game.openCaptainsLog('Ranking');
    await expect(game.rankingList()).toHaveAttribute('data-state', 'empty');
    await expect(page.getByText('No battles with these settings yet.')).toBeVisible();
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(game.historyList()).toHaveAttribute('data-state', 'empty');
    await expect(page.getByText('No battles recorded yet.')).toBeVisible();
  });

  test('Match History pages through many battles, newest first', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ scenario: 'many-pages' });
    await game.openCaptainsLog('Match History');
    await expect(page.getByRole('tab', { name: 'Match History' })).toHaveAttribute('aria-selected', 'true');
    await expect(game.historyList()).toHaveAttribute('data-state', 'ready');
    await expect(page.getByText('Page 1 of 5', { exact: true })).toBeVisible();
    const firstDate = await page.locator('.log-table time').first().getAttribute('datetime');
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText('Page 2 of 5', { exact: true })).toBeVisible();
    await expect(game.historyList()).not.toHaveAttribute('aria-busy', 'true');
    const secondPageDate = await page.locator('.log-table time').first().getAttribute('datetime');
    expect(Date.parse(secondPageDate ?? '')).toBeLessThan(Date.parse(firstDate ?? ''));
  });

  test.describe('errors', () => {
    test.use({ allowConsoleErrors: FAILED_REQUESTS });

    test('a failing ranking shows an accessible error with Retry, while history still works', async ({ page }) => {
      const game = new GamePage(page);
      await game.open({ scenario: 'ranking-fail' });
      await game.openCaptainsLog('Ranking');
      const alert = game.rankingList().getByRole('alert');
      await expect(alert).toContainText('Could not load the ranking. The server is having trouble (error 500).');
      await expect(game.rankingList()).toHaveAttribute('data-state', 'error');

      await page.getByRole('tab', { name: 'Match History' }).click();
      await expect(game.historyList()).toHaveAttribute('data-state', 'empty');

      await page.getByRole('button', { name: 'Main Menu' }).click();
      await game.selectNetworkScenario('Success');
      await game.openCaptainsLog('Ranking');
      await expect(game.rankingList()).toHaveAttribute('data-state', 'ready');
    });

    test('Retry reloads a failed Match History', async ({ page }) => {
      const game = new GamePage(page);
      await game.open({ scenario: 'history-fail' });
      await game.openCaptainsLog('Match History');
      const retry = game.historyList().getByRole('button', { name: 'Retry' });
      await expect(retry).toBeVisible();
      await page.getByRole('button', { name: 'Main Menu' }).click();
      await game.selectNetworkScenario('Success');
      await game.openCaptainsLog('Match History');
      await expect(game.historyList()).toHaveAttribute('data-state', 'empty');
    });

    test('the game stays playable when the API is down', async ({ page }) => {
      const game = new GamePage(page);
      await game.open({ scenario: 'network-error', seed: 3, spawnSeconds: 10 });
      await game.openCaptainsLog('Ranking');
      await expect(game.rankingList()).toHaveAttribute('data-state', 'error');
      await page.getByRole('button', { name: 'Main Menu' }).click();
      await page.getByRole('button', { name: 'Options' }).click();
      await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible();
      await page.getByRole('button', { name: 'Main Menu' }).click();
      await game.startMatch();
      await game.advance(3_000);
      expect((await game.state()).status).toBe('running');
    });
  });
});
