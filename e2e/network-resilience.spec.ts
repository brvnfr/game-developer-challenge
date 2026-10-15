import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

const FAILED_REQUESTS = { patterns: [/Failed to load resource/] };

test.describe('timeouts and late answers (E2E-12)', () => {
  test('a save that timed out after being stored is recovered without a duplicate', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({
      scenario: 'register-timeout-after-commit',
      apiTimeoutMs: 1_500,
      seed: 3,
      sessionSeconds: 60,
      spawnSeconds: 10,
    });
    const saves: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'PUT' && request.url().includes('/api/matches/')) saves.push(request.url());
    });
    await game.playUntilSunk();
    await expect(game.registration()).toHaveAttribute('data-state', 'saved', { timeout: 15_000 });
    expect(saves.length).toBeGreaterThanOrEqual(2); // the first answer never came back
    expect(await game.storedCopiesOf(await game.lastResultId())).toBe(1);

    await page.getByRole('button', { name: 'Main Menu' }).click();
    await game.openCaptainsLog('Match History');
    await expect(page.getByRole('table', { name: /Match history/ }).getByRole('row')).toHaveCount(2);
  });

  test.describe('retry', () => {
    test.use({ allowConsoleErrors: FAILED_REQUESTS });

    test('pressing Retry many times sends one request at a time and stores one record', async ({ page }) => {
      const game = new GamePage(page);
      await game.open({ scenario: 'network-error', seed: 3, sessionSeconds: 60, spawnSeconds: 10 });
      await game.playUntilSunk();
      await expect(game.registration()).toHaveAttribute('data-state', 'retrying');
      const matchId = await game.lastResultId();

      await page.getByRole('button', { name: 'Main Menu' }).click();
      // Saves in flight at the same moment: a background retry may also run while the scenario changes, but
      // never two at once (and the server ends with one record).
      let inFlight = 0;
      let mostInFlight = 0;
      let saves = 0;
      const settle = (request: { method: () => string }) => {
        if (request.method() === 'PUT') inFlight--;
      };
      page.on('request', (request) => {
        if (request.method() !== 'PUT') return;
        saves++;
        inFlight++;
        mostInFlight = Math.max(mostInFlight, inFlight);
      });
      page.on('requestfinished', settle);
      page.on('requestfailed', settle);
      await game.selectNetworkScenario('Slow network'); // Apply resends at once; the answer takes ~2.5 s
      await game.openCaptainsLog('Match History');
      const retry = page.getByTestId('pending-submissions').getByRole('button', { name: 'Retry now' });
      for (let press = 0; press < 5; press++) await retry.click({ timeout: 2_000 }).catch(() => undefined);

      await expect(page.getByTestId('pending-submissions')).toBeHidden({ timeout: 10_000 });
      expect(saves).toBeGreaterThanOrEqual(1);
      expect(mostInFlight).toBe(1);
      expect(await game.storedCopiesOf(matchId)).toBe(1);
    });
  });

  test('a late answer for an older page never replaces the page on screen', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ scenario: 'out-of-order' }); // odd requests take 2 s, even ones 0.15 s
    await game.openCaptainsLog('Ranking');
    const ranks = () => page.locator('.log-table__rank').allTextContents();
    await expect.poll(ranks, { timeout: 5_000 }).toEqual(['01', '02', '03', '04', '05']); // request 1 (slow)

    await page.getByRole('button', { name: 'Next page' }).click(); // request 2 (fast)
    await expect.poll(ranks).toEqual(['06', '07', '08', '09', '10']);
    await page.getByRole('button', { name: 'Next page' }).click(); // request 3 (slow) for page 3…
    await page.getByRole('button', { name: 'Previous page' }).click(); // …but the player goes back at once
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
    await page.waitForTimeout(2_500); // page 3's answer would have arrived by now
    expect(await ranks()).toEqual(['06', '07', '08', '09', '10']);
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
  });

  test('switching pages quickly ends on the last page asked for', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ scenario: 'out-of-order' });
    await game.openCaptainsLog('Ranking');
    const ranks = () => page.locator('.log-table__rank').allTextContents();
    await expect.poll(ranks, { timeout: 5_000 }).toHaveLength(5);
    await page.getByRole('button', { name: 'Next page' }).click();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText('Page 3 of 3', { exact: true })).toBeVisible();
    await expect.poll(ranks, { timeout: 5_000 }).toEqual(['11', '12', '13']);
    await page.waitForTimeout(2_500);
    expect(await ranks()).toEqual(['11', '12', '13']);
  });
});
