import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/test';
import { GamePage } from './support/GamePage';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoViolations(page: Page): Promise<void> {
  // The canvas is decorative for assistive tech (aria-hidden); the HUD exposes the match state semantically.
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).exclude('canvas').analyze();
  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}

test.describe('accessibility audit (T-046)', () => {
  test('menu, name dialog and options have no WCAG A/AA violations', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ captainName: null });
    await expectNoViolations(page);

    // Small screens show the instructions in a Controls dialog.
    const controlsButton = page.getByRole('button', { name: 'Controls' });
    if (await controlsButton.isVisible()) {
      await controlsButton.click();
      await expect(page.getByRole('dialog', { name: 'Controls' })).toBeVisible();
      await expectNoViolations(page);
      await page.keyboard.press('Escape');
    }

    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('dialog', { name: 'Name your captain' })).toBeVisible();
    await expectNoViolations(page);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Options' }).click();
    await page.getByRole('textbox', { name: 'Game session time' }).fill('500');
    await expectNoViolations(page);
  });

  test('match HUD, pause dialog and result screen have no WCAG A/AA violations', async ({ page }) => {
    const game = new GamePage(page);
    await game.open({ seed: 3, sessionSeconds: 180, spawnSeconds: 10 });
    await game.startMatch();
    await expectNoViolations(page);

    await page.keyboard.press('Escape');
    await expect(game.pauseDialog()).toBeVisible();
    await expectNoViolations(page);
    await game.pauseDialog().getByRole('button', { name: 'Resume' }).click();

    await game.advanceUntilEnded(180_000);
    await game.advance(2_000);
    await game.waitForResult('Your ship sank');
    await expectNoViolations(page);
  });

  test('menus can be used with the keyboard alone, with a visible focus ring', async ({ page }) => {
    const game = new GamePage(page);
    await game.open();
    const playButton = page.getByRole('button', { name: 'Play' });
    await expect(playButton).toBeFocused();
    // Focus moved by the app (not by the player) shows no ring until the keyboard is used to navigate.
    expect(await playButton.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('none');
    await page.keyboard.press('Tab');
    const optionsButton = page.getByRole('button', { name: 'Options' });
    await expect(optionsButton).toBeFocused();
    const outline = await optionsButton.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).toBe('solid');
    // A mouse press hides the ring again; the next Tab brings it back.
    await page.mouse.click(5, 5);
    await optionsButton.focus();
    expect(await optionsButton.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('none');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('textbox', { name: 'Game session time' })).toBeFocused();
  });

  test("Captain's Log tabs, tables, errors and the developer and network dialogs have no WCAG A/AA violations", async ({
    page,
  }) => {
    const game = new GamePage(page);
    await game.open({ scenario: 'many-pages' });
    await game.openCaptainsLog('Ranking');
    await expect(game.rankingList()).toHaveAttribute('data-state', 'ready');
    await expectNoViolations(page);
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(game.historyList()).toHaveAttribute('data-state', 'ready');
    await expectNoViolations(page);

    await page.getByRole('button', { name: 'Main Menu' }).click();
    await game.openDeveloperTools();
    await expectNoViolations(page);
    await page.getByRole('button', { name: 'Network scenarios' }).click();
    await expect(page.getByRole('dialog', { name: 'Network scenarios' })).toBeVisible();
    await expectNoViolations(page);
  });

  test("Captain's Log tabs follow the keyboard pattern (arrows, Home, End)", async ({ page }) => {
    const game = new GamePage(page);
    await game.open();
    await game.openCaptainsLog('Ranking');
    const rankingTab = page.getByRole('tab', { name: 'Ranking' });
    const historyTab = page.getByRole('tab', { name: 'Match History' });
    await rankingTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(historyTab).toBeFocused();
    await expect(historyTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Match History' })).toBeVisible();
    await page.keyboard.press('Home');
    await expect(rankingTab).toBeFocused();
    await page.keyboard.press('End');
    await expect(historyTab).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(historyTab).not.toBeFocused(); // only the selected tab is in the Tab order
  });
});
