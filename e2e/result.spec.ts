import { expect, test } from './fixtures/test';
import { GamePage, STORAGE_KEYS } from './support/GamePage';

async function sinkIdlePlayer(game: GamePage): Promise<void> {
  await game.startMatch();
  await game.advanceUntilEnded(180_000);
  await game.advance(2_000);
  await game.waitForResult('Your ship sank');
}

async function storedResultId(game: GamePage): Promise<string | null> {
  return game.page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as { matchId: string }).matchId;
  }, STORAGE_KEYS.lastResult);
}

test.describe('result persistence', () => {
  test('the result screen survives a refresh and the last battle shows on the menu', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 3, sessionSeconds: 180, spawnSeconds: 10 });
    await sinkIdlePlayer(game);
    const time = await page.getByTestId('result-time').textContent();

    await game.reload();
    await game.waitForResult('Your ship sank');
    await expect(page.getByTestId('result-score')).toHaveText('0');
    await expect(page.getByTestId('result-time')).toHaveText(time ?? '');

    await page.getByRole('button', { name: 'Main Menu' }).click();
    await expect(page.getByTestId('last-battle')).toHaveText(`Last battle: 0 points · ${time} · Ship destroyed`);
    await game.reload();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    await expect(page.getByTestId('last-battle')).toContainText('Ship destroyed');
  });

  test('an abandoned match is never recorded: leaving or refreshing keeps the previous result', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 3, sessionSeconds: 180, spawnSeconds: 10 });
    await sinkIdlePlayer(game);
    const firstResultId = await storedResultId(game);
    expect(firstResultId).not.toBeNull();

    await page.getByRole('button', { name: 'Play Again' }).click();
    await game.waitForMatch();
    await game.advance(5_000);
    await page.keyboard.press('Escape');
    await game.pauseDialog().getByRole('button', { name: 'Main Menu' }).click();
    expect(await storedResultId(game)).toBe(firstResultId);

    await game.startMatch();
    await game.advance(5_000);
    await game.reload();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    expect(await game.liveRuntimes()).toBe(0);
    expect(await storedResultId(game)).toBe(firstResultId);
  });
});
