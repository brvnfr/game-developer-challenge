import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

test.describe('options', () => {
  test('values are validated, saved, kept after a refresh and used by the next match', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 3 }); // no session/spawn in the URL: the match uses the saved options
    await page.getByRole('button', { name: 'Options' }).click();
    await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible();

    const sessionField = page.getByRole('textbox', { name: 'Game session time' });
    const spawnField = page.getByRole('textbox', { name: 'Enemy spawn time' });
    await expect(sessionField).toHaveValue('120');
    await expect(spawnField).toHaveValue('3');

    await sessionField.fill('59');
    await expect(sessionField).toHaveAttribute('aria-invalid', 'true');
    await expect(sessionField).toHaveAccessibleDescription(/must be between 60 and 180 seconds/);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Fix the highlighted fields before saving.');
    await expect(sessionField).toBeFocused();

    await sessionField.fill('90');
    await expect(sessionField).toHaveAttribute('aria-invalid', 'false');
    await page.getByRole('button', { name: 'Decrease Enemy spawn time' }).click();
    await page.getByRole('button', { name: 'Decrease Enemy spawn time' }).click();
    await expect(spawnField).toHaveValue('2');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Options saved. They apply from your next match.');

    await game.reload();
    await page.getByRole('button', { name: 'Options' }).click();
    await expect(sessionField).toHaveValue('90');
    await expect(spawnField).toHaveValue('2');

    await page.getByRole('button', { name: 'Main Menu' }).click();
    await game.startMatch();
    await expect(game.hudTime()).toHaveText('1:30');
    expect((await game.state()).remainingSeconds).toBe(90);
  });

  test('the spawn interval is positive and follows its documented steps', async ({ page }) => {
    const game = new GamePage(page);
    await game.open();
    await page.getByRole('button', { name: 'Options' }).click();
    const spawnField = page.getByRole('textbox', { name: 'Enemy spawn time' });

    await spawnField.fill('0');
    await expect(spawnField).toHaveAccessibleDescription(/must be between 1 and 10 seconds/);
    await spawnField.fill('2.3');
    await expect(spawnField).toHaveAccessibleDescription(/must be a multiple of 0.5 seconds/);
    await spawnField.fill('abc');
    await expect(spawnField).toHaveAccessibleDescription(/must be a number/);

    await spawnField.fill('9.5');
    await spawnField.press('ArrowUp');
    await expect(spawnField).toHaveValue('10');
    await expect(page.getByRole('button', { name: 'Increase Enemy spawn time' })).toBeDisabled();
    await page.getByRole('button', { name: 'Reset defaults' }).click();
    await expect(spawnField).toHaveValue('3');
  });

  test('leaving without saving keeps the previous options', async ({ page }) => {
    const game = new GamePage(page);
    await game.open();
    await page.getByRole('button', { name: 'Options' }).click();
    await page.getByRole('textbox', { name: 'Game session time' }).fill('150');
    await expect(page.getByRole('status')).toHaveText('You have unsaved changes.');
    await page.getByRole('button', { name: 'Main Menu' }).click();
    await page.getByRole('button', { name: 'Options' }).click();
    await expect(page.getByRole('textbox', { name: 'Game session time' })).toHaveValue('120');
  });
});

test.describe('captain name', () => {
  test('the first Play asks for a name; it is kept and editable in Options', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 3, captainName: null });
    await page.getByRole('button', { name: 'Play' }).click();

    const dialog = page.getByRole('dialog', { name: 'Name your captain' });
    const nameField = dialog.getByRole('textbox', { name: 'Captain name' });
    await expect(nameField).toBeFocused();
    await nameField.fill('   ');
    await nameField.press('Enter');
    await expect(nameField).toHaveAccessibleDescription('Captain name is required.');

    await nameField.fill('Anne Bonny');
    await nameField.press('Enter');
    await game.waitForMatch();

    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Main Menu' }).click();
    await expect(page.getByTestId('captain-name')).toHaveText('Anne Bonny');

    await game.reload();
    await expect(page.getByTestId('captain-name')).toHaveText('Anne Bonny');
    await page.getByRole('button', { name: 'Options' }).click();
    await page.getByRole('textbox', { name: 'Captain name' }).fill('Mary Read');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Main Menu' }).click();
    await expect(page.getByTestId('captain-name')).toHaveText('Mary Read');
    await game.startMatch(); // no prompt any more
  });

  test('the name dialog traps focus and Escape cancels it', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ captainName: null });
    const playButton = page.getByRole('button', { name: 'Play' });
    await playButton.click();
    const dialog = page.getByRole('dialog', { name: 'Name your captain' });
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Set sail' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('textbox', { name: 'Captain name' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(playButton).toBeFocused();
    expect(await game.liveRuntimes()).toBe(0);
  });
});
